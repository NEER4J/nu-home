import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const calendarId = searchParams.get('calendarId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!calendarId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: calendarId' 
      }, { status: 400 })
    }

    // Set default date range if not provided (next 30 days)
    const defaultStartDate = new Date()
    const defaultEndDate = new Date()
    defaultEndDate.setDate(defaultEndDate.getDate() + 30)

    const start = startDate ? new Date(startDate) : defaultStartDate
    const end = endDate ? new Date(endDate) : defaultEndDate

    // Use GHL's public free-slots endpoint (no authentication required)
    // GHL API expects Unix timestamps in MILLISECONDS (not seconds)
    const startTimestamp = start.getTime() // Milliseconds since epoch
    const endTimestamp = end.getTime() // Milliseconds since epoch
    
    const params = new URLSearchParams({
      startDate: startTimestamp.toString(),
      endDate: endTimestamp.toString()
    })
    
    const freeSlotsUrl = `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?${params.toString()}`
    
    console.log('Fetching GHL free slots from public endpoint:', freeSlotsUrl)
    console.log('Date range (milliseconds):', {
      start: start.toISOString(),
      end: end.toISOString(),
      startTimestamp,
      endTimestamp
    })
    
    const response = await fetch(freeSlotsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
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
      } else if (response.status === 404) {
        return NextResponse.json({ 
          error: 'Calendar not found',
          details: errorText,
          suggestion: 'Check if calendarId is correct'
        }, { status: 404 })
      } else {
        return NextResponse.json({ 
          error: `GHL Free Slots API error: ${response.status}`,
          details: errorText 
        }, { status: response.status })
      }
    }

    const data = await response.json()
    console.log('GHL Free Slots API Response:', JSON.stringify(data, null, 2))
    
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
        ? `Retrieved ${slots.length} available slots from GHL calendar`
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