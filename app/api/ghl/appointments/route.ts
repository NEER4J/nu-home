import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      calendarId, 
      startTime, 
      endTime, 
      title, 
      description, 
      customerName, 
      customerEmail, 
      customerPhone 
    } = body

    // Validate required fields
    if (!calendarId || !startTime || !endTime || !title) {
      return NextResponse.json({ 
        error: 'Missing required fields: calendarId, startTime, endTime, title' 
      }, { status: 400 })
    }

    // Get GHL integration for this user
    const { data: integration, error: integrationError } = await supabase
      .from('ghl_integrations')
      .select('*')
      .eq('partner_id', user.id)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'GHL integration not found' }, { status: 404 })
    }

    // Check if token is expired
    const tokenExpiresAt = new Date(integration.token_expires_at)
    const now = new Date()
    
    if (tokenExpiresAt <= now) {
      return NextResponse.json({ error: 'GHL token expired' }, { status: 401 })
    }

    // Get calendar details to fetch assignedUserId
    let assignedUserId = null
    try {
      const calendarResponse = await fetch(`https://services.leadconnectorhq.com/calendars/${calendarId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Accept': 'application/json',
          'Version': '2021-04-15'
        }
      })

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json()
        // Get the first team member/user assigned to this calendar
        if (calendarData.calendar?.teamMembers && calendarData.calendar.teamMembers.length > 0) {
          assignedUserId = calendarData.calendar.teamMembers[0].userId
        } else if (calendarData.calendar?.userId) {
          assignedUserId = calendarData.calendar.userId
        }
      }
    } catch (calendarError) {
      console.error('Error fetching calendar details:', calendarError)
    }

    // If we still don't have an assignedUserId, try to use the integration user
    if (!assignedUserId && integration.user_id) {
      assignedUserId = integration.user_id
    }

    // Prepare appointment data for GHL API
    // According to GHL docs: https://marketplace.gohighlevel.com/docs/ghl/calendars/create-appointment
    const appointmentData: any = {
      calendarId,
      locationId: integration.location_id,
      contactId: undefined, // Will be created if not exists
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      title,
      appointmentStatus: 'confirmed',
      assignedUserId: assignedUserId, // Required by GHL
      ignoreFreeSlotValidation: true, // Allow booking even if slot validation fails
      toNotify: false, // Don't send notifications (optional)
      ignoreDateRange: false // Respect calendar date range
    }
    
    // Add meeting location (required by GHL)
    appointmentData.meetingLocationType = 'custom'
    appointmentData.meetingLocationId = 'custom_0'
    appointmentData.overrideLocationConfig = true
    
    // Add contact details if provided
    if (customerName || customerEmail || customerPhone) {
      appointmentData.contact = {
        name: customerName || '',
        email: customerEmail || '',
        phone: customerPhone || ''
      }
    }
    
    // Add description/notes if provided
    if (description) {
      appointmentData.notes = description
      appointmentData.description = description
    }

    // Call GHL API to create appointment
    const ghlApiUrl = 'https://services.leadconnectorhq.com/calendars/events/appointments'
    
    // Build headers with location ID if available
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${integration.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Version': '2021-04-15'
    }
    
    // Add location ID if available
    if (integration.location_id) {
      headers['locationId'] = integration.location_id
    }
    
    const response = await fetch(ghlApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(appointmentData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL Create Appointment API error:', response.status, errorText)
      return NextResponse.json({ 
        error: `GHL Create Appointment API error: ${response.status}`,
        details: errorText 
      }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      appointment: data,
      message: 'Appointment created successfully in GHL calendar',
      debug: {
        ghlApiUrl,
        requestPayload: appointmentData,
        responseStatus: response.status,
        responseData: data
      }
    })

  } catch (error) {
    console.error('Error creating GHL appointment:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}