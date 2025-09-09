import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PUT(request: NextRequest) {
  try {
    const { 
      submissionId, 
      addressData, 
      progressStep = 'enquiry' 
    } = await request.json()

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    if (!addressData) {
      return NextResponse.json(
        { error: 'Address data is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get existing form_answers to merge with new address data
    const { data: existingData } = await supabase
      .from('partner_leads')
      .select('form_answers, city, postcode')
      .eq('submission_id', submissionId)
      .single()

    const existingFormAnswers = existingData?.form_answers || {}

    // Prepare update data
    const updateData: any = {
      progress_step: progressStep,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      // Update basic fields
      city: addressData.town_or_city || existingData?.city,
      postcode: addressData.postcode || existingData?.postcode,
      // Update new address columns
      address_line_1: addressData.address_line_1,
      address_line_2: addressData.address_line_2,
      street_name: addressData.street_name,
      street_number: addressData.street_number,
      building_name: addressData.building_name,
      sub_building: addressData.sub_building,
      county: addressData.county,
      country: addressData.country || 'United Kingdom',
      address_type: addressData.address_type || 'residential',
      formatted_address: addressData.formatted_address,
      // Store complete address data in form_answers
      form_answers: {
        ...existingFormAnswers,
        address_details: {
          address_line_1: addressData.address_line_1,
          address_line_2: addressData.address_line_2,
          street_name: addressData.street_name,
          street_number: addressData.street_number,
          building_name: addressData.building_name,
          sub_building: addressData.sub_building,
          town_or_city: addressData.town_or_city,
          county: addressData.county,
          postcode: addressData.postcode,
          country: addressData.country || 'United Kingdom',
          formatted_address: addressData.formatted_address,
          address_type: addressData.address_type || 'residential',
          selected_at: new Date().toISOString()
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
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('Address data saved successfully:', {
      submissionId,
      addressData: {
        address_line_1: addressData.address_line_1,
        town_or_city: addressData.town_or_city,
        postcode: addressData.postcode
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        submission_id: data.submission_id,
        address_saved: true,
        progress_step: data.progress_step
      }
    })

  } catch (error: any) {
    console.error('Update address error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
