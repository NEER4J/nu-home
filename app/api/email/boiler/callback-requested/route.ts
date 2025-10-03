import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { decryptObject } from '@/lib/encryption'
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner'
import { FieldMappingEngine } from '@/lib/field-mapping-engine'
import { getNotificationSettingsForType } from '@/lib/email-notification-settings'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

type NormalizedSmtp = {
  SMTP_HOST: string
  SMTP_PORT: number
  SMTP_SECURE: boolean
  SMTP_USER: string
  SMTP_PASSWORD: string
  SMTP_FROM: string
}

function parseHostname(request: NextRequest, bodySubdomain?: string | null): string | null {
  try {
    const url = new URL(request.url)
    const urlParamSubdomain = url.searchParams.get('subdomain')
    if (urlParamSubdomain) return urlParamSubdomain
  } catch {}
  if (bodySubdomain) return bodySubdomain
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0]
  if (!hostname || hostname === 'localhost') return null
  return hostname
}

function migrateSmtp(raw: any): NormalizedSmtp {
  const merged: any = {
    SMTP_HOST: '',
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    SMTP_FROM: '',
    ...(raw || {}),
  }
  if (!merged.SMTP_HOST && raw?.host) merged.SMTP_HOST = raw.host
  if (!merged.SMTP_PORT && (raw?.port || raw?.SMTP_PORT === 0)) merged.SMTP_PORT = Number(raw.port ?? raw.SMTP_PORT ?? 587)
  if (typeof merged.SMTP_SECURE !== 'boolean' && typeof raw?.secure === 'boolean') merged.SMTP_SECURE = raw.secure as boolean
  if (!merged.SMTP_USER && (raw?.username || raw?.user)) merged.SMTP_USER = (raw.username ?? raw.user) as string
  if (!merged.SMTP_PASSWORD && raw?.password) merged.SMTP_PASSWORD = raw.password as string
  if (!merged.SMTP_FROM && (raw?.from_email || raw?.from)) merged.SMTP_FROM = (raw.from_email ?? raw.from) as string
  const port = typeof merged.SMTP_PORT === 'string' ? parseInt(merged.SMTP_PORT, 10) : (merged.SMTP_PORT || 587)
  const secure = typeof merged.SMTP_SECURE === 'string' ? merged.SMTP_SECURE === 'true' : Boolean(merged.SMTP_SECURE)
  return {
    SMTP_HOST: String(merged.SMTP_HOST || ''),
    SMTP_PORT: Number.isFinite(port) ? port : 587,
    SMTP_SECURE: secure,
    SMTP_USER: String(merged.SMTP_USER || ''),
    SMTP_PASSWORD: String(merged.SMTP_PASSWORD || ''),
    SMTP_FROM: String(merged.SMTP_FROM || ''),
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀🚀🚀 callback-requested API called 🚀🚀🚀')
  let finalSubmissionId: string | undefined
  
  try {
    const body = await request.json().catch(() => ({}))
    const { 
      // New standardized fields
      firstName,
      lastName,
      email,
      phone,
      postcode,
      submissionId,
      notes,
      category,
      
      // Legacy fields for backward compatibility
      first_name, 
      last_name, 
      submission_id,
      subdomain: bodySubdomain 
    } = body || {}

    // Use new fields if available, fallback to legacy fields
    const finalFirstName = firstName || first_name
    const finalLastName = lastName || last_name
    finalSubmissionId = submissionId || submission_id

    const hostname = parseHostname(request, bodySubdomain)
    console.log('callback-requested - Parsed hostname:', hostname);
    
    if (!hostname) {
      return NextResponse.json({ error: 'Missing hostname' }, { status: 400 })
    }

    const supabase = await createClient()
    const partner = await resolvePartnerByHost(supabase, hostname)
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found for this domain' }, { status: 400 })
    }

    if (!partner.smtp_settings) {
      return NextResponse.json({ error: 'SMTP settings not configured' }, { status: 400 })
    }

    const decrypted = decryptObject(partner.smtp_settings || {})
    const smtp: NormalizedSmtp = migrateSmtp(decrypted)
    if (!smtp.SMTP_HOST || !smtp.SMTP_USER || !smtp.SMTP_PASSWORD) {
      return NextResponse.json({ error: 'Incomplete SMTP settings' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: smtp.SMTP_HOST,
      port: smtp.SMTP_PORT,
      secure: smtp.SMTP_SECURE,
      auth: { user: smtp.SMTP_USER, pass: smtp.SMTP_PASSWORD },
    })

    try { await transporter.verify() } catch (verifyErr: any) {
      return NextResponse.json({ error: 'SMTP verification failed', details: verifyErr?.message || String(verifyErr) }, { status: 400 })
    }

    // Get service category ID for boiler
    const { data: boilerCategory } = await supabase
      .from('ServiceCategories')
      .select('service_category_id')
      .eq('slug', 'boiler')
      .single()

    if (!boilerCategory) {
      return NextResponse.json({ error: 'Boiler service category not found' }, { status: 400 })
    }

    // Ensure field mappings exist for this partner and service category
    const { data: existingMappings } = await supabase
      .from('email_field_mappings')
      .select('id')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'callback-requested')
      .limit(1)

    if (!existingMappings || existingMappings.length === 0) {
      console.log('📋 No field mappings found, copying defaults...')
      const { error: copyError } = await supabase.rpc('copy_default_field_mappings', {
        p_partner_id: partner.user_id,
        p_service_category_id: boilerCategory.service_category_id
      })
      
      if (copyError) {
        console.error('❌ Failed to copy default field mappings:', copyError)
        return NextResponse.json({ error: 'Failed to setup field mappings' }, { status: 500 })
      }
      console.log('✅ Default field mappings copied successfully')
    }

    // Initialize Field Mapping Engine
    console.log('🔧 Initializing FieldMappingEngine...')
    const fieldMappingEngine = new FieldMappingEngine(supabase, partner.user_id, boilerCategory.service_category_id)
    
    // Get template data using field mappings
    console.log('📊 Mapping customer template data...')
    const customerTemplateData = await fieldMappingEngine.mapSubmissionToTemplateFields(finalSubmissionId || '', 'callback-requested', 'customer')
    console.log('📊 Customer template data keys:', Object.keys(customerTemplateData))
    
    console.log('📊 Mapping admin template data...')
    const adminTemplateData = await fieldMappingEngine.mapSubmissionToTemplateFields(finalSubmissionId || '', 'callback-requested', 'admin')
    console.log('📊 Admin template data keys:', Object.keys(adminTemplateData))

    // Get email templates from database
    const { data: customerTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'callback-requested')
      .eq('recipient_type', 'customer')
      .eq('is_active', true)
      .single()

    const { data: adminTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'callback-requested')
      .eq('recipient_type', 'admin')
      .eq('is_active', true)
      .single()

    console.log('📧 Customer template found:', !!customerTemplate)
    console.log('📧 Admin template found:', !!adminTemplate)

    // Process templates with field mapping engine
    const processedCustomerTemplate = customerTemplate ? await fieldMappingEngine.processEmailTemplate(customerTemplate, customerTemplateData) : null
    const processedAdminTemplate = adminTemplate ? await fieldMappingEngine.processEmailTemplate(adminTemplate, adminTemplateData) : null

    console.log('📧 Processed customer template:', !!processedCustomerTemplate)
    console.log('📧 Processed admin template:', !!processedAdminTemplate)

    // Get notification settings for this email type
    const notificationSettings = await getNotificationSettingsForType(
      supabase,
      partner.user_id,
      boilerCategory.service_category_id,
      'callback-requested'
    )
    console.log('📧 Notification settings:', {
      admin: { enabled: notificationSettings.admin.enabled, emails: notificationSettings.admin.emails.length },
      customer: { enabled: notificationSettings.customer.enabled },
      ghl: { enabled: notificationSettings.ghl.enabled }
    })

    const toAddress: string = email || smtp.SMTP_FROM
    if (!toAddress) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
    }

    let customerEmailSent = false
    let adminEmailSent = false
    let emailErrors: string[] = []

    try {
      // Send customer email if enabled
      if (notificationSettings.customer.enabled && processedCustomerTemplate) {
        try {
          await transporter.sendMail({
            from: smtp.SMTP_FROM || smtp.SMTP_USER,
            to: toAddress,
            subject: processedCustomerTemplate.subject,
            text: processedCustomerTemplate.text,
            html: processedCustomerTemplate.html,
          })
          console.log('✅ Customer email sent successfully')
          customerEmailSent = true
        } catch (customerErr: any) {
          console.error('❌ Customer email failed:', customerErr)
          emailErrors.push(`Customer email failed: ${customerErr?.message || String(customerErr)}`)
        }
      } else if (!notificationSettings.customer.enabled) {
        console.log('⚠️ Customer email disabled, skipping')
      }

      // Send admin emails if enabled and configured
      if (notificationSettings.admin.enabled && processedAdminTemplate && notificationSettings.admin.emails.length > 0) {
        for (const adminEmail of notificationSettings.admin.emails) {
          try {
            await transporter.sendMail({
              from: smtp.SMTP_FROM || smtp.SMTP_USER,
              to: adminEmail,
              subject: processedAdminTemplate.subject,
              text: processedAdminTemplate.text,
              html: processedAdminTemplate.html,
            })
            console.log(`✅ Admin email sent successfully to ${adminEmail}`)
            adminEmailSent = true
          } catch (adminErr: any) {
            console.error(`❌ Admin email to ${adminEmail} failed:`, adminErr)
            emailErrors.push(`Admin email to ${adminEmail} failed: ${adminErr?.message || String(adminErr)}`)
          }
        }
      } else if (!notificationSettings.admin.enabled) {
        console.log('⚠️ Admin emails disabled, skipping')
      }
    } catch (sendErr: any) {
      console.error('❌ SMTP send failed:', sendErr)
      return NextResponse.json({ 
        error: 'SMTP send failed', 
        details: sendErr?.message || String(sendErr),
        adminEmails: notificationSettings.admin.emails,
        adminEmailsEnabled: notificationSettings.admin.enabled,
        customerEmailEnabled: notificationSettings.customer.enabled,
        emailErrors: emailErrors
      }, { status: 400 })
    }

    // GHL Integration - check if enabled and mappings exist
    // Note: GHL lead is created from frontend (in CallbackRequestForm.tsx), not backend
    // This is just for tracking/debugging to avoid duplicate leads
    console.log('🔗 Checking GHL settings...')
    console.log('🔗 GHL enabled:', notificationSettings.ghl.enabled)

    let ghlMappings = null

    if (notificationSettings.ghl.enabled) {
      const { data: mappings } = await supabase
        .from('ghl_field_mappings')
        .select('*')
        .eq('partner_id', partner.user_id)
        .eq('service_category_id', boilerCategory.service_category_id)
        .eq('is_active', true)

      ghlMappings = mappings
      console.log('🔗 GHL mappings found:', ghlMappings?.length || 0)
      console.log('✅ GHL lead will be created from frontend')
    } else {
      console.log('⚠️ GHL integration disabled, skipping')
    }

    console.log('🎉 Email sending completed!')
    return NextResponse.json({ 
      success: true,
      partnerId: partner.user_id, // Add partnerId for frontend GHL integration
      customerEmailSent: customerEmailSent,
      adminEmailSent: adminEmailSent,
      ghlIntegrationAttempted: notificationSettings.ghl.enabled && !!(ghlMappings && ghlMappings.length > 0),
      message: 'Callback request emails sent successfully',
      debug: {
        partnerId: partner.user_id,
        adminEmails: notificationSettings.admin.emails,
        adminEmailsEnabled: notificationSettings.admin.enabled,
        customerEmailEnabled: notificationSettings.customer.enabled,
        ghlEnabled: notificationSettings.ghl.enabled,
        ghlMappingsCount: ghlMappings?.length || 0,
        emailErrors: emailErrors.length > 0 ? emailErrors : undefined
      }
    })
  } catch (error: any) {
    console.error('❌ callback-requested error:', error)
    return NextResponse.json({ 
      error: 'Failed to send callback request email', 
      details: error?.message || String(error)
    }, { status: 500 })
  }
}
