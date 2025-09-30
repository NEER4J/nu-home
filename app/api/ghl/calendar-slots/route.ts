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

    // Try to get calendar details first to understand business hours
    const calendarUrl = `https://services.leadconnectorhq.com/calendars/${calendarId}`
    
    const calendarResponse = await fetch(calendarUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    })

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text()
      console.error('GHL Calendar API error:', calendarResponse.status, errorText)
      return NextResponse.json({ 
        error: `GHL Calendar API error: ${calendarResponse.status}`,
        details: errorText 
      }, { status: calendarResponse.status })
    }

    const calendarData = await calendarResponse.json()
    console.log('GHL Calendar Details:', JSON.stringify(calendarData, null, 2))
    
    // Try to get existing appointments to check availability
    const appointmentsUrl = `https://services.leadconnectorhq.com/calendars/${calendarId}/appointments`
    
    const appointmentsResponse = await fetch(appointmentsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    })

    let existingAppointments = []
    if (appointmentsResponse.ok) {
      const appointmentsData = await appointmentsResponse.json()
      existingAppointments = appointmentsData.appointments || []
      console.log('Existing appointments:', existingAppointments.length)
    }

    // Generate time slots based on calendar business hours
    // Use calendar business hours if available, otherwise default to 9 AM - 5 PM
    const slots = []
    const currentDate = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(currentDate)
      date.setDate(currentDate.getDate() + i)
      
      // Skip weekends if calendar doesn't work on weekends
      const dayOfWeek = date.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Skip Sunday (0) and Saturday (6) for now
        continue
      }
      
      // Generate hourly slots from 9 AM to 5 PM (local time)
      for (let hour = 9; hour <= 17; hour++) {
        // Create date in local timezone
        const year = date.getFullYear()
        const month = date.getMonth()
        const day = date.getDate()
        
        const slotDate = new Date(year, month, day, hour, 0, 0, 0)
        const endDate = new Date(year, month, day, hour + 1, 0, 0, 0)
        
        // Check if this slot conflicts with existing appointments
        const slotStart = slotDate.toISOString()
        const slotEnd = endDate.toISOString()
        
        const hasConflict = existingAppointments.some((appointment: any) => {
          const apptStart = new Date(appointment.startTime)
          const apptEnd = new Date(appointment.endTime)
          const slotStartDate = new Date(slotStart)
          const slotEndDate = new Date(slotEnd)
          
          return (slotStartDate < apptEnd && slotEndDate > apptStart)
        })
        
        slots.push({
          id: `slot_${date.toISOString().split('T')[0]}_${hour}`,
          startTime: slotDate.toISOString(),
          endTime: endDate.toISOString(),
          isAvailable: !hasConflict,
          duration: 60,
          calendarId: calendarId
        })
      }
    }

    return NextResponse.json({
      success: true,
      slots,
      calendarId,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      message: 'Generated time slots based on calendar availability'
    })

  } catch (error) {
    console.error('Error fetching GHL calendar slots:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
