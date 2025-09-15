import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getGHLService } from '@/lib/ghl-api'
import { FieldMappingEngine } from '@/lib/field-mapping-engine'
import { resolvePartnerByHostname } from '@/lib/partner'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      partnerId,
      submissionId,
      subdomain,
      contactData,
      customFields,
      pipelineId,
      stageId,
      opportunityName,
      monetaryValue = 0,
      tags = [],
      emailType = 'quote-initial' // Default to quote-initial, can be overridden
    } = body

    console.log('🌐 Client-visible GHL Create Lead API called')
    console.log('📋 Input data:', {
      partnerId,
      submissionId,
      subdomain,
      contactData,
      customFields,
      pipelineId,
      stageId,
      opportunityName,
      monetaryValue,
      tags
    })

    const supabase = await createClient();

    // Resolve partner ID from subdomain if not provided directly
    let resolvedPartnerId = partnerId
    if (!resolvedPartnerId && subdomain) {
      console.log('🔍 Resolving partner from subdomain:', subdomain)
      const partner = await resolvePartnerByHostname(supabase, subdomain)
      if (partner) {
        resolvedPartnerId = partner.user_id
        console.log('✅ Partner resolved:', resolvedPartnerId)
      }
    }

    if (!resolvedPartnerId) {
      return NextResponse.json(
        { error: 'Missing required field: partnerId or subdomain' },
        { status: 400 }
      )
    }

    // Get GHL service instance
    const ghlService = await getGHLService(resolvedPartnerId)
    if (!ghlService) {
      return NextResponse.json(
        { error: 'GHL integration not found or expired for this partner' },
        { status: 404 }
      )
    }

    // Get service category ID for boiler
    const { data: serviceCategory } = await supabase
      .from('ServiceCategories')
      .select('service_category_id')
      .eq('slug', 'boiler')
      .eq('is_active', true)
      .single();

    if (!serviceCategory) {
      console.log('⚠️ Boiler service category not found');
      return NextResponse.json(
        { error: 'Service category not found' },
        { status: 404 }
      );
    }

    // Initialize field mapping engine
    const fieldMappingEngine = new FieldMappingEngine(supabase, resolvedPartnerId, serviceCategory.service_category_id);

    let mappedGHLData: any = {};
    let finalPipelineId = pipelineId;
    let finalStageId = stageId;
    let finalCustomFields = customFields || {};
    let finalTags = tags || ['Quote API Lead'];

    // If submissionId is provided, use field mapping engine to get data
    if (submissionId) {
      console.log('🔍 Using field mapping engine to process submission data:', submissionId);

      try {
        // Get mapped data using field mapping engine for GHL integration
        mappedGHLData = await fieldMappingEngine.processSubmissionData(submissionId, emailType, 'ghl');
        console.log('✅ Mapped GHL data for email type:', emailType, mappedGHLData);

        // Use the mapped data for contact fields and prepare custom fields for GHL
        console.log('🔧 Mapped GHL data received:', mappedGHLData);
      } catch (mappingError) {
        console.error('❌ Field mapping error:', mappingError);
        // Continue with hardcoded fallback
      }
    }

    // If field mapping didn't provide contact data, use provided contactData as fallback
    // Only fill in missing fields, don't overwrite existing data
    if (contactData) {
      console.log('🔍 Merging provided contactData with mapped data...');
      
      mappedGHLData = {
        ...mappedGHLData,
        // Only add email if not already present
        email: mappedGHLData.email || contactData.email,
        phone: mappedGHLData.phone || contactData.phone,
        number: mappedGHLData.number || contactData.phone,
        firstName: mappedGHLData.firstName || contactData.firstName,
        lastName: mappedGHLData.lastName || contactData.lastName,
        address1: mappedGHLData.address1 || contactData.address1,
        city: mappedGHLData.city || contactData.city,
        country: mappedGHLData.country || contactData.country || 'United Kingdom'
      };
      
      console.log('✅ Merged contact data (preserving existing):', {
        email: mappedGHLData.email,
        phone: mappedGHLData.phone,
        firstName: mappedGHLData.firstName,
        lastName: mappedGHLData.lastName,
        address1: mappedGHLData.address1,
        city: mappedGHLData.city
      });
    }

    // If pipelineId and stageId are still not provided, look up GHL field mappings
    if (!finalPipelineId || !finalStageId) {
      console.log('🔍 Looking up GHL field mappings for partner:', resolvedPartnerId);

      const { data: ghlFieldMappings } = await supabase
        .from('ghl_field_mappings')
        .select('*')
        .eq('partner_id', resolvedPartnerId)
        .eq('service_category_id', serviceCategory.service_category_id)
        .eq('email_type', emailType)
        .eq('recipient_type', 'customer')
        .eq('is_active', true)
        .single();

      if (ghlFieldMappings) {
        finalPipelineId = finalPipelineId || ghlFieldMappings.pipeline_id;
        finalStageId = finalStageId || ghlFieldMappings.opportunity_stage;
        // Process tags - combine default tags with saved tags
        const savedTags = Array.isArray(ghlFieldMappings.tags) ? ghlFieldMappings.tags : []
        const defaultTags = ['Quote API Lead']
        finalTags = [...defaultTags, ...savedTags, ...finalTags].filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates

        // Process GHL field mappings to map data to GHL custom field IDs
        if (submissionId && Object.keys(mappedGHLData).length > 0 && ghlFieldMappings.field_mappings) {
          console.log('🔧 Processing GHL field mappings:', ghlFieldMappings.field_mappings);

          // Map our data fields to GHL custom field IDs
          Object.entries(ghlFieldMappings.field_mappings).forEach(([templateFieldName, ghlFieldId]) => {
            if (mappedGHLData[templateFieldName] !== undefined && ghlFieldId) {
              finalCustomFields[ghlFieldId as string] = mappedGHLData[templateFieldName];
              console.log(`🔧 Mapped ${templateFieldName} = "${mappedGHLData[templateFieldName]}" → GHL field ${ghlFieldId}`);
            }
          });
        }

        console.log('✅ Found GHL field mappings:', {
          pipelineId: finalPipelineId,
          stageId: finalStageId,
          tagsCount: finalTags.length,
          customFieldsMapped: Object.keys(finalCustomFields).length,
          serviceCategoryId: serviceCategory.service_category_id
        });
      } else if (!pipelineId || !stageId) {
        console.log('⚠️ No GHL field mappings found for partner:', partnerId, 'and service category:', serviceCategory.service_category_id);
        return NextResponse.json(
          { error: 'No GHL field mappings configured for this partner and service category' },
          { status: 404 }
        );
      }
    }

    console.log('🏢 GHL Service details:', {
      userType: ghlService.userType,
      locationId: ghlService.locationId
    })

    const results: {
      contact: {
        success: boolean;
        contactId?: string;
        data?: any;
        error?: string;
      } | null;
      opportunity: {
        success: boolean;
        opportunityId?: string;
        data?: any;
        error?: string;
        status?: number;
      } | null;
      steps: string[];
    } = {
      contact: null,
      opportunity: null,
      steps: []
    }

    // Step 1: Upsert Contact with custom fields
    try {
      console.log('👤 Step 1: Upserting contact with custom fields...')
      
      // Prepare contact payload for upsert - use mapped data if available, fall back to contactData
      const contactPayload = {
        firstName: mappedGHLData.firstName || mappedGHLData.first_name || contactData?.firstName,
        lastName: mappedGHLData.lastName || mappedGHLData.last_name || contactData?.lastName,
        email: mappedGHLData.email || mappedGHLData.customer_email || contactData?.email,
        phone: mappedGHLData.phone || contactData?.phone,
        address1: mappedGHLData.address || mappedGHLData.formatted_address || contactData?.address1,
        city: contactData?.city,
        country: contactData?.country,
        locationId: ghlService.locationId,
        customFields: Object.entries(finalCustomFields).map(([key, value]) => ({
          id: key,
          key: key,
          field_value: value
        })),
        tags: finalTags
      }

      console.log('📋 Contact upsert payload:', contactPayload)
      
      // Use direct fetch to call the upsert endpoint
      const contactResponse = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${ghlService.accessToken}`,
          'Version': '2021-07-28'
        },
        body: JSON.stringify(contactPayload)
      })

      console.log(`📡 Contact upsert response: ${contactResponse.status} ${contactResponse.statusText}`)

      if (!contactResponse.ok) {
        const errorText = await contactResponse.text()
        console.error('❌ Contact upsert failed:', errorText)
        throw new Error(`GHL API Error: ${contactResponse.status} - ${errorText}`)
      }

      const contact = await contactResponse.json()
      console.log('✅ Contact upserted successfully:', contact)
      console.log('📝 Full contact response:', JSON.stringify(contact, null, 2))
      
      // Try different possible ID fields
      let contactId = contact.id || contact._id || contact.contactId || contact.contact_id
      
      // If still no ID, check if it's nested in a data object
      if (!contactId && contact.data) {
        contactId = contact.data.id || contact.data._id || contact.data.contactId || contact.data.contact_id
      }
      
      // If still no ID, check if it's nested in a contact object
      if (!contactId && contact.contact) {
        contactId = contact.contact.id || contact.contact._id || contact.contact.contactId || contact.contact.contact_id
      }
      
      console.log('📝 Contact ID extracted:', contactId)
      console.log('🔍 Contact ID type:', typeof contactId)
      
      if (!contactId) {
        console.error('❌ Contact upsert returned no ID!');
        console.error('❌ Available fields in response:', Object.keys(contact));
        throw new Error('Contact upsert succeeded but returned no contact ID');
      }
      
      results.contact = {
        success: true,
        contactId: contactId,
        data: contact
      }
      results.steps.push('Contact upserted')

      // Step 2: Create Opportunity (using contact ID from step 1)
      try {
        console.log(`🎯 Step 2: Creating opportunity for contact ID: ${contactId}`)
        
        const opportunityPayload = {
          pipelineId: finalPipelineId,
          locationId: ghlService.locationId,
          pipelineStageId: finalStageId,
          name: opportunityName || `${contactPayload.firstName} ${contactPayload.lastName} - Lead`,
          status: 'open',
          monetaryValue: monetaryValue,
          contactId: contactId // CRITICAL: Use the contact ID from step 1
        }

        console.log('📋 Opportunity payload with contact ID:', opportunityPayload)

        // Use direct fetch (matching your working Postman example)
        const response = await fetch('https://services.leadconnectorhq.com/opportunities/upsert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${ghlService.accessToken}`,
            'Version': '2021-07-28'
          },
          body: JSON.stringify(opportunityPayload)
        })

        console.log(`📡 Opportunity API response: ${response.status} ${response.statusText}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Opportunity creation failed:', errorText)
          
          results.opportunity = {
            success: false,
            error: errorText,
            status: response.status
          }
          results.steps.push(`Opportunity creation failed: ${response.status}`)
        } else {
          const opportunity = await response.json()
          console.log('✅ Opportunity created successfully:', opportunity)
          
          results.opportunity = {
            success: true,
            opportunityId: opportunity.id || opportunity._id,
            data: opportunity
          }
          results.steps.push('Opportunity created')
        }

      } catch (oppError: any) {
        console.error('❌ Opportunity creation error:', oppError)
        results.opportunity = {
          success: false,
          error: oppError.message
        }
        results.steps.push(`Opportunity error: ${oppError.message}`)
      }

    } catch (contactError: any) {
      console.error('❌ Contact creation error:', contactError)
      results.contact = {
        success: false,
        error: contactError.message
      }
      results.steps.push(`Contact error: ${contactError.message}`)
    }

    const overallSuccess = results.contact?.success && results.opportunity?.success

    console.log('📊 Final results:', {
      success: overallSuccess,
      contactCreated: results.contact?.success || false,
      opportunityCreated: results.opportunity?.success || false
    })

    // Return detailed response for debugging
    return NextResponse.json({
      success: overallSuccess,
      contactId: results.contact?.contactId,
      opportunityId: results.opportunity?.opportunityId,
      results: results,
      summary: {
        contactCreated: results.contact?.success || false,
        opportunityCreated: results.opportunity?.success || false,
        steps: results.steps
      },
      debug: {
        partnerId,
        submissionId,
        contactData,
        mappedGHLData,
        customFields: finalCustomFields,
        pipelineId: finalPipelineId,
        stageId: finalStageId,
        opportunityName,
        monetaryValue,
        tags: finalTags,
        ghlService: {
          userType: ghlService.userType,
          locationId: ghlService.locationId
        }
      }
    })

  } catch (error: any) {
    console.error('❌ Client GHL Create Lead API error:', error)
    return NextResponse.json(
      { 
        error: 'Client GHL Create Lead API failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}