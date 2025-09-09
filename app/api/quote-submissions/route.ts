import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resolvePartnerByHostname } from '@/lib/partner';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const formData = await req.json();
    
    console.log('Received form data:', formData); // Add debug logging
    
    // Validate required fields
    const requiredFields = ['service_category_id', 'first_name', 'last_name', 'email', 'postcode', 'form_answers'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        console.log(`Missing required field: ${field}`, formData); // Add debug logging
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Get question texts for the answers
    const questionIds = Object.keys(formData.form_answers);
    const { data: questions } = await supabase
      .from('FormQuestions')
      .select('question_id, question_text')
      .in('question_id', questionIds);
    
    // Create a mapping of question_id to question_text
    const questionTextMap = questions?.reduce((acc, q) => {
      acc[q.question_id] = q.question_text;
      return acc;
    }, {} as Record<string, string>) || {};
    
    // Format form answers with question text
    const formAnswers = Object.entries(formData.form_answers).map(([questionId, answer]) => {
      return {
        question_id: questionId,
        question_text: questionTextMap[questionId] || 'Unknown Question',
        answer: answer
      };
    });

    // Get partner ID and iframe context from URL if present
    const url = new URL(req.url);
    const partnerId = url.searchParams.get('partner_id');
    const isIframe = url.searchParams.get('is_iframe') === 'true';
    
    // Get hostname from request headers
    const hostname = req.headers.get('host') || '';
    const normalizedHostname = hostname.split(':')[0];
    
    console.log('Hostname:', hostname);
    console.log('Normalized hostname:', normalizedHostname);
    console.log('Form data assigned_partner_id:', formData.assigned_partner_id);
    console.log('URL partner_id:', partnerId);
    
    // Get partner's user ID if partner ID or hostname is present
    let assignedPartnerId = null;
    
    // First try to get partner from form data (assigned_partner_id)
    if (formData.assigned_partner_id) {
      assignedPartnerId = formData.assigned_partner_id;
      console.log('Partner assigned from form data:', assignedPartnerId);
    }
    
    // If no partner from form data, try to get partner from URL parameter
    if (!assignedPartnerId && partnerId) {
      const { data: partner } = await supabase
        .from('UserProfiles')
        .select('user_id')
        .eq('user_id', partnerId)
        .single();

      if (partner) {
        assignedPartnerId = partner.user_id;
        console.log('Partner assigned from partner_id URL param:', assignedPartnerId);
      } else {
        console.log('No partner found for partner_id:', partnerId);
      }
    }
    
    // If no partner found and hostname is present, try to get partner from hostname
    if (!assignedPartnerId && normalizedHostname && normalizedHostname !== 'localhost') {
      const partner = await resolvePartnerByHostname(supabase, normalizedHostname);

      if (partner) {
        assignedPartnerId = partner.user_id;
        console.log('Partner assigned from hostname:', assignedPartnerId);
      } else {
        console.log('No partner found for hostname:', normalizedHostname);
      }
    }

    console.log('Final assigned partner ID:', assignedPartnerId);
    console.log('Assignment date:', assignedPartnerId ? new Date().toISOString() : null);
    
    // Insert into partner_leads table
    const { data: partnerLead, error: partnerLeadError } = await supabase
      .from('partner_leads')
      .insert({
        service_category_id: formData.service_category_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        city: formData.city || null,
        postcode: formData.postcode,
        form_answers: formAnswers,
        assigned_partner_id: assignedPartnerId,
        assignment_date: assignedPartnerId ? new Date().toISOString() : null,
        status: 'new',
        user_agent: req.headers.get('user-agent') || null,
        ip_address: req.headers.get('x-forwarded-for') || null,
        // Include new address fields if available
        ...(formData.address_line_1 && { address_line_1: formData.address_line_1 }),
        ...(formData.address_line_2 && { address_line_2: formData.address_line_2 }),
        ...(formData.street_name && { street_name: formData.street_name }),
        ...(formData.street_number && { street_number: formData.street_number }),
        ...(formData.building_name && { building_name: formData.building_name }),
        ...(formData.sub_building && { sub_building: formData.sub_building }),
        ...(formData.county && { county: formData.county }),
        ...(formData.country && { country: formData.country }),
        ...(formData.formatted_address && { formatted_address: formData.formatted_address }),
        ...(formData.address_type && { address_type: formData.address_type })
      })
      .select()
      .single();

    if (partnerLeadError) {
      console.error('Error submitting partner lead:', partnerLeadError);
      return NextResponse.json(
        { error: 'Failed to submit partner lead' },
        { status: 500 }
      );
    }

    // Get GTM event name if partner is assigned
    let gtmEventName = null;
    if (assignedPartnerId) {
      const { data: gtmSettings } = await supabase
        .from('PartnerSettings')
        .select('gtm_event_name')
        .eq('partner_id', assignedPartnerId)
        .eq('service_category_id', formData.service_category_id)
        .single();
      
      gtmEventName = gtmSettings?.gtm_event_name || null;
    }
    
    return NextResponse.json(
      { 
        success: true, 
        data: partnerLead,
        gtm_event_name: gtmEventName
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}