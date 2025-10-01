# GHL Calendar Components

Reusable GHL (GoHighLevel) calendar integration components and hooks that can be used across different pages.

## Files Structure

```
hooks/
  └── use-ghl-calendar.ts          # Main hook for GHL calendar functionality

components/shared/
  ├── GHLCalendar.tsx              # Calendar grid component
  ├── GHLTimeSlots.tsx             # Time slots selector component
  └── GHL_CALENDAR_README.md       # This file

lib/
  └── ghl-appointments.ts          # Helper functions for creating appointments

app/api/ghl/
  ├── calendar-slots/route.ts      # API endpoint for fetching slots
  └── appointments/route.ts        # API endpoint for creating appointments
```

## Usage

### 1. Basic Calendar Integration

```tsx
import { useGHLCalendar } from '@/hooks/use-ghl-calendar'
import GHLCalendar from '@/components/shared/GHLCalendar'
import GHLTimeSlots from '@/components/shared/GHLTimeSlots'

function MyBookingPage() {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [selectedTimezone, setSelectedTimezone] = useState<'UTC' | 'UK' | 'US' | 'India' | 'Ireland'>('UTC')

  // Initialize GHL calendar hook
  const {
    ghlSlots,
    isLoadingSlots,
    isSyncing,
    cursor,
    ghlCalendarEnabled,
    calendarId,
    syncCalendar,
    navigateMonth,
    hasAvailableSlots
  } = useGHLCalendar({
    partnerSettings: partnerSettings, // Your partner settings object
    enabled: true
  })

  return (
    <div>
      {/* Calendar Component */}
      <GHLCalendar
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        ghlSlots={ghlSlots}
        ghlCalendarEnabled={ghlCalendarEnabled}
        cursor={cursor}
        isLoadingSlots={isLoadingSlots}
        isSyncing={isSyncing}
        onNavigateMonth={navigateMonth}
        onSync={syncCalendar}
        hasAvailableSlots={hasAvailableSlots}
        companyColor={companyColor}
      />

      {/* Time Slots Component */}
      <GHLTimeSlots
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onTimeSelect={(time, slot) => {
          setSelectedTime(time)
          setSelectedSlot(slot)
        }}
        ghlSlots={ghlSlots}
        ghlCalendarEnabled={ghlCalendarEnabled}
        selectedTimezone={selectedTimezone}
        onTimezoneChange={setSelectedTimezone}
        companyColor={companyColor}
      />
    </div>
  )
}
```

### 2. Creating Appointments

```tsx
import { createAppointmentFromSlot, createAppointmentManual } from '@/lib/ghl-appointments'

// Option 1: Create appointment from GHL slot (recommended)
const result = await createAppointmentFromSlot(
  selectedSlot, // The slot object from GHL
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890'
  },
  {
    productName: 'Product Name',
    notes: 'Additional notes'
  }
)

// Option 2: Create appointment manually (fallback)
const result = await createAppointmentManual(
  calendarId,
  '2025-10-01', // date
  '14:00',      // time
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890'
  },
  {
    productName: 'Product Name',
    notes: 'Additional notes',
    duration: 30 // minutes
  }
)

if (result.success) {
  console.log('Appointment created:', result.appointment)
} else {
  console.error('Error:', result.error)
}
```

## Hook API Reference

### `useGHLCalendar(props)`

**Props:**
- `partnerSettings` (object): Partner settings containing calendar configuration
- `enabled` (boolean): Enable/disable GHL calendar functionality

**Returns:**
- `ghlSlots` (array): Array of available slots
- `isLoadingSlots` (boolean): Loading state for slots
- `isSyncing` (boolean): Syncing state
- `cursor` (Date): Current month being displayed
- `error` (string | null): Error message if any
- `ghlCalendarEnabled` (boolean): Whether GHL calendar is enabled
- `calendarId` (string | null): The active calendar ID
- `fetchGhlSlots` (function): Manually fetch slots
- `syncCalendar` (function): Sync/refresh calendar data
- `navigateMonth` (function): Navigate to prev/next month
- `setCursor` (function): Set the current month
- `hasAvailableSlots` (function): Check if a date has available slots
- `getAvailableTimeSlotsForDate` (function): Get slots for a specific date

## Component Props

### GHLCalendar

| Prop | Type | Description |
|------|------|-------------|
| selectedDate | string | Currently selected date (YYYY-MM-DD) |
| onDateSelect | function | Callback when date is selected |
| ghlSlots | array | Array of available slots |
| ghlCalendarEnabled | boolean | Whether GHL is enabled |
| cursor | Date | Current month |
| isLoadingSlots | boolean | Loading state |
| isSyncing | boolean | Syncing state |
| onNavigateMonth | function | Month navigation handler |
| onSync | function | Sync button handler |
| hasAvailableSlots | function | Check slot availability |
| companyColor | string | Brand color (optional) |
| className | string | Additional CSS classes |

### GHLTimeSlots

| Prop | Type | Description |
|------|------|-------------|
| selectedDate | string | Currently selected date |
| selectedTime | string | Currently selected time |
| onTimeSelect | function | Callback when time is selected |
| ghlSlots | array | Array of available slots |
| ghlCalendarEnabled | boolean | Whether GHL is enabled |
| selectedTimezone | string | Current timezone |
| onTimezoneChange | function | Timezone change handler |
| companyColor | string | Brand color (optional) |
| className | string | Additional CSS classes |

## Features

✅ **GHL Integration**: Fetches real availability from GoHighLevel calendar  
✅ **Timezone Support**: Convert and display times in UTC, UK, US, India, Ireland  
✅ **Month Navigation**: Navigate between months with loading states  
✅ **Sync Button**: Manually refresh calendar data  
✅ **Slot Validation**: Only show dates with available slots  
✅ **Dynamic Slot Data**: Uses actual slot startTime, endTime, and duration  
✅ **Fallback Mode**: Works without GHL for static time slots  
✅ **Brand Customization**: Supports custom company colors  
✅ **Mobile Responsive**: Works on all screen sizes  

## Partner Settings Structure

```typescript
{
  calendar_settings: {
    survey_booking: {
      enabled: boolean,
      calendar_id: string
    },
    available_calendars: [
      {
        id: string,
        name: string
      }
    ]
  }
}
```

## API Endpoints

### GET /api/ghl/calendar-slots
Fetch available slots from GHL calendar.

**Query Parameters:**
- `calendarId` (required): GHL calendar ID
- `startDate` (required): Start date (ISO string)
- `endDate` (required): End date (ISO string)

**Response:**
```json
{
  "success": true,
  "slots": [
    {
      "id": "slot_2025-10-01_0",
      "startTime": "2025-10-01T11:00:00Z",
      "endTime": "2025-10-01T11:30:00Z",
      "duration": 30,
      "calendarId": "...",
      "isAvailable": true
    }
  ]
}
```

### POST /api/ghl/appointments
Create appointment in GHL calendar.

**Request Body:**
```json
{
  "calendarId": "...",
  "startTime": "2025-10-01T11:00:00Z",
  "endTime": "2025-10-01T11:30:00Z",
  "title": "Appointment Title",
  "description": "Description",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "appointment": { ... },
  "message": "Appointment created successfully"
}
```

## Examples

See `app/boiler/survey/page.tsx` and `components/category-commons/survey/SurveyLayout.tsx` for a complete implementation example.

