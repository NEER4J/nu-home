import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const body = await request.json()
    const { 
      calendarId, 
      startTime, 
      endTime, 
      title, 
      description, 
      customerName, 
      customerEmail, 
      customerPhone,
      assignedUserId,
      locationId
    } = body

    // Validate required fields
    if (!calendarId || !startTime || !endTime || !title) {
      return NextResponse.json({ 
        error: 'Missing required fields: calendarId, startTime, endTime, title' 
      }, { status: 400 })
    }

    // Get GHL integration from database (no user authentication required)
    const { data: integration, error: integrationError } = await supabase
      .from('ghl_integrations')
      .select('*')
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'GHL integration not found or inactive' }, { status: 404 })
    }

    // Check if token is expired
    const tokenExpiresAt = new Date(integration.token_expires_at)
    const now = new Date()
    
    if (tokenExpiresAt <= now) {
      return NextResponse.json({ error: 'GHL token expired' }, { status: 401 })
    }

    // Get a valid assignedUserId from the calendar team if not provided
    let validAssignedUserId = assignedUserId
    
    if (!validAssignedUserId) {
      try {
        console.log('No assignedUserId provided, fetching calendar team members...')
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
          console.log('Calendar data:', JSON.stringify(calendarData, null, 2))
          
          // Get the first available team member
          if (calendarData.calendar?.teamMembers && calendarData.calendar.teamMembers.length > 0) {
            validAssignedUserId = calendarData.calendar.teamMembers[0].userId
            console.log('Found team member:', validAssignedUserId)
          } else if (calendarData.calendar?.userId) {
            validAssignedUserId = calendarData.calendar.userId
            console.log('Using calendar owner:', validAssignedUserId)
          }
        } else {
          console.error('Failed to fetch calendar details:', calendarResponse.status)
        }
      } catch (calendarError) {
        console.error('Error fetching calendar details:', calendarError)
      }
    }
    
    if (!validAssignedUserId) {
      return NextResponse.json({ 
        error: 'Unable to find a valid team member for the calendar. Please provide assignedUserId or check calendar configuration.' 
      }, { status: 400 })
    }

    // Prepare appointment data for GHL API
    // According to GHL docs: https://marketplace.gohighlevel.com/docs/ghl/calendars/create-appointment
    const appointmentData: any = {
      calendarId,
      locationId: locationId || integration.location_id,
      contactId: undefined, // Will be created if not exists
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      title,
      appointmentStatus: 'confirmed',
      ignoreFreeSlotValidation: true, // Allow booking even if slot validation fails
      toNotify: false, // Don't send notifications (optional)
      ignoreDateRange: false // Respect calendar date range
    }
    
    // Add the valid assignedUserId (required by GHL)
    appointmentData.assignedUserId = validAssignedUserId
    
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

    // Call GHL API to create appointment (requires authentication)
    const ghlApiUrl = 'https://services.leadconnectorhq.com/calendars/events/appointments'
    
    // Build headers for GHL API (requires authentication)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Version': '2021-04-15',
      'Authorization': `Bearer ${integration.access_token}`
    }
    
    // Add location ID if provided or use integration location
    if (locationId || integration.location_id) {
      headers['locationId'] = locationId || integration.location_id
    }
    
    const response = await fetch(ghlApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(appointmentData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL Create Appointment API error:', response.status, errorText)
      
      // Handle specific GHL API error codes
      if (response.status === 400) {
        return NextResponse.json({ 
          error: 'Bad Request - Invalid parameters',
          details: errorText,
          suggestion: 'Check calendarId, startTime, endTime, and assignedUserId parameters'
        }, { status: 400 })
      } else if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Unauthorized - Invalid or expired access token',
          details: errorText,
          suggestion: 'Check if accessToken is valid and not expired'
        }, { status: 401 })
      } else if (response.status === 422) {
        return NextResponse.json({ 
          error: 'Unprocessable Entity - Invalid appointment data',
          details: errorText,
          suggestion: 'Check if assignedUserId is part of the calendar team, or remove assignedUserId to let GHL auto-assign'
        }, { status: 422 })
      } else if (response.status === 404) {
        return NextResponse.json({ 
          error: 'Calendar or location not found',
          details: errorText,
          suggestion: 'Check if calendarId and locationId are correct'
        }, { status: 404 })
      } else {
      return NextResponse.json({ 
        error: `GHL Create Appointment API error: ${response.status}`,
        details: errorText 
      }, { status: response.status })
      }
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