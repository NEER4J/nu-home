-- Migration: Add email_notification_settings to PartnerSettings
-- This column will store email notification configuration per email type
-- Structure: { "email-type": { "enabled": true, "emails": ["email1@example.com"] } }

-- Add email_notification_settings column to PartnerSettings
ALTER TABLE public."PartnerSettings"
ADD COLUMN IF NOT EXISTS email_notification_settings JSONB DEFAULT '{}'::jsonb;

-- Add comment to the column
COMMENT ON COLUMN public."PartnerSettings".email_notification_settings IS 'Email notification settings per email type. Structure: { "email-type": { "enabled": true, "emails": ["email@example.com"] } }';

-- Migration for existing partners: create default settings from existing admin_email
-- This will migrate existing admin_email values to the new structure for all email types
UPDATE public."PartnerSettings"
SET email_notification_settings = jsonb_build_object(
  'quote-initial', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
  'quote-verified', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
  'save-quote', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
  'checkout-monthly', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
  'checkout-pay-later', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
  'checkout-stripe', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
  'enquiry-submitted', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
  'survey-submitted', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
  'esurvey-submitted', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
  'callback-requested', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END)
)
WHERE email_notification_settings = '{}'::jsonb OR email_notification_settings IS NULL;

