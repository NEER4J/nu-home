'use client'


import { useMemo, useState, type ReactNode, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Info, RefreshCw } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import { useRouter } from 'next/navigation'
import OrderSummarySidebar from '@/components/category-commons/checkout/OrderSummarySidebar'
import FinanceCalculator from '@/components/FinanceCalculator'
import CheckoutFAQ from '@/components/category-commons/checkout/CheckoutFAQ'

export interface CustomerDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
  postcode: string
  notes: string
  date?: string
  time?: string
}

export interface SurveyLayoutProps {
  selectedProduct: {
    partner_product_id: string
    partner_id: string
    name: string
    price: number | null
    image_url: string | null
    calculator_settings?: {
      selected_plan?: {
        apr: number
        months: number
      }
      selected_deposit?: number
    } | null
    selected_power?: {
      power: string
      price: number
      additional_cost: number
    } | null
  } | null
  selectedAddons?: any[]
  selectedBundles?: any[]
  companyColor?: string | null
  partnerSettings?: {
    apr_settings: Record<number, number> | null
    calendar_settings?: {
      survey_booking?: {
        enabled: boolean
        calendar_id: string
        calendar_name: string
      }
      available_calendars?: Array<{
        id: string
        name: string
        isActive: boolean
        description: string
      }>
    }
  } | null
  currentCalculatorSettings?: {
    selected_plan?: { months: number; apr: number } | null
    selected_deposit?: number
  } | null
  prefillUserInfo?: {
    first_name: string
    last_name: string
    email: string
    phone: string
    postcode: string
    notes: string
  }
  submissionId?: string
  onSurveySubmit?: (surveyDetails: any) => void
  backHref?: string
  backLabel?: string
  showBack?: boolean
}

function getImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return url
  return `/${url}`
}


function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }

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

