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
  try {
    const body = await request.json().catch(() => ({}))
    const {
      submissionId,
      subdomain: bodySubdomain,
      is_iframe,
      quoteLink,
      // Accept quote link data for initial quote emails
      quote_link
    } = body || {}

    // Use either quoteLink or quote_link (for backward compatibility)
    const finalQuoteLink = quoteLink || quote_link

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
    }

    const hostname = parseHostname(request, bodySubdomain)

    if (!hostname) {
      return NextResponse.json({ error: 'Missing hostname' }, { status: 400 })
    }

    const supabase = await createClient()
    const partner = await resolvePartnerByHostname(supabase, hostname)
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

    if (!boilerCategory) {
      return NextResponse.json({ error: 'Boiler service category not found' }, { status: 400 })
    }

    // Check if field mappings exist, if not, copy defaults
    const { data: existingMappings } = await supabase
      .from('email_field_mappings')
      .select('id')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'quote-initial')
      .limit(1)

    if (!existingMappings || existingMappings.length === 0) {
      const { error: copyError } = await supabase.rpc('copy_default_field_mappings', {
        p_partner_id: partner.user_id,
        p_service_category_id: boilerCategory.service_category_id
      })

      if (copyError) {
        return NextResponse.json({ error: 'Failed to setup field mappings' }, { status: 500 })
      }
    }

    // IMPORTANT: Store quote link FIRST before field mapping
    // Track quote link storage result
    let quoteLinkStored = false
    let quoteLinkError = null
    let mainPageUrl = null
    let effectiveQuoteLink = finalQuoteLink

    // Store quote link information if provided
    if (finalQuoteLink) {
      try {
        // Get partner's main_page_url for iframe context
        if (is_iframe === true || is_iframe === 'true') {
          const { data: partnerSettings } = await supabase
            .from('PartnerSettings')
            .select('main_page_url')
            .eq('partner_id', partner.user_id)
            .eq('service_category_id', boilerCategory.service_category_id)
            .single()

          mainPageUrl = partnerSettings?.main_page_url || null
        }

        // Determine the appropriate quote link based on iframe context
        if (is_iframe === true || is_iframe === 'true') {
          if (mainPageUrl) {
            // Append submission ID to main_page_url for iframe context
            const url = new URL(mainPageUrl)
            url.searchParams.set('submission', submissionId)
            effectiveQuoteLink = url.toString()
          } else {
            // Fallback to original link if no main_page_url
            effectiveQuoteLink = finalQuoteLink
          }
        } else {
          // Use original link if not in iframe
          effectiveQuoteLink = finalQuoteLink
        }

        // Get existing lead_submission_data
        const { data: existingSubmissionData } = await supabase
          .from('lead_submission_data')
          .select('quote_data')
          .eq('submission_id', submissionId)
          .single()

        if (existingSubmissionData) {
          // Update existing quote_data with quote link information
          const updatedQuoteData = {
            ...existingSubmissionData.quote_data,
            quote_link: effectiveQuoteLink,
            is_iframe: is_iframe || false,
            main_page_url: mainPageUrl,
            original_quote_link: finalQuoteLink,
            conditional_quote_link: (is_iframe === true || is_iframe === 'true') ? effectiveQuoteLink : finalQuoteLink
          }

          const { error: updateError } = await supabase
            .from('lead_submission_data')
            .update({
              quote_data: updatedQuoteData,
              last_activity_at: new Date().toISOString()
            })
            .eq('submission_id', submissionId)

          if (!updateError) {
            quoteLinkStored = true
          } else {
            quoteLinkError = updateError.message
          }
        }
      } catch (storeError: any) {
        quoteLinkError = storeError.message
      }
    }

    // NOW use the field mapping engine (after quote_link is stored)
    const fieldMappingEngine = new FieldMappingEngine(supabase, partner.user_id, boilerCategory.service_category_id)

    // Get template data using field mappings
    const customerTemplateData = await fieldMappingEngine.mapSubmissionToTemplateFields(submissionId, 'quote-initial', 'customer')
    const adminTemplateData = await fieldMappingEngine.mapSubmissionToTemplateFields(submissionId, 'quote-initial', 'admin')

    // Get or create lead_submission_data record
    let { data: rawSubmissionData } = await supabase
      .from('lead_submission_data')
      .select('*')
      .eq('submission_id', submissionId)
      .single()

    // If no lead_submission_data exists, create it from partner_leads data
    if (!rawSubmissionData) {
      // Get partner_leads data
      const { data: partnerLead } = await supabase
        .from('partner_leads')
        .select('*')
        .eq('submission_id', submissionId)
        .single()

      if (partnerLead) {

        // Create lead_submission_data record
        const { data: newSubmissionData, error: createError } = await supabase
          .from('lead_submission_data')
          .insert({
            submission_id: submissionId,
            partner_id: partnerLead.assigned_partner_id,
            service_category_id: partnerLead.service_category_id,
            created_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            quote_data: {
              contact_details: {
                first_name: partnerLead.first_name,
                last_name: partnerLead.last_name,
                email: partnerLead.email,
                phone: partnerLead.phone,
                postcode: partnerLead.postcode
              },
              selected_address: {
                address_line_1: partnerLead.address_line_1,
                address_line_2: partnerLead.address_line_2,
                street_name: partnerLead.street_name,
                street_number: partnerLead.street_number,
                building_name: partnerLead.building_name,
                sub_building: partnerLead.sub_building,
                county: partnerLead.county,
                country: partnerLead.country,
                postcode: partnerLead.postcode,
                formatted_address: partnerLead.formatted_address
              },
              form_answers: partnerLead.form_answers || {}
            }
          })
          .select()
          .single()

        if (!createError) {
          rawSubmissionData = newSubmissionData
        }
      }
    }

    // Quote link storage was moved earlier in the code before field mapping

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
    const processedCustomerTemplate = customerTemplate ?
      await fieldMappingEngine.processEmailTemplate(customerTemplate, customerTemplateData) : null

    const processedAdminTemplate = adminTemplate ?
      await fieldMappingEngine.processEmailTemplate(adminTemplate, adminTemplateData) : null

    // Track email sending results
    let customerEmailSent = false
    let adminEmailSent = false
    let emailErrors = []

    // Send customer email
    if (processedCustomerTemplate) {
      // Get customer email from mapped data only
      const customerEmail = customerTemplateData.email || customerTemplateData.customer_email

      if (customerEmail) {
        try {
          await transporter.sendMail({
            from: smtp.SMTP_FROM || smtp.SMTP_USER,
            to: customerEmail,
            subject: processedCustomerTemplate.subject,
            text: processedCustomerTemplate.text,
            html: processedCustomerTemplate.html,
          })
          customerEmailSent = true
        } catch (sendErr: any) {
          emailErrors.push(`Customer email failed: ${sendErr?.message || String(sendErr)}`)
        }
      } else {
        emailErrors.push('No customer email found in mapped data')
      }
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

    // Send admin email if admin template exists and admin email is configured
    if (processedAdminTemplate && adminEmail) {
      try {
        await transporter.sendMail({
          from: smtp.SMTP_FROM || smtp.SMTP_USER,
          to: adminEmail,
          subject: processedAdminTemplate.subject,
          text: processedAdminTemplate.text,
          html: processedAdminTemplate.html,
        })
        adminEmailSent = true
      } catch (sendErr: any) {
        emailErrors.push(`Admin email failed: ${sendErr?.message || String(sendErr)}`)
      }
    }

    return NextResponse.json({
      success: true,
      submissionId,
      customerEmailSent: customerEmailSent,
      adminEmailSent: adminEmailSent,
      debug: {
        // Quote link debug info
        quoteLink: finalQuoteLink,
        quoteLinkProvided: !!finalQuoteLink,
        quoteLinkStored: quoteLinkStored,
        quoteLinkError: quoteLinkError,
        is_iframe: is_iframe,
        main_page_url: mainPageUrl,
        effective_quote_link: effectiveQuoteLink,
        conditional_quote_link: (is_iframe === true || is_iframe === 'true') ? mainPageUrl : finalQuoteLink,
        rawSubmissionDataExists: !!rawSubmissionData,
        quoteLinkStorageAttempted: !!finalQuoteLink,

        // Submission data debug
        rawSubmissionDataId: rawSubmissionData?.id,
        currentQuoteData: rawSubmissionData?.quote_data,

        // Email debug
        customerEmail: customerTemplateData.email || customerTemplateData.customer_email,
        adminEmail: adminEmail,
        emailErrors: emailErrors,

        // Request debug
        requestBody: body,
        requestBodyKeys: Object.keys(body || {}),

        // Frontend data debug
        quoteLink_raw: quoteLink,
        quote_link_raw: quote_link,
        is_iframe_raw: is_iframe,
        submissionId_raw: submissionId,
        subdomain_raw: bodySubdomain,

        // Environment debug
        hostname: hostname,
        partnerId: partner?.user_id,
        serviceCategoryId: boilerCategory?.service_category_id,

        // Field mapping debug
        customerTemplateData: customerTemplateData,
        customerTemplateDataKeys: Object.keys(customerTemplateData),
        customerHasQuoteLink: 'quote_link' in customerTemplateData,
        customerQuoteLinkValue: customerTemplateData.quote_link,

        adminTemplateData: adminTemplateData,
        adminTemplateDataKeys: Object.keys(adminTemplateData),
        adminHasQuoteLink: 'quote_link' in adminTemplateData,
        adminQuoteLinkValue: adminTemplateData.quote_link,

        // Field mapping engine debug logs
        fieldMappingEngineDebugLogs: fieldMappingEngine.debugLogs
      }
    })
  } catch (error: any) {
    console.error('Quote initial v2 email error:', error)
    return NextResponse.json({ error: 'Failed to send quote initial email', details: error?.message || String(error) }, { status: 500 })
  }
}