# Email Notification Settings Implementation

## Overview
Implemented a comprehensive email notification system that allows partners to configure multiple admin emails per email type with individual on/off toggles.

## What Changed

### 1. Database Schema
**File:** `supabase/migrations/20250103_add_email_notification_settings.sql`

- Added `email_notification_settings` JSONB column to `PartnerSettings` table
- Structure: `{ "email-type": { "enabled": true, "emails": ["email@example.com"] } }`
- Migration automatically converts existing `admin_email` values to the new structure for all email types
- **Default behavior:** All email types are enabled by default

### 2. Helper Functions
**File:** `lib/email-notification-settings.ts`

Created three main helper functions:
- `getAdminEmailsForType()` - Retrieves admin emails for a specific email type with fallback to `admin_email`
- `updateEmailNotificationSettings()` - Updates settings for a specific email type
- `getAllEmailNotificationSettings()` - Gets all notification settings for a partner/category

**Fallback Logic:**
1. Check if specific emails are configured for the email type
2. If not, fallback to the `admin_email` field in PartnerSettings
3. Respect the enabled/disabled status for each email type

### 3. UI Component
**File:** `components/partner/notifications/EmailNotificationSettings.tsx`

Features:
- Add/remove multiple email addresses per email type
- Enable/disable toggle for each email type
- Email validation
- Shows fallback email when no specific emails are configured
- Visual feedback for enabled/disabled state

### 4. Notifications Page
**File:** `app/partner/notifications/page.tsx`

Added:
- New "Email Settings" tab
- Integration with email notification settings component
- Load and save functionality for email settings per email type
- Context-aware display showing fallback email information

### 5. Email API Routes
**Updated 10 email routes:**
- `/api/email/boiler/quote-initial-v2`
- `/api/email/boiler/quote-verified-v2`
- `/api/email/boiler/save-quote-v2`
- `/api/email/boiler/checkout-monthly-v2`
- `/api/email/boiler/checkout-pay-later-v2` (imported function only, no admin emails in route)
- `/api/email/boiler/checkout-stripe-v2` (imported function only, no admin emails in route)
- `/api/email/boiler/enquiry-submitted-v2`
- `/api/email/boiler/survey-submitted-v2`
- `/api/email/boiler/esurvey-submitted`
- `/api/email/boiler/callback-requested`

**Changes to each route:**
- Import `getAdminEmailsForType` helper
- Replace single `admin_email` query with `getAdminEmailsForType()` call
- Loop through multiple admin emails
- Respect enabled/disabled status
- Better error handling with individual email tracking
- Enhanced debug information

## Email Types Supported

All 10 boiler email types:
1. `quote-initial` - Initial Quote Request
2. `quote-verified` - Quote Verified
3. `save-quote` - Save Quote
4. `checkout-monthly` - Monthly Payment Plan Confirmed
5. `checkout-pay-later` - Pay After Installation Booked
6. `checkout-stripe` - Payment Confirmed
7. `enquiry-submitted` - Enquiry Submitted
8. `survey-submitted` - Survey Submitted
9. `esurvey-submitted` - eSurvey Submitted
10. `callback-requested` - Callback Request

## How It Works

### Setting Up Email Notifications

1. Navigate to **Partner Dashboard > Notifications**
2. Select a **Service Category** (e.g., Boiler)
3. Select an **Email Type** (e.g., Quote Initial)
4. Click on the **"Email Settings"** tab
5. Configure:
   - Toggle to enable/disable notifications for this email type
   - Add multiple admin email addresses
   - Remove emails by clicking the X button

### Email Sending Logic

When an email event occurs:

1. System checks if notifications are **enabled** for this email type
2. If enabled:
   - Sends emails to **all configured emails** for this type
   - If no specific emails configured, uses **fallback admin_email**
3. If disabled:
   - Skips admin email sending entirely
4. Handles errors independently for each email address

### Backward Compatibility

- Existing `admin_email` field remains in PartnerSettings table
- Used as fallback when no specific emails are configured
- Migration automatically populates new settings from existing admin_email
- All existing functionality continues to work without changes

## Benefits

✅ **Multiple Recipients** - Send admin notifications to multiple email addresses  
✅ **Type-Specific Configuration** - Different emails for different notification types  
✅ **Individual Control** - Enable/disable each email type independently  
✅ **Fallback Support** - Automatic fallback to main admin email  
✅ **Better Error Handling** - Track failures per email address  
✅ **User-Friendly UI** - Easy to manage with visual feedback  
✅ **Backward Compatible** - Works with existing setup  

## Migration Steps

### To Run the Migration:

```sql
-- The migration file will be automatically detected by Supabase
-- Or run manually:
psql -h <host> -U <user> -d <database> -f supabase/migrations/20250103_add_email_notification_settings.sql
```

### To Test:

1. **Run the migration** to add the new column
2. **Navigate to Notifications page** in partner dashboard
3. **Select an email type** and go to Email Settings tab
4. **Add test email addresses**
5. **Trigger the email** (e.g., submit a quote)
6. **Verify emails** are sent to all configured addresses

## Notes

- Default state: All email types are **enabled** with fallback to main admin_email
- Email validation is performed client-side for immediate feedback
- Supports unlimited email addresses per email type
- Each email failure is tracked independently without affecting others
- Database changes are atomic and transaction-safe

## Future Enhancements

Potential additions:
- Email templates per recipient
- Schedule-based notifications (time windows)
- Email grouping/batching options
- Notification preferences (digest vs real-time)
- Category-wide email settings
- Email delivery status tracking

