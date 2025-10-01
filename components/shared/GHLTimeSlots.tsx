'use client'

import { useMemo, useState } from 'react'

interface GHLTimeSlotsProps {
  selectedDate: string
  selectedTime: string
  onTimeSelect: (time: string, slot: any) => void
  ghlSlots: any[]
  ghlCalendarEnabled: boolean
  selectedTimezone?: 'UTC' | 'UK' | 'US' | 'India' | 'Ireland'
  onTimezoneChange?: (timezone: 'UTC' | 'UK' | 'US' | 'India' | 'Ireland') => void
  companyColor?: string | null
  className?: string
}

export default function GHLTimeSlots({
  selectedDate,
  selectedTime,
  onTimeSelect,
  ghlSlots,
  ghlCalendarEnabled,
  selectedTimezone = 'UTC',
  onTimezoneChange,
  companyColor,
  className = ''
}: GHLTimeSlotsProps) {
  
  // Convert UTC time to selected timezone
  const convertUTCToTimezone = (utcTimeString: string, timezone: 'UTC' | 'UK' | 'US' | 'India' | 'Ireland') => {
    const date = new Date(utcTimeString)
    
    const timezoneMap = {
      'UTC': 'UTC',
      'UK': 'Europe/London',
      'US': 'America/New_York',
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

  // Get available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return []
    
    if (ghlCalendarEnabled) {
      // Use real GHL calendar data
      const dateSlots = ghlSlots.filter(slot => {
        const slotDate = slot.startTime.split('T')[0]
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
      // Fallback: Static time slots
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

  // Get button styles
  const getButtonStyles = () => {
    const color = companyColor || '#3b82f6'
    return {
      backgroundColor: color,
      color: '#ffffff'
    }
  }

  if (!selectedDate) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        Please select a date to view available time slots
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Timezone Selector */}
      {ghlCalendarEnabled && onTimezoneChange && (
        <div className="mb-4 flex items-center justify-between gap-2 bg-gray-50 p-3 rounded-lg">
          <span className="text-sm text-gray-600">Show times in:</span>
          <select
            value={selectedTimezone}
            onChange={(e) => onTimezoneChange(e.target.value as 'UTC' | 'UK' | 'US' | 'India' | 'Ireland')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="UTC">UTC</option>
            <option value="UK">UK (GMT/BST)</option>
            <option value="US">US (EST/EDT)</option>
            <option value="India">India (IST)</option>
            <option value="Ireland">Ireland (GMT/IST)</option>
          </select>
        </div>
      )}

      {/* Time Slots Grid */}
      <div className="grid grid-cols-3 gap-2">
        {availableTimeSlots.length > 0 ? (
          availableTimeSlots.map((slotData, index) => (
            <button
              key={slotData.displayTime || index}
              onClick={() => onTimeSelect(slotData.displayTime, slotData.slot)}
              className={`
                p-3 rounded-lg border text-sm font-medium transition-all
                ${selectedTime === slotData.displayTime
                  ? 'text-white shadow-md'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
              style={selectedTime === slotData.displayTime ? getButtonStyles() : undefined}
            >
              {slotData.displayTime}
            </button>
          ))
        ) : (
          <div className="col-span-3 text-center py-8 text-gray-500">
            No available time slots for this date
          </div>
        )}
      </div>

      {/* Timezone Info */}
      {ghlCalendarEnabled && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          Times shown in {getTimezoneLabel(selectedTimezone)}
        </div>
      )}
    </div>
  )
}

