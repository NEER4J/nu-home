'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Info } from 'lucide-react'
import { startOfMonth, format } from 'date-fns'

interface GHLCalendarTimeSelectorProps {
  selectedDate: string
  selectedTime: string
  selectedSlot: any
  onDateSelect: (date: string) => void
  onTimeSelect: (time: string, slot: any) => void
  ghlSlots: any[]
  ghlCalendarEnabled: boolean
  cursor: Date
  isLoadingSlots: boolean
  isSyncing: boolean
  onNavigateMonth: (direction: 'prev' | 'next') => void
  onSync: () => void
  hasAvailableSlots: (date: Date) => boolean
  companyColor?: string | null
  className?: string
  infoText?: string
}

// Timezone conversion helpers
const convertUTCToTimezone = (utcTimeString: string, timezone: 'UTC' | 'UK' | 'US' | 'India' | 'Ireland') => {
  const date = new Date(utcTimeString)
  
  const timezoneMap = {
    'UTC': 'UTC',
    'UK': 'Europe/London',
    'US': 'America/New_York', // Eastern Time
    'India': 'Asia/Kolkata',
    'Ireland': 'Europe/Dublin'
  }
  
  const timeString = date.toLocaleTimeString('en-US', {
    timeZone: timezoneMap[timezone],
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  
  return timeString
}

const getTimezoneLabel = (timezone: 'UTC' | 'UK' | 'US' | 'India' | 'Ireland') => {
  const labels = {
    'UTC': 'UTC',
    'UK': 'UK (GMT/BST)',
    'US': 'US (EST/EDT)',
    'India': 'India (IST)',
    'Ireland': 'Ireland (GMT/IST)'
  }
  return labels[timezone]
}

export default function GHLCalendarTimeSelector({
  selectedDate,
  selectedTime,
  selectedSlot,
  onDateSelect,
  onTimeSelect,
  ghlSlots,
  ghlCalendarEnabled,
  cursor,
  isLoadingSlots,
  isSyncing,
  onNavigateMonth,
  onSync,
  hasAvailableSlots,
  companyColor,
  className = '',
  infoText = "Your installation should take 1-2 days to complete, and our installers will be on site between 8-10am."
}: GHLCalendarTimeSelectorProps) {
  const [selectedTimezone, setSelectedTimezone] = useState<'UTC' | 'UK' | 'US' | 'India' | 'Ireland'>('UTC')
  
  // Generate month days
  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor)
    const days: Date[] = []
    
    // Create dates in local timezone to avoid timezone issues
    const startDate = new Date(start.getFullYear(), start.getMonth(), 1)
    const endDate = new Date(start.getFullYear(), start.getMonth() + 1, 0) // Last day of month
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d))
    }
    
    return days
  }, [cursor])

  // Get available time slots for selected date
  const getAvailableTimeSlots = useMemo(() => {
    if (!selectedDate) return []
    
    if (ghlCalendarEnabled) {
      // Use real GHL calendar data
      const dateSlots = ghlSlots.filter(slot => {
        const slotDate = slot.startTime.split('T')[0] // "2025-10-01"
        return slotDate === selectedDate && slot.isAvailable
      })
      
      return dateSlots.map(slot => {
        const formattedTime = convertUTCToTimezone(slot.startTime, selectedTimezone)
        return {
          displayTime: formattedTime,
          slot: slot
        }
      })
    } else {
      // Fallback: Static time slots when GHL not connected
      const timeSlots = []
      for (let hour = 9; hour <= 17; hour++) {
        const time = hour < 10 ? `0${hour}:00` : `${hour}:00`
        timeSlots.push({
          displayTime: time,
          slot: null
        })
      }
      return timeSlots
    }
  }, [selectedDate, ghlCalendarEnabled, ghlSlots, selectedTimezone])

  if (selectedDate) {
    // Time Selection View
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-medium">Choose your preferred time</div>
          <button 
            onClick={() => onDateSelect('')} 
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Change date
          </button>
        </div>
        
        <div className="text-sm text-gray-600 mb-4">
          Selected date: <span className="font-medium">{new Date(selectedDate).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</span>
          {ghlCalendarEnabled && (
            <div className="text-xs text-gray-500 mt-1">
              Times shown in {getTimezoneLabel(selectedTimezone)}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {(() => {
            const slots = getAvailableTimeSlots
            if (slots.length > 0) {
              return slots.map((slotData, index) => {
                return { 
                  value: slotData.displayTime, 
                  label: slotData.displayTime, 
                  slot: slotData.slot,
                  disabled: false 
                }
              })
            } else {
              // No slots available for this date
              return [{ value: '', label: 'No slots available', slot: null, disabled: true }]
            }
          })().map((timeSlot, index) => (
            <button
              key={timeSlot.value || index}
              onClick={() => {
                if (!timeSlot.disabled) {
                  onTimeSelect(timeSlot.value, timeSlot.slot)
                }
              }}
              disabled={timeSlot.disabled}
              className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                timeSlot.disabled
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                  : selectedTime === timeSlot.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {timeSlot.label}
            </button>
          ))}
        </div>
        
        <div className="mt-4 text-sm text-gray-600 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5" />
          <div>{infoText}</div>
        </div>
      </div>
    )
  }

  // Calendar View
  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium">{cursor.toLocaleString('default', { month: 'long' })} {cursor.getFullYear()}</div>
        <div className="flex items-center gap-2">
          {ghlCalendarEnabled && (
            <button 
              onClick={onSync}
              disabled={isSyncing}
              className="w-8 h-8 rounded-md border flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
              title="Sync with GHL Calendar"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button 
            className="w-8 h-8 rounded-md border flex items-center justify-center disabled:opacity-50" 
            onClick={() => onNavigateMonth('prev')}
            disabled={isLoadingSlots}
          >
            {isLoadingSlots ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
          <button 
            className="w-8 h-8 rounded-md border flex items-center justify-center disabled:opacity-50" 
            onClick={() => onNavigateMonth('next')}
            disabled={isLoadingSlots}
          >
            {isLoadingSlots ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* Timezone Selector */}
      {ghlCalendarEnabled && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600">Show times in:</span>
          <select
            value={selectedTimezone}
            onChange={(e) => setSelectedTimezone(e.target.value as 'UTC' | 'UK' | 'US' | 'India' | 'Ireland')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="UTC">UTC</option>
            <option value="UK">UK (GMT/BST)</option>
            <option value="Ireland">Ireland (GMT/IST)</option>
            <option value="US">US (EST/EDT)</option>
            <option value="India">India (IST)</option>
          </select>
        </div>
      )}
      
      <div className="grid grid-cols-7 text-center text-xs text-gray-500 mt-3">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mt-2">
        {(() => {
          const firstWeekday = startOfMonth(cursor).getDay() // Sunday=0, Monday=1, etc.
          const blanks = Array.from({ length: firstWeekday })
          const cells: React.ReactNode[] = []
          blanks.forEach((_, i) => cells.push(<div key={`b-${i}`} />))
          
          monthDays.forEach(d => {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            const selected = selectedDate === key
            
            // Fix date comparison to avoid timezone issues
            const today = new Date()
            const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const dateLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate())
            const isPastDate = dateLocal < todayLocal
            
            const hasSlots = ghlCalendarEnabled ? hasAvailableSlots(d) : true
            const disabled = isPastDate || (ghlCalendarEnabled && !hasAvailableSlots(d))
            
            cells.push(
              <button 
                key={key} 
                disabled={disabled} 
                onClick={() => onDateSelect(key)} 
                className={`h-12 rounded-lg border text-sm ${
                  selected 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : hasSlots 
                      ? 'bg-gray-50 hover:bg-gray-100' 
                      : 'bg-gray-200 opacity-50'
                } disabled:opacity-50`}
                title={ghlCalendarEnabled && !hasSlots ? 'No available slots' : ''}
              >
                {d.getDate()}
              </button>
            )
          })
          return cells
        })()}
      </div>
      
      <div className="mt-4 text-sm text-gray-600 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5" />
        <div>
          {infoText}
          {ghlCalendarEnabled ? (
            <div className="mt-2 text-xs text-blue-600 font-medium">
              📅 Connected to GHL Calendar - Real availability data
              {ghlSlots.length === 0 && (
                <div className="mt-1 text-orange-600">
                  ⚠️ No slots found - Check GHL calendar configuration
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">
              📅 Using standard calendar - Connect GHL for real availability
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
