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
      title, 
      description, 
      startTime, 
      endTime, 
      customerName, 
      customerEmail, 
      customerPhone 
    } = body

    if (!calendarId || !title || !startTime || !endTime) {
      return NextResponse.json({ 
        error: 'Missing required fields: calendarId, title, startTime, endTime' 
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

    // Create calendar event data according to GHL API documentation
    const eventData = {
      calendarId,
      title,
      description: description || `Survey booking with ${customerName}`,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      allDay: false,
      attendees: customerEmail ? [{
        email: customerEmail,
        name: customerName
      }] : [],
      location: '',
      notes: customerPhone ? `Phone: ${customerPhone}` : '',
      // Additional fields that might be required by GHL API
      status: 'confirmed',
      visibility: 'private'
    }

    // Make request to GHL API to create calendar event
    // Using the correct Calendar Events endpoint from the official docs
    const ghlApiUrl = `https://services.leadconnectorhq.com/calendars/${calendarId}/events`
    
    const response = await fetch(ghlApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(eventData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL API error:', response.status, errorText)
      return NextResponse.json({ 
        error: `GHL API error: ${response.status}`,
        details: errorText 
      }, { status: response.status })
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      eventId: data.event?.id,
      message: 'Calendar event created successfully'
    })

  } catch (error) {
    console.error('Error creating GHL calendar event:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
