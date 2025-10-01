import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const calendarId = searchParams.get('calendarId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId') // Optional: filter by specific user
    const timezone = searchParams.get('timezone') // Optional: specific timezone

    if (!calendarId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: calendarId' 
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

    // Set default date range if not provided (next 30 days)
    const defaultStartDate = new Date()
    const defaultEndDate = new Date()
    defaultEndDate.setDate(defaultEndDate.getDate() + 30)

    const start = startDate ? new Date(startDate) : defaultStartDate
    const end = endDate ? new Date(endDate) : defaultEndDate

    // Use GHL's real free-slots endpoint to get actual availability
    // GHL API expects Unix timestamps in MILLISECONDS (not seconds)
    const startTimestamp = start.getTime() // Milliseconds since epoch
    const endTimestamp = end.getTime() // Milliseconds since epoch
    
    // According to GHL docs: startDate and endDate should be Unix timestamps
    // Optional parameters: timezone, userId
    const params = new URLSearchParams({
      startDate: startTimestamp.toString(),
      endDate: endTimestamp.toString()
    })
    
    // Add optional parameters if provided
    if (timezone) {
      params.append('timezone', timezone)
    } else {
      params.append('timezone', 'UTC') // Default to UTC
    }
    
    if (userId) {
      params.append('userId', userId)
    }
    
    console.log('Using GHL official format (millisecond timestamps)...')
    console.log('Date range (milliseconds):', {
      start: start.toISOString(),
      end: end.toISOString(),
      startTimestamp,
      endTimestamp,
      note: 'Using milliseconds since epoch (not seconds)'
    })
    
    const freeSlotsUrl = `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?${params.toString()}`
    
    console.log('Fetching real GHL free slots from:', freeSlotsUrl)
    
    // First, let's try to get calendar details to understand the configuration
    try {
      const calendarDetailsUrl = `https://services.leadconnectorhq.com/calendars/${calendarId}`
      console.log('Fetching calendar details from:', calendarDetailsUrl)
      
      const calendarResponse = await fetch(calendarDetailsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Accept': 'application/json',
          'Version': '2021-04-15'
        }
      })
      
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json()
        console.log('GHL Calendar Details:', JSON.stringify(calendarData, null, 2))
      } else {
        console.log('Failed to fetch calendar details:', calendarResponse.status)
      }
    } catch (calendarError) {
      console.log('Error fetching calendar details:', calendarError)
    }
    console.log('Date range:', {
      start: start.toISOString(),
      end: end.toISOString(),
      startTimestamp,
      endTimestamp
    })
    
    const response = await fetch(freeSlotsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/json',
        'Version': '2021-04-15'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL Free Slots API error:', response.status, errorText)
      
      // Handle specific GHL API error codes
      if (response.status === 400) {
        return NextResponse.json({ 
          error: 'Bad Request - Invalid parameters',
          details: errorText,
          suggestion: 'Check calendarId, startDate, and endDate parameters'
        }, { status: 400 })
      } else if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Unauthorized - Invalid or expired token',
          details: errorText,
          suggestion: 'Check GHL integration token'
        }, { status: 401 })
      } else {
        return NextResponse.json({ 
          error: `GHL Free Slots API error: ${response.status}`,
          details: errorText 
        }, { status: response.status })
      }
    }

    const data = await response.json()
    console.log('GHL Free Slots API Response:', JSON.stringify(data, null, 2))
    
    // Debug: Log the raw response to understand the structure
    console.log('GHL API Response Headers:', Object.fromEntries(response.headers.entries()))
    console.log('GHL API Response Status:', response.status)
    console.log('GHL API Response OK:', response.ok)
    
    // GHL API returns slots in format: { "2025-10-01": { "slots": [...] }, "2025-10-02": { "slots": [...] } }
    // We need to flatten this structure
    const allSlots: any[] = []
    
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(dateKey => {
        const dayData = data[dateKey]
        if (dayData && dayData.slots && Array.isArray(dayData.slots)) {
          dayData.slots.forEach((slotTime: string, index: number) => {
            // Calculate endTime based on duration (30 minutes)
            const startDate = new Date(slotTime)
            const endDate = new Date(startDate.getTime() + 30 * 60 * 1000) // 30 minutes later
            
            allSlots.push({
              id: `slot_${dateKey}_${index}`,
              startTime: slotTime,
              endTime: endDate.toISOString(),
              isAvailable: true,
              duration: 30, // Default 30 minutes, can be configured
              calendarId: calendarId,
              date: dateKey
            })
          })
        }
      })
    }
    
    console.log('Parsed slots from GHL:', allSlots.length, 'slots found')
    console.log('Sample slots:', allSlots.slice(0, 3))
    
    const slots = allSlots

    return NextResponse.json({
      success: true,
      slots,
      calendarId,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      message: slots.length > 0 
        ? `Retrieved ${slots.length} real available slots from GHL calendar`
        : 'No available slots found in GHL calendar - check business hours configuration',
      debug: {
        hasSlots: slots.length > 0,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
          startTimestamp,
          endTimestamp,
          format: 'milliseconds since epoch'
        }
      }
    })

  } catch (error) {
    console.error('Error fetching GHL calendar slots:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
