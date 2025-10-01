import { useState, useEffect, useMemo } from 'react'
import { startOfMonth } from 'date-fns'

interface GHLSlot {
  id: string
  startTime: string
  endTime: string
  isAvailable: boolean
  duration: number
  calendarId: string
  date: string
}

interface UseGHLCalendarProps {
  partnerSettings?: any
  enabled?: boolean
  calendarType?: 'survey_booking' | 'checkout_booking' | 'appointments' | 'consultations'
}

export function useGHLCalendar({ partnerSettings, enabled = true, calendarType = 'survey_booking' }: UseGHLCalendarProps) {
  const [ghlSlots, setGhlSlots] = useState<GHLSlot[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [cursor, setCursor] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)

  // Check if GHL calendar is enabled and properly configured
  const ghlCalendarEnabled = useMemo(() => {
    if (!enabled || !partnerSettings?.calendar_settings) return false
    
    const targetCalendar = partnerSettings.calendar_settings[calendarType]
    const hasTargetCalendar = targetCalendar?.enabled && targetCalendar?.calendar_id
    const hasAvailableCalendars = partnerSettings.calendar_settings.available_calendars?.length > 0
    
    return hasTargetCalendar || hasAvailableCalendars
  }, [partnerSettings?.calendar_settings, enabled, calendarType])

  // Get calendar ID - only if GHL is properly configured
  const calendarId = useMemo(() => {
    if (!ghlCalendarEnabled) return null
    
    const targetCalendar = partnerSettings?.calendar_settings?.[calendarType]
    // Only use calendar ID if it's properly configured
    if (targetCalendar?.enabled && targetCalendar?.calendar_id) {
      return targetCalendar.calendar_id
    }
    
    // Fallback to available calendars if target calendar not configured
    if (partnerSettings?.calendar_settings?.available_calendars?.length > 0) {
      return partnerSettings.calendar_settings.available_calendars[0]?.id
    }
    
    return null
  }, [ghlCalendarEnabled, partnerSettings?.calendar_settings, calendarType])

  // Fetch GHL calendar slots
  const fetchGhlSlots = async (targetMonth?: Date) => {
    const month = targetMonth || cursor
    
    if (!calendarId) {
      console.log('No calendar ID available for GHL slots')
      return
    }
    
    // Get date range for current month only (GHL API has 31 day limit)
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1)
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999)
    
    setIsLoadingSlots(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/ghl/calendar-slots?calendarId=${calendarId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setGhlSlots(data.slots || [])
        console.log('GHL slots loaded:', data.slots?.length, 'slots')
      } else {
        const errorText = await response.text()
        setError(`Failed to fetch GHL slots: ${errorText}`)
        console.error('Failed to fetch GHL slots:', errorText)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching GHL slots:', err)
    } finally {
      setIsLoadingSlots(false)
    }
  }

  // Sync calendar (refresh slots)
  const syncCalendar = async () => {
    setIsSyncing(true)
    await fetchGhlSlots()
    setIsSyncing(false)
  }

  // Navigate to different month
  const navigateMonth = async (direction: 'prev' | 'next') => {
    const newCursor = new Date(cursor)
    if (direction === 'prev') {
      newCursor.setMonth(newCursor.getMonth() - 1)
    } else {
      newCursor.setMonth(newCursor.getMonth() + 1)
    }
    setCursor(newCursor)
    await fetchGhlSlots(newCursor)
  }

  // Check if a date has available slots
  const hasAvailableSlots = (date: Date): boolean => {
    if (!ghlCalendarEnabled) return true
    
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return ghlSlots.some(slot => {
      const slotDate = slot.startTime.split('T')[0]
      return slotDate === key && slot.isAvailable
    })
  }

  // Get available time slots for a specific date
  const getAvailableTimeSlotsForDate = (date: string): GHLSlot[] => {
    if (!ghlCalendarEnabled) return []
    
    return ghlSlots.filter(slot => {
      const slotDate = slot.startTime.split('T')[0]
      return slotDate === date && slot.isAvailable
    })
  }

  // Fetch slots when calendar is enabled or cursor changes
  useEffect(() => {
    if (ghlCalendarEnabled && calendarId) {
      fetchGhlSlots()
    }
  }, [ghlCalendarEnabled, calendarId, cursor])

  return {
    // State
    ghlSlots,
    isLoadingSlots,
    isSyncing,
    cursor,
    error,
    ghlCalendarEnabled,
    calendarId,
    
    // Actions
    fetchGhlSlots,
    syncCalendar,
    navigateMonth,
    setCursor,
    
    // Helpers
    hasAvailableSlots,
    getAvailableTimeSlotsForDate
  }
}

