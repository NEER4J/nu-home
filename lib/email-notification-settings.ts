import { SupabaseClient } from '@supabase/supabase-js'

export interface AdminEmailConfig {
  enabled: boolean
  emails: string[]
}

export interface CustomerEmailConfig {
  enabled: boolean
}

export interface GHLConfig {
  enabled: boolean
}

export interface EmailNotificationConfig {
  admin: AdminEmailConfig
  customer: CustomerEmailConfig
  ghl: GHLConfig
}

export interface EmailNotificationSettings {
  [emailType: string]: EmailNotificationConfig
}

/**
 * Get notification settings for a specific email type
 * 
 * @param supabase - Supabase client
 * @param partnerId - Partner user ID
 * @param serviceCategoryId - Service category ID
 * @param emailType - Email type (e.g., 'quote-initial', 'enquiry-submitted')
 * @returns Object with admin, customer, and GHL settings
 */
export async function getNotificationSettingsForType(
  supabase: SupabaseClient,
  partnerId: string,
  serviceCategoryId: string,
  emailType: string
): Promise<EmailNotificationConfig> {
  const defaultSettings: EmailNotificationConfig = {
    admin: { enabled: true, emails: [] },
    customer: { enabled: true },
    ghl: { enabled: true }
  }

  try {
    // Get partner settings
    const { data: partnerSettings, error } = await supabase
      .from('PartnerSettings')
      .select('email_notification_settings, admin_email')
      .eq('partner_id', partnerId)
      .eq('service_category_id', serviceCategoryId)
      .single()

    if (error || !partnerSettings) {
      console.log(`No partner settings found for partner ${partnerId} and category ${serviceCategoryId}`)
      return defaultSettings
    }

    // Get email notification settings for this email type
    const notificationSettings = partnerSettings.email_notification_settings as EmailNotificationSettings

    // Check if settings exist for this email type
    if (notificationSettings && notificationSettings[emailType]) {
      const config = notificationSettings[emailType]
      
      // Handle new structure
      if (config.admin !== undefined) {
        // New structure with admin, customer, ghl
        const adminEmails = config.admin.emails && config.admin.emails.length > 0
          ? config.admin.emails
          : (partnerSettings.admin_email ? [partnerSettings.admin_email] : [])
        
        return {
          admin: {
            enabled: config.admin.enabled !== false,
            emails: adminEmails
          },
          customer: {
            enabled: config.customer?.enabled !== false
          },
          ghl: {
            enabled: config.ghl?.enabled !== false
          }
        }
      } else {
        // Old structure - migrate on the fly
        const oldConfig = config as any
        const adminEmails = oldConfig.emails && oldConfig.emails.length > 0
          ? oldConfig.emails
          : (partnerSettings.admin_email ? [partnerSettings.admin_email] : [])
        
        return {
          admin: {
            enabled: oldConfig.enabled !== false,
            emails: adminEmails
          },
          customer: { enabled: true },
          ghl: { enabled: true }
        }
      }
    }

    // Fallback to admin_email if no settings exist
    const fallbackEmail = partnerSettings.admin_email
    if (fallbackEmail && fallbackEmail.trim() !== '') {
      return {
        admin: { enabled: true, emails: [fallbackEmail] },
        customer: { enabled: true },
        ghl: { enabled: true }
      }
    }

    return defaultSettings
  } catch (error) {
    console.error('Error getting notification settings for type:', error)
    return defaultSettings
  }
}

/**
 * Get admin emails for a specific email type with fallback logic (backward compatibility)
 * 
 * @param supabase - Supabase client
 * @param partnerId - Partner user ID
 * @param serviceCategoryId - Service category ID
 * @param emailType - Email type (e.g., 'quote-initial', 'enquiry-submitted')
 * @returns Object with enabled status and array of email addresses
 */
export async function getAdminEmailsForType(
  supabase: SupabaseClient,
  partnerId: string,
  serviceCategoryId: string,
  emailType: string
): Promise<{ enabled: boolean; emails: string[] }> {
  const settings = await getNotificationSettingsForType(supabase, partnerId, serviceCategoryId, emailType)
  return settings.admin
}

/**
 * Update email notification settings for a specific email type
 * 
 * @param supabase - Supabase client
 * @param partnerId - Partner user ID
 * @param serviceCategoryId - Service category ID
 * @param emailType - Email type to update
 * @param config - Email notification configuration
 */
export async function updateEmailNotificationSettings(
  supabase: SupabaseClient,
  partnerId: string,
  serviceCategoryId: string,
  emailType: string,
  config: EmailNotificationConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current settings
    const { data: partnerSettings, error: fetchError } = await supabase
      .from('PartnerSettings')
      .select('email_notification_settings')
      .eq('partner_id', partnerId)
      .eq('service_category_id', serviceCategoryId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    // Update settings for this email type
    const currentSettings = (partnerSettings?.email_notification_settings || {}) as EmailNotificationSettings
    const updatedSettings = {
      ...currentSettings,
      [emailType]: config
    }

    // Save updated settings
    const { error: updateError } = await supabase
      .from('PartnerSettings')
      .update({ 
        email_notification_settings: updatedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('partner_id', partnerId)
      .eq('service_category_id', serviceCategoryId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating email notification settings:', error)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

/**
 * Get all email notification settings for a partner and service category
 */
export async function getAllEmailNotificationSettings(
  supabase: SupabaseClient,
  partnerId: string,
  serviceCategoryId: string
): Promise<EmailNotificationSettings> {
  try {
    const { data: partnerSettings, error } = await supabase
      .from('PartnerSettings')
      .select('email_notification_settings')
      .eq('partner_id', partnerId)
      .eq('service_category_id', serviceCategoryId)
      .single()

    if (error || !partnerSettings) {
      return {}
    }

    return (partnerSettings.email_notification_settings || {}) as EmailNotificationSettings
  } catch (error) {
    console.error('Error getting all email notification settings:', error)
    return {}
  }
}

