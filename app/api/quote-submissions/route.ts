// app/api/quote-submissions/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const formData = await req.json();
    
    // Validate required fields
    const requiredFields = ['serviceCategory', 'firstName', 'lastName', 'email', 'postcode', 'answers'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Get question texts for the answers
    const questionIds = Object.keys(formData.answers);
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
    const formAnswers = Object.entries(formData.answers).map(([questionId, answer]) => {
      return {
        question_id: questionId,
        question_text: questionTextMap[questionId] || 'Unknown Question',
        answer: answer
      };
    });
    
    // Insert submission with client IP address
    const { data, error } = await supabase
      .from('QuoteSubmissions')
      .insert({
        service_category_id: formData.serviceCategory,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        city: formData.city || null,
        postcode: formData.postcode,
        ip_address: req.headers.get('x-forwarded-for') || req.ip || null,
        user_agent: req.headers.get('user-agent') || null,
        referral_source: req.headers.get('referer') || null,
        status: 'new',
        form_answers: formAnswers
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error submitting quote:', error);
      return NextResponse.json(
        { error: 'Failed to submit quote request' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, data },
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