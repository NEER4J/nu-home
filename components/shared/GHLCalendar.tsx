'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { startOfMonth, format } from 'date-fns'

interface GHLCalendarProps {
  selectedDate: string
  onDateSelect: (date: string) => void
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
}

export default function GHLCalendar({
  selectedDate,
  onDateSelect,
  ghlSlots,
  ghlCalendarEnabled,
  cursor,
  isLoadingSlots,
  isSyncing,
  onNavigateMonth,
  onSync,
  hasAvailableSlots,
  companyColor,
  className = ''
}: GHLCalendarProps) {
  
  // Generate month days
  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor)
    const days: Date[] = []
    
    // Create dates in local timezone to avoid timezone issues
    const startDate = new Date(start.getFullYear(), start.getMonth(), 1)
    const endDate = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d))
    }
    
    return days
  }, [cursor])

  // Get button styles
  const getButtonStyles = () => {
    const color = companyColor || '#3b82f6'
    return {
      backgroundColor: color,
      color: '#ffffff'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onNavigateMonth('prev')}
          disabled={isLoadingSlots}
          className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingSlots ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
        
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">
            {format(cursor, 'MMMM yyyy')}
          </h3>
          
          {ghlCalendarEnabled && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              title="Sync with GHL Calendar"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        
        <button
          onClick={() => onNavigateMonth('next')}
          disabled={isLoadingSlots}
          className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingSlots ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* GHL Status Indicator */}
      {ghlCalendarEnabled && (
        <div className="mb-3 flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
          <span>Connected to GHL Calendar ({ghlSlots.length} slots available)</span>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="relative">
        {isLoadingSlots && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-lg">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells before first day */}
          {Array.from({ length: startOfMonth(cursor).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          
          {/* Month days */}
          {monthDays.map((d) => {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            const selected = selectedDate === key
            
            const today = new Date()
            const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const dateLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate())
            const isPastDate = dateLocal < todayLocal
            
            const hasSlots = ghlCalendarEnabled ? hasAvailableSlots(d) : true
            const disabled = isPastDate || (ghlCalendarEnabled && !hasSlots)
            
            return (
              <button
                key={key}
                onClick={() => !disabled && onDateSelect(key)}
                disabled={disabled}
                className={`
                  aspect-square p-2 rounded-lg text-sm font-medium transition-all
                  ${disabled
                    ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                    : selected
                    ? 'text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }
                  ${!disabled && !hasSlots && ghlCalendarEnabled ? 'opacity-50' : ''}
                `}
                style={selected ? getButtonStyles() : undefined}
              >
                {d.getDate()}
                {ghlCalendarEnabled && !disabled && hasSlots && !selected && (
                  <div className="w-1 h-1 bg-green-500 rounded-full mx-auto mt-1" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

