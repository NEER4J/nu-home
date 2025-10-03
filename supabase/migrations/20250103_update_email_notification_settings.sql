-- Migration: Update email_notification_settings structure to include customer email and GHL settings
-- New structure: { 
--   "email-type": { 
--     "admin": { "enabled": true, "emails": ["email@example.com"] },
--     "customer": { "enabled": true },
--     "ghl": { "enabled": true }
--   } 
-- }

-- Update comment to reflect new structure
COMMENT ON COLUMN public."PartnerSettings".email_notification_settings IS 'Email notification settings per email type. Structure: { "email-type": { "admin": { "enabled": true, "emails": ["email@example.com"] }, "customer": { "enabled": true }, "ghl": { "enabled": true } } }';

-- Migrate existing data to new structure
UPDATE public."PartnerSettings"
SET email_notification_settings = (
  SELECT jsonb_object_agg(
    key,
    jsonb_build_object(
      'admin', jsonb_build_object('enabled', value->'enabled', 'emails', value->'emails'),
      'customer', jsonb_build_object('enabled', true),
      'ghl', jsonb_build_object('enabled', true)
    )
  )
  FROM jsonb_each(email_notification_settings)
)
WHERE email_notification_settings IS NOT NULL 
  AND email_notification_settings != '{}'::jsonb
  AND NOT (email_notification_settings ? 'quote-initial' AND email_notification_settings->'quote-initial' ? 'admin');

-- For new entries without any settings, create default structure for all email types
UPDATE public."PartnerSettings"
SET email_notification_settings = jsonb_build_object(
  'quote-initial', jsonb_build_object(
    'admin', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
    'customer', jsonb_build_object('enabled', true),
    'ghl', jsonb_build_object('enabled', true)
  ),
  'quote-verified', jsonb_build_object(
    'admin', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
    'customer', jsonb_build_object('enabled', true),
    'ghl', jsonb_build_object('enabled', true)
  ),
  'save-quote', jsonb_build_object(
    'admin', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
    'customer', jsonb_build_object('enabled', true),
    'ghl', jsonb_build_object('enabled', true)
  ),
  'checkout-monthly', jsonb_build_object(
    'admin', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
    'customer', jsonb_build_object('enabled', true),
    'ghl', jsonb_build_object('enabled', true)
  ),
  'checkout-pay-later', jsonb_build_object(
    'admin', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
    'customer', jsonb_build_object('enabled', true),
    'ghl', jsonb_build_object('enabled', true)
  ),
  'checkout-stripe', jsonb_build_object(
    'admin', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
    'customer', jsonb_build_object('enabled', true),
    'ghl', jsonb_build_object('enabled', true)
  ),
  'enquiry-submitted', jsonb_build_object(
    'admin', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
    'customer', jsonb_build_object('enabled', true),
    'ghl', jsonb_build_object('enabled', true)
  ),
  'survey-submitted', jsonb_build_object(
    'admin', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
    'customer', jsonb_build_object('enabled', true),
    'ghl', jsonb_build_object('enabled', true)
  ),
  'esurvey-submitted', jsonb_build_object(
    'admin', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
    'customer', jsonb_build_object('enabled', true),
    'ghl', jsonb_build_object('enabled', true)
  ),
  'callback-requested', jsonb_build_object(
    'admin', jsonb_build_object('enabled', true, 'emails', CASE WHEN admin_email IS NOT NULL AND admin_email != '' THEN jsonb_build_array(admin_email) ELSE '[]'::jsonb END),
    'customer', jsonb_build_object('enabled', true),
    'ghl', jsonb_build_object('enabled', true)
  )
)
WHERE email_notification_settings = '{}'::jsonb OR email_notification_settings IS NULL;

