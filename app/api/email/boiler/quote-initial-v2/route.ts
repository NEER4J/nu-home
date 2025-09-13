import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { decryptObject } from '@/lib/encryption'
import { resolvePartnerByHostname } from '@/lib/partner'
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
  if (!merged.SMTP_PASSWORD && raw?.password) merged.SMTP_PASSWORD = (raw.password ?? raw.password) as string
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
  console.log('🚀🚀🚀 quote-initial-v2 API called 🚀🚀🚀')
  try {
    const body = await request.json().catch(() => ({}))
    console.log('📧📧📧 Request body:', JSON.stringify(body, null, 2))
    const { submissionId, subdomain: bodySubdomain } = body || {}

    if (!submissionId) {
      console.error('❌ Missing submissionId')
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
    }

    console.log('✅ submissionId found:', submissionId)

    const hostname = parseHostname(request, bodySubdomain)
    console.log('🌐 Parsed hostname:', hostname);
    
    if (!hostname) {
      console.error('❌ Missing hostname')
      return NextResponse.json({ error: 'Missing hostname' }, { status: 400 })
    }

    const supabase = await createClient()
    const partner = await resolvePartnerByHostname(supabase, hostname)
    console.log('👤 Partner found:', partner ? 'Yes' : 'No')
    if (!partner) {
      console.error('❌ Partner not found for hostname:', hostname)
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

    try { 
      await transporter.verify() 
    } catch (verifyErr: any) {
      return NextResponse.json({ error: 'SMTP verification failed', details: verifyErr?.message || String(verifyErr) }, { status: 400 })
    }

    // Get service category ID for boiler
    const { data: boilerCategory } = await supabase
      .from('ServiceCategories')
      .select('service_category_id')
      .eq('slug', 'boiler')
      .single()

    console.log('🏢 Boiler category found:', boilerCategory ? 'Yes' : 'No')
    if (!boilerCategory) {
      console.error('❌ Boiler service category not found')
      return NextResponse.json({ error: 'Boiler service category not found' }, { status: 400 })
    }

    console.log('🔧 Partner ID:', partner.user_id)
    console.log('🔧 Service Category ID:', boilerCategory.service_category_id)

    // Check if field mappings exist, if not, copy defaults
    const { data: existingMappings } = await supabase
      .from('email_field_mappings')
      .select('id')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'quote-initial')
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

    // Use the new field mapping engine
    console.log('🔧 Initializing FieldMappingEngine...')
    const fieldMappingEngine = new FieldMappingEngine(supabase, partner.user_id, boilerCategory.service_category_id)
    
    // Get template data using field mappings
    console.log('📊 Mapping customer template data...')
    const customerTemplateData = await fieldMappingEngine.mapSubmissionToTemplateFields(submissionId, 'quote-initial', 'customer')
    console.log('📊 Customer template data keys:', Object.keys(customerTemplateData))
    console.log('📊 Customer template data values:', customerTemplateData)
    
    // Debug: Check if form_answers is in the mapped data
    console.log('📊 form_answers in mapped data:', !!customerTemplateData.form_answers)
    if (customerTemplateData.form_answers) {
      console.log('📊 form_answers data:', customerTemplateData.form_answers)
    }
    
    console.log('📊 Mapping admin template data...')
    const adminTemplateData = await fieldMappingEngine.mapSubmissionToTemplateFields(submissionId, 'quote-initial', 'admin')
    console.log('📊 Admin template data keys:', Object.keys(adminTemplateData))
    console.log('📊 Admin template data values:', adminTemplateData)

    // Get raw submission data as fallback
    const { data: rawSubmissionData } = await supabase
      .from('lead_submission_data')
      .select('*')
      .eq('submission_id', submissionId)
      .single()
    
    console.log('📊 Raw submission data available:', !!rawSubmissionData)
    if (rawSubmissionData) {
      console.log('📊 Raw submission data keys:', Object.keys(rawSubmissionData))
      if (rawSubmissionData.quote_data) {
        console.log('📊 Quote data structure:', JSON.stringify(rawSubmissionData.quote_data, null, 2))
      }
    }

    // Get email templates from database
    const { data: customerTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'quote-initial')
      .eq('recipient_type', 'customer')
      .eq('is_active', true)
      .single()

    const { data: adminTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'quote-initial')
      .eq('recipient_type', 'admin')
      .eq('is_active', true)
      .single()

    // Process templates with mapped data
    console.log('🔧 Processing customer template...')
    const processedCustomerTemplate = customerTemplate ? 
      await fieldMappingEngine.processEmailTemplate(customerTemplate, customerTemplateData) : null
    
    console.log('🔧 Processing admin template...')
    const processedAdminTemplate = adminTemplate ? 
      await fieldMappingEngine.processEmailTemplate(adminTemplate, adminTemplateData) : null

    // Debug: Show what fields were populated
    console.log('📊 FINAL FIELD MAPPING RESULTS:')
    console.log('📊 Customer Template Data:', JSON.stringify(customerTemplateData, null, 2))
    console.log('📊 Admin Template Data:', JSON.stringify(adminTemplateData, null, 2))
    
    if (processedCustomerTemplate) {
      console.log('📊 Processed Customer Template:')
      console.log('📊 Subject:', processedCustomerTemplate.subject)
      console.log('📊 HTML Preview (first 200 chars):', processedCustomerTemplate.html.substring(0, 200))
    }
    
    if (processedAdminTemplate) {
      console.log('📊 Processed Admin Template:')
      console.log('📊 Subject:', processedAdminTemplate.subject)
      console.log('📊 HTML Preview (first 200 chars):', processedAdminTemplate.html.substring(0, 200))
    }

    // Send customer email
    if (processedCustomerTemplate) {
      // Get customer email from mapped data only
      const customerEmail = customerTemplateData.email || customerTemplateData.customer_email
      
      console.log('📧 Customer email to send to:', customerEmail)
      
      if (customerEmail) {
        try {
          await transporter.sendMail({
            from: smtp.SMTP_FROM || smtp.SMTP_USER,
            to: customerEmail,
            subject: processedCustomerTemplate.subject,
            text: processedCustomerTemplate.text,
            html: processedCustomerTemplate.html,
          })
          console.log('✅ Customer email sent successfully to:', customerEmail)
        } catch (sendErr: any) {
          console.error('❌ Failed to send customer email:', sendErr?.message || String(sendErr))
        }
      } else {
        console.error('❌ No customer email found in mapped data')
      }
    } else {
      console.log('⚠️ No customer template found, skipping customer email')
    }

    // Get admin email from partner settings
    let adminEmail: string | undefined = undefined
    const { data: partnerSettings } = await supabase
      .from('PartnerSettings')
      .select('admin_email')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .single()
    adminEmail = partnerSettings?.admin_email || undefined

    console.log('📧 Admin email configured:', adminEmail)

    // Send admin email if admin template exists and admin email is configured
    console.log('🔍 Admin email check:')
    console.log('🔍 processedAdminTemplate exists:', !!processedAdminTemplate)
    console.log('🔍 adminEmail exists:', !!adminEmail)
    console.log('🔍 adminEmail value:', adminEmail)
    
    if (processedAdminTemplate && adminEmail) {
      try {
        await transporter.sendMail({
          from: smtp.SMTP_FROM || smtp.SMTP_USER,
          to: adminEmail,
          subject: processedAdminTemplate.subject,
          text: processedAdminTemplate.text,
          html: processedAdminTemplate.html,
        })
        console.log('✅ Admin email sent successfully to:', adminEmail)
      } catch (sendErr: any) {
        console.error('❌ Failed to send admin email:', sendErr?.message || String(sendErr))
      }
    } else {
      console.log('⚠️ Admin email conditions not met:')
      console.log('⚠️ - processedAdminTemplate:', !!processedAdminTemplate)
      console.log('⚠️ - adminEmail:', !!adminEmail)
    }

    return NextResponse.json({ 
      success: true, 
      submissionId,
      customerEmailSent: !!processedCustomerTemplate,
      adminEmailSent: !!processedAdminTemplate,
      debug: {
        customerTemplateDataKeys: Object.keys(customerTemplateData),
        customerTemplateData: customerTemplateData, // Show ALL mapped data
        adminTemplateData: adminTemplateData, // Show ALL admin mapped data
        rawSubmissionDataKeys: rawSubmissionData ? Object.keys(rawSubmissionData) : [],
        customerEmail: customerTemplateData.email || customerTemplateData.customer_email,
        adminEmail: adminEmail,
        fieldMappingsCount: 'N/A' // Will be shown in console logs
      }
    })
  } catch (error: any) {
    console.error('Quote initial v2 email error:', error)
    return NextResponse.json({ error: 'Failed to send quote initial email', details: error?.message || String(error) }, { status: 500 })
  }
}