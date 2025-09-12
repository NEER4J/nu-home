import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { decryptObject } from '@/lib/encryption'
import { resolvePartnerByHostname } from '@/lib/partner'
import { getProcessedEmailTemplate, buildQuoteLink } from '@/lib/email-templates'
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
    SMTP_HOST: merged.SMTP_HOST,
    SMTP_PORT: port,
    SMTP_SECURE: secure,
    SMTP_USER: merged.SMTP_USER,
    SMTP_PASSWORD: merged.SMTP_PASSWORD,
    SMTP_FROM: merged.SMTP_FROM,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    
    const {
      submissionId,
      subdomain,
      is_iframe,
      quoteLink,
      submissionDate,
      firstName,
      lastName,
      email,
      phone,
      postcode,
      address_data,
      quote_data,
      questions,
      finalQuoteData,
      partner_id,
      service_category_id,
      integration_type = 'email'
    } = body

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 })
    }

    // Resolve partner
    const hostname = parseHostname(request, subdomain)
    const partner = await resolvePartnerByHostname(hostname, partner_id)
    
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    // Get service category
    const serviceCategoryId = service_category_id || (await supabase
      .from('ServiceCategories')
      .select('service_category_id')
      .eq('slug', 'boiler')
      .single()
    ).data?.service_category_id

    if (!serviceCategoryId) {
      return NextResponse.json({ error: 'Service category not found' }, { status: 404 })
    }

    // Initialize field mapping engine
    const fieldMappingEngine = new FieldMappingEngine(supabase, partner.user_id, serviceCategoryId)

    // Process submission data using field mappings
    const processedData = await fieldMappingEngine.processSubmissionData(
      submissionId,
      'quote-initial',
      integration_type
    )

    // Get partner settings and company information
    const { data: partnerSettings } = await supabase
      .from('PartnerSettings')
      .select('*')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', serviceCategoryId)
      .single()

    const companyName = partnerSettings?.company_name || partner.company_name || 'Your Company'
    const companyPhone = partnerSettings?.company_phone || partner.phone || ''
    const companyEmail = partnerSettings?.admin_email || partner.email || ''
    const companyAddress = partnerSettings?.company_address || ''
    const companyWebsite = partnerSettings?.company_website || partner.website || ''
    const logoUrl = partnerSettings?.logo_url || partner.logo_url || ''
    const companyColor = partnerSettings?.primary_color || partner.primary_color || '#3b82f6'
    const privacyPolicy = partnerSettings?.privacy_policy_url || ''
    const termsConditions = partnerSettings?.terms_conditions_url || ''

    // Get SMTP settings
    const { data: smtpSettings } = await supabase
      .from('PartnerSettings')
      .select('smtp_settings')
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', serviceCategoryId)
      .single()

    if (!smtpSettings?.smtp_settings) {
      return NextResponse.json({ error: 'SMTP settings not configured' }, { status: 400 })
    }

    const smtp = migrateSmtp(decryptObject(smtpSettings.smtp_settings))

    // Validate SMTP settings
    if (!smtp.SMTP_HOST || !smtp.SMTP_USER || !smtp.SMTP_PASSWORD || !smtp.SMTP_FROM) {
      return NextResponse.json({ error: 'Incomplete SMTP configuration' }, { status: 400 })
    }

    const transporter = nodemailer.createTransporter({
      host: smtp.SMTP_HOST,
      port: smtp.SMTP_PORT,
      secure: smtp.SMTP_SECURE,
      auth: { user: smtp.SMTP_USER, pass: smtp.SMTP_PASSWORD },
    })

    try { 
      await transporter.verify() 
    } catch (verifyErr: any) {
      return NextResponse.json({ 
        error: 'SMTP verification failed', 
        details: verifyErr?.message || String(verifyErr) 
      }, { status: 400 })
    }

    // Build quote link
    const baseUrl = partner.custom_domain && partner.domain_verified 
      ? `https://${partner.custom_domain}`
      : partner.subdomain 
        ? `https://${partner.subdomain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'yourdomain.com'}`
        : null

    const finalQuoteLink = quoteLink || buildQuoteLink(
      partner.custom_domain || null,
      partner.domain_verified || null,
      partner.subdomain || null,
      submissionId,
      'boiler',
      partnerSettings?.main_page_url || null,
      is_iframe
    )

    // Prepare enhanced template data with field mapping results
    const templateData = {
      // Field mapping results (dynamically populated)
      ...processedData,
      
      // Company Information fields
      companyName,
      companyPhone,
      companyEmail,
      companyAddress,
      companyWebsite,
      logoUrl,
      primaryColor: companyColor,
      currentYear: new Date().getFullYear().toString(),
      privacyPolicy,
      termsConditions,
      
      // Quote Details
      quoteLink: finalQuoteLink,
      
      // Legacy fields for backward compatibility
      refNumber: submissionId,
      submissionId,
      submissionDate: submissionDate || new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
    }

    // Try to get custom customer template first
    let customerSubject = `Your boiler quote request${companyName ? ' - ' + companyName : ''}`
    let customerHtml = ''
    let customerText = ''

    const customCustomerTemplate = await getProcessedEmailTemplate(
      partner.user_id,
      'boiler',
      'quote-initial',
      'customer',
      templateData
    )

    if (customCustomerTemplate) {
      customerSubject = customCustomerTemplate.subject
      customerHtml = customCustomerTemplate.html
      customerText = customCustomerTemplate.text
    }

    // Fallback to hardcoded template if no custom template
    if (!customerHtml) {
      customerHtml = createCustomerEmailTemplate({
        refNumber: submissionId,
        companyName,
        logoUrl,
        firstName: processedData.customer_name || firstName,
        lastName: processedData.customer_full_name?.split(' ').slice(1).join(' ') || lastName,
        email: processedData.customer_email || email,
        phone: processedData.customer_phone || phone,
        postcode: processedData.property_postcode || postcode,
        companyColor,
        privacyPolicy,
        termsConditions,
        companyPhone,
        companyEmail,
        companyAddress,
        companyWebsite,
        baseUrl: baseUrl || undefined,
        submissionId: submissionId,
        // Include field mapping results
        formAnswersHtml: processedData.form_answers_html || '',
        formAnswersText: processedData.form_answers_text || '',
        propertyAddress: processedData.property_address || '',
        boilerType: processedData.boiler_type || '',
        propertyType: processedData.property_type || '',
        timeline: processedData.timeline || ''
      })
    }

    // Fallback customerText only if no custom template
    if (!customerText) {
      customerText = `Hi ${processedData.customer_name || firstName || 'there'},\n` +
        `Excellent decision on requesting your free boiler quote.\n\n` +
        `We know that when you need a boiler, finding a reliable company who you can trust can be a challenge, so our goal at ${companyName || 'our company'} is to make the process as simple and stress free as possible.\n\n` +
        `Here are a few things you should know about us before you buy your new boiler:\n\n` +
        `✓ We are a local company and have built our reputation by going above and beyond for our customers. We take care of everything and even have incredible aftercare so you know you are always in safe hands.\n` +
        `✓ Every single job is audited before and after by our qualified team to make sure it meets our high standards.\n` +
        `✓ We offer a PRICE MATCH PROMISE. If you stumble across a better price, just reply to this email with your quote attached and we'll better it, or send you a £50 voucher if we can't.\n\n` +
        `Want to know more about why we are the best choice for your new boiler?\n\n` +
        `Check out our website at ${companyWebsite || 'our website'} and if you have any questions, simply reply to this email and we'll reply as soon as possible.\n\n` +
        `Or give us a call on ${companyPhone || 'our phone number'}.\n\n` +
        `Your Details:\n` +
        `Name: ${processedData.customer_full_name || `${firstName} ${lastName}`}\n` +
        `Email: ${processedData.customer_email || email}\n` +
        (processedData.customer_phone ? `Phone: ${processedData.customer_phone}\n` : '') +
        (processedData.property_postcode ? `Postcode: ${processedData.property_postcode}\n` : '') +
        (processedData.property_address ? `Address: ${processedData.property_address}\n` : '') +
        `\nWe will be in touch shortly after phone verification.\n\n` +
        `Reference: ${submissionId}` +
        (companyName ? `\n${companyName}` : '') +
        `\n\nThis is an automated email. Please do not reply to this message.`
    }

    // Send customer email
    const customerMailOptions = {
      from: smtp.SMTP_FROM,
      to: processedData.customer_email || email,
      subject: customerSubject,
      html: customerHtml,
      text: customerText,
    }

    await transporter.sendMail(customerMailOptions)

    // Send admin notification if configured
    if (companyEmail) {
      const adminSubject = `New Boiler Quote Request - ${processedData.customer_full_name || 'Unknown Customer'}`
      const adminHtml = createAdminEmailTemplate({
        refNumber: submissionId,
        companyName,
        logoUrl,
        firstName: processedData.customer_name || firstName,
        lastName: processedData.customer_full_name?.split(' ').slice(1).join(' ') || lastName,
        email: processedData.customer_email || email,
        phone: processedData.customer_phone || phone,
        postcode: processedData.property_postcode || postcode,
        companyColor,
        privacyPolicy,
        termsConditions,
        companyPhone,
        companyEmail,
        companyAddress,
        companyWebsite,
        baseUrl: baseUrl || undefined,
        submissionId: submissionId,
        // Include field mapping results
        formAnswersHtml: processedData.form_answers_html || '',
        formAnswersText: processedData.form_answers_text || '',
        propertyAddress: processedData.property_address || '',
        boilerType: processedData.boiler_type || '',
        propertyType: processedData.property_type || '',
        timeline: processedData.timeline || ''
      })

      const adminMailOptions = {
        from: smtp.SMTP_FROM,
        to: companyEmail,
        subject: adminSubject,
        html: adminHtml,
        text: `New boiler quote request from ${processedData.customer_full_name || 'Unknown Customer'}\n\nReference: ${submissionId}\n\nView details: ${finalQuoteLink}`,
      }

      await transporter.sendMail(adminMailOptions)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Emails sent successfully',
      submissionId,
      processedFields: Object.keys(processedData).length
    })

  } catch (error: any) {
    console.error('Error in quote-initial email API:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

// Fallback email template functions (simplified versions)
function createCustomerEmailTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Boiler Quote Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        ${data.logoUrl ? `<img src="${data.logoUrl}" alt="${data.companyName}" style="max-height: 60px;">` : ''}
        <h1 style="color: ${data.companyColor || '#3b82f6'}; margin-top: 20px;">Your Boiler Quote Request</h1>
      </div>
      
      <p>Hi ${data.firstName || 'there'},</p>
      
      <p>Excellent decision on requesting your free boiler quote.</p>
      
      <p>We know that when you need a boiler, finding a reliable company who you can trust can be a challenge, so our goal at ${data.companyName} is to make the process as simple and stress free as possible.</p>
      
      <h2 style="color: ${data.companyColor || '#3b82f6'};">Why Choose Us?</h2>
      <ul>
        <li>We are a local company and have built our reputation by going above and beyond for our customers</li>
        <li>Every single job is audited before and after by our qualified team</li>
        <li>We offer a PRICE MATCH PROMISE</li>
      </ul>
      
      ${data.formAnswersHtml ? `
        <h2 style="color: ${data.companyColor || '#3b82f6'};">Your Quote Details</h2>
        ${data.formAnswersHtml}
      ` : ''}
      
      <p>Want to know more about why we are the best choice for your new boiler?</p>
      
      <p>Check out our website at ${data.companyWebsite || 'our website'} and if you have any questions, simply reply to this email and we'll reply as soon as possible.</p>
      
      <p>Or give us a call on ${data.companyPhone || 'our phone number'}.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Your Details:</h3>
        <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
        ${data.postcode ? `<p><strong>Postcode:</strong> ${data.postcode}</p>` : ''}
        ${data.propertyAddress ? `<p><strong>Address:</strong> ${data.propertyAddress}</p>` : ''}
      </div>
      
      <p>We will be in touch shortly after phone verification.</p>
      
      <p><strong>Reference:</strong> ${data.refNumber}</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #666;">
        ${data.companyName}<br>
        This is an automated email. Please do not reply to this message.
      </p>
    </body>
    </html>
  `
}

function createAdminEmailTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Boiler Quote Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        ${data.logoUrl ? `<img src="${data.logoUrl}" alt="${data.companyName}" style="max-height: 60px;">` : ''}
        <h1 style="color: ${data.companyColor || '#3b82f6'}; margin-top: 20px;">New Boiler Quote Request</h1>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2>Customer Details:</h2>
        <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
        ${data.postcode ? `<p><strong>Postcode:</strong> ${data.postcode}</p>` : ''}
        ${data.propertyAddress ? `<p><strong>Address:</strong> ${data.propertyAddress}</p>` : ''}
        <p><strong>Reference:</strong> ${data.refNumber}</p>
      </div>
      
      ${data.formAnswersHtml ? `
        <h2>Quote Details:</h2>
        ${data.formAnswersHtml}
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.baseUrl}/admin/leads" style="background-color: ${data.companyColor || '#3b82f6'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Lead Details
        </a>
      </div>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #666;">
        ${data.companyName}<br>
        This is an automated notification.
      </p>
    </body>
    </html>
  `
}
