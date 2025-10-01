/**
 * Helper functions for creating GHL appointments
 */

export interface CreateAppointmentParams {
  calendarId: string
  startTime: string
  endTime: string
  title: string
  description?: string
  customerName: string
  customerEmail: string
  customerPhone: string
}

export interface AppointmentResponse {
  success: boolean
  appointment?: any
  error?: string
  message?: string
}

/**
 * Create a GHL appointment
 */
export async function createGHLAppointment(
  params: CreateAppointmentParams
): Promise<AppointmentResponse> {
  try {
    const response = await fetch('/api/ghl/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    })

    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        appointment: data.appointment,
        message: 'Appointment created successfully'
      }
    } else {
      const errorText = await response.text()
      return {
        success: false,
        error: errorText,
        message: 'Failed to create appointment'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Error creating appointment'
    }
  }
}

/**
 * Create appointment from slot data
 */
export async function createAppointmentFromSlot(
  slot: any,
  customerDetails: {
    firstName: string
    lastName: string
    email: string
    phone: string
  },
  additionalInfo?: {
    productName?: string
    notes?: string
  }
): Promise<AppointmentResponse> {
  const { firstName, lastName, email, phone } = customerDetails
  const { productName, notes } = additionalInfo || {}

  const params: CreateAppointmentParams = {
    calendarId: slot.calendarId,
    startTime: slot.startTime,
    endTime: slot.endTime,
    title: `Survey Booking - ${firstName} ${lastName}`,
    description: `Survey booking${productName ? ` for ${productName}` : ''}. ${notes ? `Notes: ${notes}` : 'No additional notes'}`,
    customerName: `${firstName} ${lastName}`,
    customerEmail: email,
    customerPhone: phone
  }

  return createGHLAppointment(params)
}

/**
 * Create appointment with manual time selection (fallback when no slot data)
 */
export async function createAppointmentManual(
  calendarId: string,
  date: string,
  time: string,
  customerDetails: {
    firstName: string
    lastName: string
    email: string
    phone: string
  },
  additionalInfo?: {
    productName?: string
    notes?: string
    duration?: number // in minutes, default 30
  }
): Promise<AppointmentResponse> {
  const { firstName, lastName, email, phone } = customerDetails
  const { productName, notes, duration = 30 } = additionalInfo || {}

  // Parse time (handle both "14:00" and "2:00 PM" formats)
  let timeString = time
  if (time.includes('PM') || time.includes('AM')) {
    const timeParts = time.replace('PM', '').replace('AM', '').trim().split(':')
    let hour = parseInt(timeParts[0])
    const minute = timeParts[1] ? parseInt(timeParts[1]) : 0
    
    if (time.includes('PM') && hour !== 12) {
      hour += 12
    } else if (time.includes('AM') && hour === 12) {
      hour = 0
    }
    
    timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  const startTime = new Date(`${date}T${timeString}:00`).toISOString()
  const endTime = new Date(new Date(`${date}T${timeString}:00`).getTime() + duration * 60 * 1000).toISOString()

  const params: CreateAppointmentParams = {
    calendarId,
    startTime,
    endTime,
    title: `Survey Booking - ${firstName} ${lastName}`,
    description: `Survey booking${productName ? ` for ${productName}` : ''}. ${notes ? `Notes: ${notes}` : 'No additional notes'}`,
    customerName: `${firstName} ${lastName}`,
    customerEmail: email,
    customerPhone: phone
  }

  return createGHLAppointment(params)
}

