import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { 
      submissionId,
      enquiryDetails,
      progressStep = 'enquiry_completed'
    } = body || {}

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Prepare update data based on progress step
    const updateData: any = {
      progress_step: progressStep,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    }

    // Only update status and store details when enquiry is completed
    if (progressStep === 'enquiry_completed') {
      updateData.status = 'enquiry_submitted'
      
      // Store enquiry details in form_answers (existing JSONB field)
      if (enquiryDetails) {
        // Get existing form_answers and merge with enquiry details
        const { data: existingData } = await supabase
          .from('partner_leads')
          .select('form_answers')
          .eq('submission_id', submissionId)
          .single()

        const existingFormAnswers = existingData?.form_answers || {}
        
        updateData.form_answers = {
          ...existingFormAnswers,
          enquiry_details: enquiryDetails,
          enquiry_completed_at: new Date().toISOString()
        }
      }
    }

    // Update the partner_leads record
    const { data, error } = await supabase
      .from('partner_leads')
      .update(updateData)
      .eq('submission_id', submissionId)
      .select()
      .single()

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Update partner leads error:', error)
    return NextResponse.json({ 
      error: 'Failed to update partner leads', 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}