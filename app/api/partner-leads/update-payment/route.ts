import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PUT(request: NextRequest) {
  try {
    const { submissionId, paymentMethod, paymentStatus, progressStep, surveyDetails } = await request.json()

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Handle survey submission
    if (surveyDetails) {
      const supabase = await createClient()

             // Update the partner_leads record with survey information
       const { data, error } = await supabase
         .from('partner_leads')
         .update({
           first_name: surveyDetails.firstName,
           last_name: surveyDetails.lastName,
           email: surveyDetails.email,
           phone: surveyDetails.phone,
           postcode: surveyDetails.postcode,
           notes: surveyDetails.notes,
           progress_step: progressStep || 'survey',
           updated_at: new Date().toISOString()
         })
         .eq('submission_id', submissionId)
         .select()

      if (error) {
        console.error('Error updating partner_leads with survey details:', error)
        return NextResponse.json(
          { error: 'Failed to update survey information' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data[0]
      })
    }

    // Handle payment submission
    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      )
    }

    if (!paymentStatus) {
      return NextResponse.json(
        { error: 'Payment status is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update the partner_leads record with payment information
    const { data, error } = await supabase
      .from('partner_leads')
      .update({
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        progress_step: progressStep || 'payment_completed',
        updated_at: new Date().toISOString()
      })
      .eq('submission_id', submissionId)
      .select()

    if (error) {
      console.error('Error updating partner_leads:', error)
      return NextResponse.json(
        { error: 'Failed to update payment information' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data[0]
    })
  } catch (error) {
    console.error('Error in update-payment route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