export default function SurveyLayout({
  selectedProduct,
  selectedAddons = [],
  selectedBundles = [],
  companyColor = null,
  partnerSettings = null,
  currentCalculatorSettings = null,
  prefillUserInfo,
  submissionId,
  onSurveySubmit,
  backHref = '/boiler/products',
  backLabel = 'Back to Products',
  showBack = true,
}: SurveyLayoutProps) {
  const classes = useDynamicStyles(companyColor)
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [cursor, setCursor] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [details, setDetails] = useState<CustomerDetails>({
    firstName: '', lastName: '', email: '', phone: '', postcode: '', notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showFinanceCalculator, setShowFinanceCalculator] = useState(false)
  const [calculatorSettings, setCalculatorSettings] = useState<{
    selected_plan?: { months: number; apr: number } | null
    selected_deposit?: number
  } | null>(null)
  
  // GHL Calendar integration state
  const [ghlSlots, setGhlSlots] = useState<any[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [ghlCalendarEnabled, setGhlCalendarEnabled] = useState(false)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [selectedTimezone, setSelectedTimezone] = useState<'UTC' | 'UK' | 'US' | 'India' | 'Ireland'>('UTC')
  

  // Pre-fill user info when component mounts
  useEffect(() => {
    if (prefillUserInfo) {
      setDetails({
        firstName: prefillUserInfo.first_name || '',
        lastName: prefillUserInfo.last_name || '',
        email: prefillUserInfo.email || '',
        phone: prefillUserInfo.phone || '',
        postcode: prefillUserInfo.postcode || '',
        notes: prefillUserInfo.notes || ''
      })
    }
  }, [prefillUserInfo])

  // Initialize calculator settings from selected product or current settings
  useEffect(() => {
    if (currentCalculatorSettings) {
      setCalculatorSettings(currentCalculatorSettings)
    } else if (selectedProduct?.calculator_settings) {
      setCalculatorSettings(selectedProduct.calculator_settings)
    }
  }, [currentCalculatorSettings, selectedProduct?.calculator_settings])

  // Initialize GHL calendar integration
  useEffect(() => {
    console.log('SurveyLayout: Partner settings:', partnerSettings)
    console.log('SurveyLayout: Calendar settings:', partnerSettings?.calendar_settings)
    console.log('SurveyLayout: Survey booking settings:', partnerSettings?.calendar_settings?.survey_booking)
    console.log('SurveyLayout: Available calendars:', partnerSettings?.calendar_settings?.available_calendars)
    
    // Check if survey_booking is enabled OR if we have available calendars (fallback)
    const hasSurveyBooking = partnerSettings?.calendar_settings?.survey_booking?.enabled
    const hasAvailableCalendars = (partnerSettings?.calendar_settings?.available_calendars?.length ?? 0) > 0
    
    if (hasSurveyBooking || hasAvailableCalendars) {
      console.log('SurveyLayout: GHL calendar enabled, fetching slots...')
      setGhlCalendarEnabled(true)
      fetchGhlSlots()
    } else {
      console.log('SurveyLayout: GHL calendar disabled or not configured')
      setGhlCalendarEnabled(false)
    }
  }, [partnerSettings?.calendar_settings, cursor])

  // Fetch GHL calendar slots
  const fetchGhlSlots = async () => {
    // Get calendar ID from survey_booking or use first available calendar
    let calendarId = partnerSettings?.calendar_settings?.survey_booking?.calendar_id
    
    if (!calendarId && partnerSettings?.calendar_settings?.available_calendars?.length && partnerSettings.calendar_settings.available_calendars.length > 0) {
      // Use first available calendar as fallback
      calendarId = partnerSettings.calendar_settings.available_calendars[0]?.id
      console.log('Using fallback calendar ID:', calendarId)
    }
    
    if (!calendarId) {
      console.log('No calendar ID available for GHL slots')
      return
    }
    
    // Get date range for current month only (GHL API has 31 day limit)
    const startDate = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    // Set end date to the last day of current month at 23:59:59
    const endDate = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999)
    
    console.log('Fetching GHL slots for date range:', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      daysInRange: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    })
    
    setIsLoadingSlots(true)
    try {
      const response = await fetch(`/api/ghl/calendar-slots?calendarId=${calendarId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        setGhlSlots(data.slots || [])
        console.log('GHL slots loaded:', data.slots?.length, 'slots for', startDate.toLocaleDateString(), 'to', endDate.toLocaleDateString())
      } else {
        console.error('Failed to fetch GHL slots:', await response.text())
      }
    } catch (error) {
      console.error('Error fetching GHL slots:', error)
    } finally {
      setIsLoadingSlots(false)
    }
  }

  // Sync calendar data
  const syncCalendar = async () => {
    setIsSyncing(true)
    try {
      await fetchGhlSlots()
    } catch (error) {
      console.error('Error syncing calendar:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Handle month navigation with loading
  const handleMonthNavigation = async (direction: 'prev' | 'next') => {
    if (!ghlCalendarEnabled) {
      // If GHL not enabled, just change month without loading
      if (direction === 'prev') {
        setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
      } else {
        setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
      }
      return
    }

    setIsLoadingMonth(true)
    try {
      // Change month first
      if (direction === 'prev') {
        setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
      } else {
        setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
      }
      
      // Fetch new month's slots
      await fetchGhlSlots()
    } catch (error) {
      console.error('Failed to load month slots:', error)
    } finally {
      setIsLoadingMonth(false)
    }
  }

  // Calculator handlers
  const handleCalculatorPlanChange = (plan: { months: number; apr: number }) => {
    const newSettings = {
      ...calculatorSettings,
      selected_plan: plan
    }
    setCalculatorSettings(newSettings)
    console.log('Survey: Calculator plan changed:', newSettings)
  }

  const handleCalculatorDepositChange = (deposit: number) => {
    const newSettings = {
      ...calculatorSettings,
      selected_deposit: deposit
    }
    setCalculatorSettings(newSettings)
    console.log('Survey: Calculator deposit changed:', newSettings)
  }

  const handleCalculatorMonthlyPaymentUpdate = (monthlyPayment: number) => {
    // This is handled by the calculator itself, but we can use it for logging if needed
    console.log('Survey: Monthly payment updated:', monthlyPayment)
  }

  // Calculate order total
  const basePrice = useMemo(() => {
    if (selectedProduct?.selected_power?.price) {
      return selectedProduct.selected_power.price
    }
    return (typeof selectedProduct?.price === 'number' ? selectedProduct.price : 0)
  }, [selectedProduct?.price, selectedProduct?.selected_power?.price])
  
  const addonsTotal = useMemo(() => selectedAddons.reduce((s, a) => s + a.price * a.quantity, 0), [selectedAddons])
  const bundlesTotal = useMemo(() => selectedBundles.reduce((s, b) => s + b.quantity * b.unitPrice, 0), [selectedBundles])
  const orderTotal = useMemo(() => Math.max(0, basePrice + addonsTotal + bundlesTotal), [basePrice, addonsTotal, bundlesTotal])

  // Calendar month days calculation
  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor)
    const end = endOfMonth(cursor)
    const days: Date[] = []
    
    // Create dates in local timezone to avoid timezone issues
    const startDate = new Date(start.getFullYear(), start.getMonth(), 1)
    const endDate = new Date(start.getFullYear(), start.getMonth() + 1, 0) // Last day of month
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d))
    }
    
    console.log('Month days calculation:', {
      cursor: cursor.toISOString(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      daysCount: days.length,
      firstDay: days[0]?.toISOString(),
      lastDay: days[days.length - 1]?.toISOString(),
      firstDayDate: days[0]?.getDate(),
      lastDayDate: days[days.length - 1]?.getDate()
    })
    
    return days
  }, [cursor])

  // Get available time slots for selected date (GHL or fallback)
  const getAvailableTimeSlots = useMemo(() => {
    if (!selectedDate) return []
    
    if (ghlCalendarEnabled) {
      // Use real GHL calendar data
      const dateSlots = ghlSlots.filter(slot => {
        // Extract date directly from slot without timezone conversion
        const slotDate = slot.startTime.split('T')[0] // "2025-10-01"
        return slotDate === selectedDate && slot.isAvailable
      })
      
      console.log('Using real GHL calendar data - filtered slots for', selectedDate, ':', dateSlots.length, 'slots', 'from total:', ghlSlots.length)
      return dateSlots.map(slot => {
        // Convert UTC time to selected timezone for display
        const formattedTime = convertUTCToTimezone(slot.startTime, selectedTimezone)
        
        console.log('GHL slot conversion:', {
          original: slot.startTime,
          timezone: selectedTimezone,
          converted: formattedTime
        })
        
        // Return slot object with display time
        return {
          displayTime: formattedTime,
          slot: slot
        }
      })
    } else {
      // Fallback: Static time slots only when GHL is not connected
      console.log('Using fallback static time slots (GHL not connected)')
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

  // Check if a date has available slots
  const hasAvailableSlots = (date: Date) => {
    if (!ghlCalendarEnabled) {
      // Fallback: Show all dates as available when GHL not connected
      return true
    }
    
    if (ghlSlots.length === 0) {
      // No GHL data loaded yet
      return false
    }
    
    // Extract date directly without timezone conversion
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const hasSlots = ghlSlots.some(slot => {
      // Extract date directly from slot without timezone conversion
      const slotDate = slot.startTime.split('T')[0]
      return slotDate === dateString && slot.isAvailable
    })
    
    console.log(`Date ${dateString} has available slots:`, hasSlots, {
      dateString,
      sampleSlotDates: ghlSlots.slice(0, 3).map(s => s.startTime.split('T')[0])
    })
    return hasSlots
  }

  const handleNextStep = () => {
    if (!details.firstName || !details.lastName || !details.email || !details.phone || !details.postcode) {
      return
    }
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!details.firstName || !details.lastName || !details.email || !details.phone || !details.postcode || !selectedDate || !selectedTime) {
      return
    }

    setIsSubmitting(true)

    try {
      // Use custom survey submit handler if provided
      if (onSurveySubmit) {
        await onSurveySubmit({ ...details, date: selectedDate, time: selectedTime, slot: selectedSlot })
      } else {
        // Fallback to original behavior
        // Save survey submission to database if submissionId exists
        if (submissionId) {
          await fetch('/api/partner-leads/update-payment', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              submissionId,
              surveyDetails: details,
              progressStep: 'survey_completed'
            }),
          })
        }

        // Send survey submission email and wait for completion
        try {
          console.log('Sending survey email...')
          const emailResponse = await fetch('/api/email/boiler/survey-submitted-v2', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              first_name: details.firstName,
              last_name: details.lastName,
              email: details.email,
              phone: details.phone,
              postcode: details.postcode,
              notes: details.notes,
              submission_id: submissionId
            }),
          })
          
          if (emailResponse.ok) {
            console.log('Survey email sent successfully')
          } else {
            console.warn('Failed to send survey email:', await emailResponse.text())
          }
        } catch (emailError) {
          console.error('Failed to send survey email:', emailError)
        }

        // Redirect to enquiry page after email is sent
        console.log('Redirecting to enquiry page...')
        const enquiryUrl = new URL('/boiler/enquiry', window.location.origin)
        if (submissionId) {
          enquiryUrl.searchParams.set('submission', submissionId)
        }
        router.push(enquiryUrl.toString())
      }
    } catch (error) {
      console.error('Failed to submit survey:', error)
      // Still redirect even if saving fails
      const enquiryUrl = new URL('/boiler/enquiry', window.location.origin)
      if (submissionId) {
        enquiryUrl.searchParams.set('submission', submissionId)
      }
      router.push(enquiryUrl.toString())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-8">
      <div>
        {showBack && (
          <button 
            onClick={() => {
              const url = new URL(backHref, window.location.origin)
              if (submissionId) url.searchParams.set('submission', submissionId)
              window.location.href = url.toString()
            }} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {backLabel}
          </button>
        )}
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
          {step === 1 ? 'Book in for a call' : 'Choose date and time'}
        </h1>
        
        {step === 1 && (
        <div className="grid lg:grid-cols-2 gap-8 bg-transparent md:bg-white rounded-xl p-0 md:p-8 mb-20">
          {/* FAQ Section */}
          <div className="hidden lg:block">
            <CheckoutFAQ />
          </div>
          
          {/* Survey Form */}
          <div className="">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">First name *</label>
              <input 
                value={details.firstName} 
                onChange={e => setDetails({ ...details, firstName: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                placeholder="e.g. Sam" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Last name *</label>
              <input 
                value={details.lastName} 
                onChange={e => setDetails({ ...details, lastName: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                placeholder="e.g. Doe" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Email address *</label>
              <input 
                type="email" 
                value={details.email} 
                onChange={e => setDetails({ ...details, email: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                placeholder="e.g. sam.doe@example.com" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Contact number *</label>
              <input 
                value={details.phone} 
                onChange={e => setDetails({ ...details, phone: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                placeholder="e.g. 07234 123456" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Postcode *</label>
              <input 
                value={details.postcode} 
                onChange={e => setDetails({ ...details, postcode: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                placeholder="e.g. SW1A 1AA" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Tell us about your project</label>
              <textarea 
                value={details.notes} 
                onChange={e => setDetails({ ...details, notes: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                rows={4} 
                placeholder="Tell us about your requirements, timeline, or any specific needs..." 
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button 
                onClick={handleNextStep} 
                disabled={!details.firstName || !details.lastName || !details.email || !details.phone || !details.postcode}
                className={`flex-1 py-3 rounded-full font-medium flex items-center justify-center gap-2 ${classes.button} ${classes.buttonText} disabled:opacity-50`}
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">By submitting your details, you agree to our privacy policy.</p>
        </div>
        
        {/* Mobile FAQ Section */}
        <div className="lg:hidden mt-8">
          <CheckoutFAQ />
        </div>
        </div>
        )}

        {step === 2 && (
          <div className="grid lg:grid-cols-2 gap-8 bg-transparent md:bg-white rounded-xl p-0 md:p-8 mb-20">
            {/* Calendar or Time Selection */}
            <div className="bg-gray-100 rounded-xl p-4 md:p-6 md:bg-gray-100 bg-white">
              {!selectedDate ? (
                // Calendar View
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-medium">{cursor.toLocaleString('default', { month: 'long' })} {cursor.getFullYear()}</div>
                    <div className="flex items-center gap-2">
                      {ghlCalendarEnabled && (
                        <button 
                          onClick={syncCalendar}
                          disabled={isSyncing}
                          className="w-8 h-8 rounded-md border flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                          title="Sync with GHL Calendar"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      <button 
                        className="w-8 h-8 rounded-md border flex items-center justify-center disabled:opacity-50" 
                        onClick={() => handleMonthNavigation('prev')}
                        disabled={isLoadingMonth}
                      >
                        {isLoadingMonth ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                        ) : (
                          <ChevronLeft className="w-4 h-4" />
                        )}
                      </button>
                      <button 
                        className="w-8 h-8 rounded-md border flex items-center justify-center disabled:opacity-50" 
                        onClick={() => handleMonthNavigation('next')}
                        disabled={isLoadingMonth}
                      >
                        {isLoadingMonth ? (
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
                  {/* days */}
                  <div className="relative">
                    {isLoadingMonth && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                          Loading month data...
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-7 gap-2 mt-2">
                    {(() => {
                      const firstWeekday = startOfMonth(cursor).getDay() // Sunday=0, Monday=1, etc.
                      const blanks = Array.from({ length: firstWeekday })
                      const cells: ReactNode[] = []
                      blanks.forEach((_, i) => cells.push(<div key={`b-${i}`} />))
                      monthDays.forEach(d => {
                        // Create date key without timezone conversion
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                        const selected = selectedDate === key
                        
                        // Debug only first few days
                        if (d.getDate() <= 2) {
                          console.log('Calendar button date:', {
                            originalDate: d.toISOString(),
                            generatedKey: key,
                            dayOfMonth: d.getDate()
                          })
                        }
                        
                        // Fix date comparison to avoid timezone issues
                        const today = new Date()
                        // Use local date comparison to avoid timezone issues
                        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                        const dateLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate())
                        const isPastDate = dateLocal < todayLocal
                        
                        const hasSlots = ghlCalendarEnabled ? hasAvailableSlots(d) : true
                        const disabled = isPastDate || (ghlCalendarEnabled && !hasAvailableSlots(d))
                        
                        // Debug logging for date issues
                        if (d.getDate() <= 3) { // Only log first few days to avoid spam
                          console.log('Date debug:', {
                            date: d.toISOString(),
                            dateLocal: dateLocal.toISOString(),
                            todayLocal: todayLocal.toISOString(),
                            isPastDate,
                            disabled,
                            hasSlots
                          })
                        }
                        cells.push(
                          <button 
                            key={key} 
                            disabled={disabled} 
                            onClick={() => setSelectedDate(key)} 
                            className={`h-12 rounded-lg border text-sm ${
                              selected 
                                ? `${classes.button} ${classes.buttonText}` 
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
                  </div>
                  <div className="mt-4 text-sm text-gray-600 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5" />
                    <div>
                      We'll contact you to discuss your project requirements and provide a detailed quote.
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
                </>
              ) : (
                // Time Selection View
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-medium">Choose your preferred time</div>
                    <button 
                      onClick={() => setSelectedDate('')} 
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
                            setSelectedTime(timeSlot.value)
                            setSelectedSlot(timeSlot.slot)
                          }
                        }}
                        disabled={timeSlot.disabled}
                        className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                          timeSlot.disabled
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                            : selectedTime === timeSlot.value
                            ? `${classes.button} ${classes.buttonText}`
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {timeSlot.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-gray-600 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5" />
                    <div>We'll contact you to discuss your project requirements and provide a detailed quote.</div>
                  </div>
                </>
              )}
            </div>

            {/* Summary and Submit */}
            <div className="">
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><span className="font-medium">Name:</span> {details.firstName} {details.lastName}</div>
                  <div><span className="font-medium">Email:</span> {details.email}</div>
                  <div><span className="font-medium">Phone:</span> {details.phone}</div>
                  <div><span className="font-medium">Postcode:</span> {details.postcode}</div>
                  {selectedDate && <div><span className="font-medium">Preferred Date:</span> {new Date(selectedDate).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</div>}
                  {selectedTime && <div><span className="font-medium">Preferred Time:</span> {selectedTime} {ghlCalendarEnabled && `(${getTimezoneLabel(selectedTimezone)})`}</div>}
                  {details.notes && <div><span className="font-medium">Notes:</span> {details.notes}</div>}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)} 
                  className="flex-1 py-3 rounded-full font-medium flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              <button 
                onClick={handleSubmit} 
                  disabled={!selectedDate || !selectedTime || isSubmitting}
                className={`flex-1 py-3 rounded-full font-medium flex items-center justify-center gap-2 ${classes.button} ${classes.buttonText} disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Survey'
                )}
              </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">By submitting your details, you agree to our privacy policy.</p>
        </div>
        </div>
        )}
      </div>

      {/* Order Summary Sidebar */}
      <OrderSummarySidebar
        selectedProduct={selectedProduct}
        selectedAddons={selectedAddons}
        selectedBundles={selectedBundles}
        companyColor={companyColor}
        partnerSettings={partnerSettings}
        currentCalculatorSettings={calculatorSettings}
        onContinue={() => {}} // No action needed for survey
        onOpenFinanceCalculator={() => setShowFinanceCalculator(true)}
        continueButtonText="Submit Survey"
        showContinueButton={false}
        showInstallationIncluded={true}
        showMobileCard={true}
      />

      {/* Finance Calculator Modal */}
      {selectedProduct && (
        <FinanceCalculator
          isOpen={showFinanceCalculator}
          onClose={() => setShowFinanceCalculator(false)}
          productPrice={orderTotal}
          productName={`${selectedProduct.name} + Add-ons`}
          productImageUrl={selectedProduct.image_url}
          aprSettings={partnerSettings?.apr_settings || null}
          brandColor={companyColor || undefined}
          selectedPlan={calculatorSettings?.selected_plan || selectedProduct?.calculator_settings?.selected_plan || undefined}
          selectedDeposit={calculatorSettings?.selected_deposit ?? selectedProduct?.calculator_settings?.selected_deposit ?? 0}
          onPlanChange={handleCalculatorPlanChange}
          onDepositChange={handleCalculatorDepositChange}
          onMonthlyPaymentUpdate={handleCalculatorMonthlyPaymentUpdate}
        />
      )}
    </div>
  )
}
