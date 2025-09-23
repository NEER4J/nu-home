import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { decryptObject } from '@/lib/encryption'
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner'
import { getProcessedEmailTemplate } from '@/lib/email-templates'
import { FieldMappingEngine } from '@/lib/field-mapping-engine'
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
  console.log('🚀🚀🚀 survey-submitted-v2 API called 🚀🚀🚀')
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
      fullAddress,
      submissionId,
      submissionDate,
      notes,
      uploadedImageUrls,
      imageInfo,
      surveyDetails,
      
      // Legacy fields for backward compatibility
      first_name, 
      last_name, 
      submission_id,
      subdomain: bodySubdomain,
      is_iframe
    } = body || {}

    // Use new fields if available, fallback to legacy fields
    const finalFirstName = firstName || first_name
    const finalLastName = lastName || last_name
    const finalSubmissionId = submissionId || submission_id

    const hostname = parseHostname(request, bodySubdomain)
    console.log('survey-submitted-v2 - Parsed hostname:', hostname)
    
    if (!hostname) {
      return NextResponse.json({ error: 'Missing hostname' }, { status: 400 })
    }

    const supabase = await createClient()
    const partner = await resolvePartnerByHost(supabase, hostname)
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found for this domain' }, { status: 400 })
    }

    console.log('🔍 Partner found:', partner.company_name)

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
      .eq('email_type', 'survey-submitted')
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

    // Note: We don't need to save data here - it's already saved by the survey form
    // The v2 API just processes the existing data for email sending

    // Initialize Field Mapping Engine
    console.log('🔧 Initializing FieldMappingEngine...')
    const fieldMappingEngine = new FieldMappingEngine(supabase, partner.user_id, boilerCategory.service_category_id)
    
    // Get template data using field mappings
    console.log('📊 Mapping customer template data...')
    const customerTemplateData = await fieldMappingEngine.mapSubmissionToTemplateFields(finalSubmissionId, 'survey-submitted', 'customer')
    console.log('📊 Customer template data keys:', Object.keys(customerTemplateData))
    console.log('📊 Customer template data values:', customerTemplateData)
    console.log('📊 Customer template data full object:', JSON.stringify(customerTemplateData, null, 2))
    
    console.log('📊 Mapping admin template data...')
    const adminTemplateData = await fieldMappingEngine.mapSubmissionToTemplateFields(finalSubmissionId, 'survey-submitted', 'admin')
    console.log('📊 Admin template data keys:', Object.keys(adminTemplateData))
    console.log('📊 Admin template data values:', adminTemplateData)
    console.log('📊 Admin template data full object:', JSON.stringify(adminTemplateData, null, 2))

    // Debug: Check what field mappings exist for this partner/email type
    console.log('🔍 Checking existing field mappings...')
    const { data: debugMappings, error: mappingsError } = await supabase
      .from('email_field_mappings')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'survey-submitted')
      .order('created_at', { ascending: true })

    if (mappingsError) {
      console.error('❌ Field mappings query error:', mappingsError)
    } else {
      console.log(`📋 Found ${debugMappings?.length || 0} field mappings for survey-submitted`)
      if (debugMappings && debugMappings.length > 0) {
        console.log('📋 Field mappings details:', debugMappings.map((m: any) => ({
          id: m.id,
          template_field_name: m.template_field_name,
          database_source: m.database_source,
          database_path: m.database_path,
          template_type: m.template_type,
          is_active: m.is_active,
          is_required: m.is_required
        })))
      } else {
        console.log('⚠️ No field mappings found for survey-submitted email type')
      }
    }

    // Get raw submission data as fallback
    const { data: rawSubmissionData } = await supabase
      .from('lead_submission_data')
      .select('*')
      .eq('submission_id', finalSubmissionId)
      .single()
    
    console.log('📊 Raw submission data available:', !!rawSubmissionData)
    if (rawSubmissionData) {
      console.log('📊 Raw submission data keys:', Object.keys(rawSubmissionData))
      if (rawSubmissionData.survey_data) {
        console.log('📊 Survey data structure:', JSON.stringify(rawSubmissionData.survey_data, null, 2))
      }
      if (rawSubmissionData.form_submissions) {
        console.log('📊 Form submissions structure:', JSON.stringify(rawSubmissionData.form_submissions, null, 2))
      }
      if (rawSubmissionData.quote_data) {
        console.log('📊 Quote data structure:', JSON.stringify(rawSubmissionData.quote_data, null, 2))
      }
      if (rawSubmissionData.checkout_data) {
        console.log('📊 Checkout data structure:', JSON.stringify(rawSubmissionData.checkout_data, null, 2))
      }
      if (rawSubmissionData.form_answers) {
        console.log('📊 Form answers structure:', JSON.stringify(rawSubmissionData.form_answers, null, 2))
      }
    }

    // Get admin email from PartnerSettings
    let adminEmail: string | undefined = undefined
    const { data: partnerSettings } = await supabase
      .from('PartnerSettings')
      .select('admin_email')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .single()

    adminEmail = partnerSettings?.admin_email || undefined
    console.log('📧 Admin email configured:', !!adminEmail)

    const toAddress: string = email || smtp.SMTP_FROM
    if (!toAddress) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
    }

    // Get email templates from database
    console.log('📧 Getting email templates...')
    const { data: customerTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'survey-submitted')
      .eq('recipient_type', 'customer')
      .eq('is_active', true)
      .single()

    const { data: adminTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'survey-submitted')
      .eq('recipient_type', 'admin')
      .eq('is_active', true)
      .single()

    console.log('📧 Customer template found:', !!customerTemplate)
    console.log('📧 Admin template found:', !!adminTemplate)

    // Process templates with mapped data
    const processedCustomerTemplate = customerTemplate ?
      await fieldMappingEngine.processEmailTemplate(customerTemplate, customerTemplateData) : null

    const processedAdminTemplate = adminTemplate ?
      await fieldMappingEngine.processEmailTemplate(adminTemplate, adminTemplateData) : null

    console.log('📧 Processed customer template:', !!processedCustomerTemplate)
    console.log('📧 Processed admin template:', !!processedAdminTemplate)

    try {
      // Send customer email
      if (processedCustomerTemplate) {
        console.log('📤 Sending customer email...')
        await transporter.sendMail({
          from: smtp.SMTP_FROM || smtp.SMTP_USER,
          to: toAddress,
          subject: processedCustomerTemplate.subject,
          text: processedCustomerTemplate.text,
          html: processedCustomerTemplate.html,
        })
        console.log('✅ Customer email sent successfully')
      } else {
        console.log('⚠️ No processed customer template found, skipping customer email')
      }

      // Send admin email if admin email is configured and template exists
      if (adminEmail && processedAdminTemplate) {
        console.log('📤 Sending admin email...')
        await transporter.sendMail({
          from: smtp.SMTP_FROM || smtp.SMTP_USER,
          to: adminEmail,
          subject: processedAdminTemplate.subject,
          text: processedAdminTemplate.text,
          html: processedAdminTemplate.html,
        })
        console.log('✅ Admin email sent successfully')
      } else {
        console.log('⚠️ No admin email or processed template, skipping admin email')
      }
    } catch (sendErr: any) {
      console.error('❌ SMTP send failed:', sendErr)
      return NextResponse.json({ 
        error: 'SMTP send failed', 
        details: sendErr?.message || String(sendErr),
        debug: {
          submissionId: finalSubmissionId,
          customerTemplateData: customerTemplateData,
          adminTemplateData: adminTemplateData,
          rawSubmissionData: rawSubmissionData,
          customerTemplate: !!customerTemplate,
          adminTemplate: !!adminTemplate,
          processedCustomerTemplate: !!processedCustomerTemplate,
          processedAdminTemplate: !!processedAdminTemplate,
          adminEmail: adminEmail,
          smtpError: sendErr?.message || String(sendErr)
        }
      }, { status: 400 })
    }

    console.log('🎉 All emails sent successfully!')
    return NextResponse.json({ 
      success: true,
      debug: {
        submissionId: finalSubmissionId,
        partnerId: partner.user_id,
        serviceCategoryId: boilerCategory.service_category_id,
        customerTemplateData: customerTemplateData,
        adminTemplateData: adminTemplateData,
        rawSubmissionData: rawSubmissionData,
        customerTemplate: !!customerTemplate,
        adminTemplate: !!adminTemplate,
        processedCustomerTemplate: !!processedCustomerTemplate,
        processedAdminTemplate: !!processedAdminTemplate,
        adminEmail: adminEmail,
        emailSent: {
          customer: !!processedCustomerTemplate,
          admin: !!(adminEmail && processedAdminTemplate)
        },
        fieldMappings: debugMappings?.map((m: any) => ({
          id: m.id,
          template_field_name: m.template_field_name,
          database_source: m.database_source,
          database_path: m.database_path,
          template_type: m.template_type,
          is_active: m.is_active,
          is_required: m.is_required
        })) || []
      }
    })
  } catch (error: any) {
    console.error('❌ survey-submitted-v2 error:', error)
    return NextResponse.json({ 
      error: 'Failed to send survey submitted email', 
      details: error?.message || String(error),
      debug: {
        submissionId: finalSubmissionId || 'unknown',
        error: error?.message || String(error),
        stack: error?.stack
      }
    }, { status: 500 })
  }
}
