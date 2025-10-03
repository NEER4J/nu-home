import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { decryptObject } from '@/lib/encryption'
import { resolvePartnerByHostname } from '@/lib/partner'
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
  console.log('🚀🚀🚀 save-quote-v2 API called 🚀🚀🚀')
  try {
    const body = await request.json().catch(() => ({}))
    console.log('📧📧📧 Request body:', JSON.stringify(body, null, 2))
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
      quoteData,
      quoteLink,
      saveType,
      detailedProductData,
      detailedAllProductsData,
      
      // Legacy fields for backward compatibility
      first_name, 
      last_name, 
      submission_id, 
      products, 
      subdomain: bodySubdomain,
      is_iframe
    } = body || {}

    // Use new fields if available, fallback to legacy fields
    const finalFirstName = firstName || first_name
    const finalLastName = lastName || last_name
    const finalSubmissionId = submissionId || submission_id
    const finalQuoteData = quoteData || products

    if (!finalSubmissionId) {
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

    // Extract user info from request data for saving
    const userInfo = {
      first_name: finalFirstName || '',
      last_name: finalLastName || '',
      email: email || '',
      phone: phone || null,
      postcode: postcode || null
    }

    // Extract products data from request data
    const productsData = finalQuoteData || []

    // Send all product data without any filtering for testing
    const filterProductFields = (product: any) => {
      if (!product) return null

      // Return the complete product object with all fields
      return product
    }

    const detailedProductsData = saveType === 'single_product'
      ? (detailedProductData ? [filterProductFields(detailedProductData)] : [])
      : (detailedAllProductsData || []).map(filterProductFields).filter(Boolean)

    console.log('📊 Extracted user info:', userInfo)
    console.log('📊 Extracted products count:', Array.isArray(productsData) ? productsData.length : 0)
    console.log('📊 Extracted detailed products count:', Array.isArray(detailedProductsData) ? detailedProductsData.length : 0)
    console.log('📧 Quote link info:', {
      quoteLink: quoteLink || 'not provided',
      is_iframe: is_iframe || false,
      conditional_quote_link: (is_iframe === true || is_iframe === 'true') ? 'hidden (iframe)' : (quoteLink || 'not provided')
    })

    // SAVE FORM SUBMISSION DATA TO DATABASE FIRST (before email processing)
    console.log('💾 Saving save quote data to lead_submission_data FIRST...')
    try {
      // Get existing data
      const { data: existingData } = await supabase
        .from('lead_submission_data')
        .select('form_submissions, save_quote_data')
        .eq('submission_id', finalSubmissionId)
        .single()

      const existingFormSubmissions = Array.isArray(existingData?.form_submissions) ? existingData.form_submissions : []
      const existingSaveQuoteData = Array.isArray(existingData?.save_quote_data) ? existingData.save_quote_data : []

      // Create simplified form submission entry (detailed data is in save_quote_data)
      const newFormSubmission = {
        form_type: 'save_quote',
        submitted_at: new Date().toISOString(),
        submission_id: finalSubmissionId,
        total_questions: 4, // firstName, lastName, email, phone
        data_completeness: 4, // All fields are required
          form_data: {
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            email: userInfo.email,
            phone: userInfo.phone,
            postcode: userInfo.postcode,
            products_count: Array.isArray(productsData) ? productsData.length : 0,
            save_type: saveType || 'all_products'
          }
      }

      // Create save quote data entry matching the expected format
      const newSaveQuoteData = {
        form_type: 'save_quote',
        submitted_at: new Date().toISOString(),
        submission_id: finalSubmissionId,
        user_info: userInfo,
        products: productsData || [],
        products_count: Array.isArray(productsData) ? productsData.length : 0,
        save_type: saveType || 'all_products',
        detailed_products_data: detailedProductsData,
        total_products_viewed: saveType === 'single_product'
          ? (detailedProductData ? 1 : 0)
          : (Array.isArray(detailedAllProductsData) ? detailedAllProductsData.length : (Array.isArray(productsData) ? productsData.length : 0)),
        save_quote_opened_at: new Date().toISOString(),
        action: saveType === 'single_product' ? 'save_single_product_quote' : 'save_all_products_quote',
        // Add quote link and iframe context for conditional email content
        quote_link: quoteLink || null,
        is_iframe: is_iframe || false,
        // Conditional quote link - append submission ID to main_page_url if iframe, otherwise use original
        conditional_quote_link: (is_iframe === true || is_iframe === 'true') ?
          (() => {
            // If iframe and we have a quote link, try to append submission ID
            if (quoteLink) {
              try {
                const url = new URL(quoteLink)
                // Check if this looks like a main page URL (not already containing submission)
                if (!url.searchParams.has('submission')) {
                  url.searchParams.set('submission', finalSubmissionId)
                  return url.toString()
                }
                return quoteLink
              } catch {
                return quoteLink
              }
            }
            return null
          })() : (quoteLink || null)
      }

      // Add to existing arrays
      const updatedFormSubmissions = [...existingFormSubmissions, newFormSubmission]
      const updatedSaveQuoteData = [...existingSaveQuoteData, newSaveQuoteData]

      // Update the lead_submission_data record
      const { error: updateError } = await supabase
        .from('lead_submission_data')
        .update({
          form_submissions: updatedFormSubmissions,
          save_quote_data: updatedSaveQuoteData,
          last_activity_at: new Date().toISOString()
        })
        .eq('submission_id', finalSubmissionId)

      if (updateError) {
        console.error('❌ Error saving save quote data:', updateError)
        throw new Error('Failed to save quote data: ' + updateError.message)
      } else {
        console.log('✅ Successfully saved save_quote data to lead_submission_data FIRST')
        console.log('📊 Saved save quote data structure:', JSON.stringify(newSaveQuoteData, null, 2))
      }
    } catch (formSubmissionError) {
      console.error('❌ Error saving form submission data:', formSubmissionError)
      // Fail the request if we can't save the data first
      throw new Error('Failed to save quote data: ' + formSubmissionError)
    }

    // NOW process emails with field mappings (after data is saved)
    console.log('🔧 Initializing FieldMappingEngine...')
    const fieldMappingEngine = new FieldMappingEngine(supabase, partner.user_id, boilerCategory.service_category_id)

    // Get template data using field mappings
    console.log('📊 Mapping customer template data...')
    const customerTemplateData = await fieldMappingEngine.mapSubmissionToTemplateFields(finalSubmissionId, 'save-quote', 'customer')
    console.log('📊 Customer template data keys:', Object.keys(customerTemplateData))
    console.log('📊 Customer template data values:', customerTemplateData)

    console.log('📊 Mapping admin template data...')
    const adminTemplateData = await fieldMappingEngine.mapSubmissionToTemplateFields(finalSubmissionId, 'save-quote', 'admin')
    console.log('📊 Admin template data keys:', Object.keys(adminTemplateData))
    console.log('📊 Admin template data values:', adminTemplateData)

    // Capture debug logs from field mapping engine
    const fieldMappingDebugLogs = fieldMappingEngine.debugLogs

    // Debug: Check what the field mapping engine is actually doing
    console.log('🔍 FIELD MAPPING ENGINE DEBUG:')
    console.log('🔍 - Partner ID:', partner.user_id)
    console.log('🔍 - Service Category ID:', boilerCategory.service_category_id)
    console.log('🔍 - Email Type: save-quote')
    console.log('🔍 - Customer template data has product_name:', 'product_name' in customerTemplateData)
    console.log('🔍 - Customer template data has detailed_products_data:', 'detailed_products_data' in customerTemplateData)
    console.log('🔍 - Customer product_name value:', customerTemplateData.product_name)
    console.log('🔍 - Customer detailed_products_data type:', typeof customerTemplateData.detailed_products_data)

    // Get raw submission data as fallback
    const { data: rawSubmissionData } = await supabase
      .from('lead_submission_data')
      .select('*')
      .eq('submission_id', finalSubmissionId)
      .single()

    console.log('📊 Raw submission data available:', !!rawSubmissionData)
    if (rawSubmissionData) {
      console.log('📊 Raw submission data keys:', Object.keys(rawSubmissionData))
      if (rawSubmissionData.save_quote_data) {
        console.log('📊 Save quote data structure:', JSON.stringify(rawSubmissionData.save_quote_data, null, 2))
      }
    }


    // Get email templates from database
    const { data: customerTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'save-quote')
      .eq('recipient_type', 'customer')
      .eq('is_active', true)
      .single()

    const { data: adminTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'save-quote')
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

    // Enhanced debugging for save_quote_data
    console.log('🔍 DETAILED SAVE_QUOTE_DATA DEBUG:')
    if (rawSubmissionData?.save_quote_data) {
      console.log('🔍 save_quote_data structure:', JSON.stringify(rawSubmissionData.save_quote_data, null, 2))
      console.log('🔍 save_quote_data length:', rawSubmissionData.save_quote_data.length)
      
      if (rawSubmissionData.save_quote_data.length > 0) {
        const latestSaveQuote = rawSubmissionData.save_quote_data[rawSubmissionData.save_quote_data.length - 1]
        console.log('🔍 Latest save_quote entry:', JSON.stringify(latestSaveQuote, null, 2))
        
        if (latestSaveQuote.products) {
          console.log('🔍 Products in save_quote:', JSON.stringify(latestSaveQuote.products, null, 2))
        }
        
        if (latestSaveQuote.detailed_products_data) {
          console.log('🔍 Detailed products in save_quote:', JSON.stringify(latestSaveQuote.detailed_products_data, null, 2))
          console.log('🔍 Detailed products count:', latestSaveQuote.detailed_products_data.length)
          if (latestSaveQuote.detailed_products_data.length > 0) {
            console.log('🔍 First detailed product:', JSON.stringify(latestSaveQuote.detailed_products_data[0], null, 2))
            console.log('🔍 First product name:', latestSaveQuote.detailed_products_data[0]?.name)
          }
        }
        
        if (latestSaveQuote.user_info) {
          console.log('🔍 User info in save_quote:', JSON.stringify(latestSaveQuote.user_info, null, 2))
        }
      }
    } else {
      console.log('🔍 No save_quote_data found in raw submission data')
    }

    // Debug field mappings being used
    console.log('🔍 FIELD MAPPINGS DEBUG:')
    console.log('🔍 Query parameters:', {
      partner_id: partner.user_id,
      service_category_id: boilerCategory.service_category_id,
      email_type: 'save-quote'
    })
    
    const { data: customerMappings, error: customerMappingsError } = await supabase
      .from('email_field_mappings')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'save-quote')
      .eq('is_active', true)

    const { data: adminMappings, error: adminMappingsError } = await supabase
      .from('email_field_mappings')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('email_type', 'save-quote')
      .eq('is_active', true)

    console.log('🔍 Customer mappings query result:', { data: customerMappings, error: customerMappingsError })
    console.log('🔍 Admin mappings query result:', { data: adminMappings, error: adminMappingsError })

    // Check if there are any field mappings at all for this partner/service
    const { data: allMappings } = await supabase
      .from('email_field_mappings')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', boilerCategory.service_category_id)
      .eq('is_active', true)

    console.log('🔍 All active mappings for this partner/service:', allMappings?.map(m => ({
      template_field_name: m.template_field_name,
      email_type: m.email_type,
      recipient_type: m.recipient_type,
      database_source: m.database_source
    })))

    console.log('🔍 Customer field mappings:', customerMappings?.map(m => ({
      template_field_name: m.template_field_name,
      database_source: m.database_source,
      database_path: m.database_path,
      template_type: m.template_type,
      html_template: m.html_template ? 'HTML template present' : 'No HTML template'
    })))

    console.log('🔍 Admin field mappings:', adminMappings?.map(m => ({
      template_field_name: m.template_field_name,
      database_source: m.database_source,
      database_path: m.database_path,
      template_type: m.template_type,
      html_template: m.html_template ? 'HTML template present' : 'No HTML template'
    })))

    // Debug specific field mappings that might be causing issues
    const detailedProductsMapping = [...(customerMappings || []), ...(adminMappings || [])]
      .find(m => m.template_field_name === 'detailed_products_data')
    
    if (detailedProductsMapping) {
      console.log('🔍 DETAILED_PRODUCTS_DATA MAPPING FOUND:')
      console.log('🔍 - Database Source:', detailedProductsMapping.database_source)
      console.log('🔍 - Database Path:', detailedProductsMapping.database_path)
      console.log('🔍 - Template Type:', detailedProductsMapping.template_type)
      console.log('🔍 - HTML Template Type:', detailedProductsMapping.html_template_type)
      console.log('🔍 - Has HTML Template:', !!detailedProductsMapping.html_template)
      if (detailedProductsMapping.html_template) {
        console.log('🔍 - HTML Template Preview:', detailedProductsMapping.html_template.substring(0, 200))
      }
    } else {
      console.log('🔍 No detailed_products_data mapping found')
    }

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

    // Get notification settings for this email type
    const notificationSettings = await getNotificationSettingsForType(
      supabase,
      partner.user_id,
      boilerCategory.service_category_id,
      'save-quote'
    )
    console.log('📧 Notification settings:', {
      admin: { enabled: notificationSettings.admin.enabled, emails: notificationSettings.admin.emails.length },
      customer: { enabled: notificationSettings.customer.enabled },
      ghl: { enabled: notificationSettings.ghl.enabled }
    })

    let customerEmailSent = false
    let adminEmailSent = false
    let emailErrors: string[] = []

    // Send customer email if enabled
    if (notificationSettings.customer.enabled && processedCustomerTemplate) {
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
          customerEmailSent = true
        } catch (sendErr: any) {
          console.error('❌ Failed to send customer email:', sendErr?.message || String(sendErr))
          emailErrors.push(`Customer email: ${sendErr?.message || String(sendErr)}`)
        }
      } else {
        console.error('❌ No customer email found in mapped data')
      }
    } else {
      if (!notificationSettings.customer.enabled) {
        console.log('⚠️ Customer email disabled, skipping')
      } else {
        console.log('⚠️ No customer template found, skipping customer email')
      }
    }

    // Send admin emails if enabled and configured
    if (notificationSettings.admin.enabled && processedAdminTemplate && notificationSettings.admin.emails.length > 0) {
      for (const adminEmail of notificationSettings.admin.emails) {
        try {
          console.log(`📤 Sending admin email to ${adminEmail}...`)
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
          emailErrors.push(`Admin email to ${adminEmail}: ${adminErr?.message || String(adminErr)}`)
        }
      }
    } else {
      if (!notificationSettings.admin.enabled) {
        console.log('⚠️ Admin emails disabled, skipping')
      } else {
        console.log('⚠️ Admin emails not configured, skipping admin emails')
      }
    }

    // GHL Integration - check if enabled and mappings exist
    // Note: GHL lead is created from frontend (like quote-initial), not backend
    // This is just for tracking/debugging
    console.log('🔗 Checking GHL settings...')
    console.log('🔗 GHL enabled:', notificationSettings.ghl.enabled)

    let ghlMappings = null

    if (notificationSettings.ghl.enabled) {
      // Check if GHL field mappings exist for this partner and service
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

    return NextResponse.json({
      success: true,
      submissionId: finalSubmissionId,
      partnerId: partner.user_id, // Add partnerId for frontend GHL integration
      customerEmailSent: customerEmailSent,
      adminEmailSent: adminEmailSent,
      ghlIntegrationAttempted: notificationSettings.ghl.enabled && !!(ghlMappings && ghlMappings.length > 0),
      debug: {
        partnerId: partner.user_id, // Also in debug for consistency
        customerTemplateDataKeys: Object.keys(customerTemplateData),
        adminTemplateDataKeys: Object.keys(adminTemplateData),
        rawSubmissionDataKeys: rawSubmissionData ? Object.keys(rawSubmissionData) : [],
        customerEmail: customerTemplateData.email || customerTemplateData.customer_email,
        adminEmails: notificationSettings.admin.emails,
        adminEmailsEnabled: notificationSettings.admin.enabled,
        customerEmailEnabled: notificationSettings.customer.enabled,
        ghlEnabled: notificationSettings.ghl.enabled,
        emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
        is_iframe: is_iframe,
        ghlMappingsCount: ghlMappings?.length || 0,
        // Enhanced debugging data
        customerTemplateData: customerTemplateData,
        adminTemplateData: adminTemplateData,
        saveQuoteDataStructure: rawSubmissionData?.save_quote_data ? {
          length: rawSubmissionData.save_quote_data.length,
          latestEntry: rawSubmissionData.save_quote_data[rawSubmissionData.save_quote_data.length - 1],
          hasProducts: !!(rawSubmissionData.save_quote_data[rawSubmissionData.save_quote_data.length - 1]?.products),
          hasDetailedProducts: !!(rawSubmissionData.save_quote_data[rawSubmissionData.save_quote_data.length - 1]?.detailed_products_data),
          hasUserInfo: !!(rawSubmissionData.save_quote_data[rawSubmissionData.save_quote_data.length - 1]?.user_info)
        } : null,
        fieldMappings: {
          customer: customerMappings?.map(m => ({
            template_field_name: m.template_field_name,
            database_source: m.database_source,
            database_path: m.database_path,
            template_type: m.template_type
          })) || [],
          admin: adminMappings?.map(m => ({
            template_field_name: m.template_field_name,
            database_source: m.database_source,
            database_path: m.database_path,
            template_type: m.template_type
          })) || []
        },
        // Field mapping engine debug logs
        fieldMappingDebugLogs: fieldMappingDebugLogs
      }
    })
  } catch (error: any) {
    console.error('Save quote v2 email error:', error)
    return NextResponse.json({ error: 'Failed to send save quote email', details: error?.message || String(error) }, { status: 500 })
  }
}