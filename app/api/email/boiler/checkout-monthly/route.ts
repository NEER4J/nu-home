import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { decryptObject } from '@/lib/encryption'
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner'
import { getProcessedEmailTemplate } from '@/lib/email-templates'
import { formatProducts } from '@/lib/email-templates/product-formatter'
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

function createCustomerEmailTemplate(data: {
  companyName?: string
  logoUrl?: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  postcode?: string
  companyColor?: string
  orderDetails: string
  formattedPaymentPlanInfo: string
  installationInfo?: string
  submissionId?: string
  privacyPolicy?: string
  termsConditions?: string
  companyPhone?: string
  companyEmail?: string
  companyAddress?: string
  companyWebsite?: string
}) {
  const {
    companyName,
    logoUrl,
    firstName,
    lastName,
    email,
    phone,
    postcode,
    companyColor = '#3b82f6',
    orderDetails,
    formattedPaymentPlanInfo,
    installationInfo,
    submissionId,
    privacyPolicy,
    termsConditions,
    companyPhone,
    companyEmail,
    companyAddress,
    companyWebsite
  } = data

  const headerColor = companyColor
  const borderColor = '#e5e7eb'
  const backgroundColor = '#f9fafb'

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Monthly Payment Plan Confirmed</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header with Logo -->
              <tr>
                <td style="background: linear-gradient(135deg, ${headerColor}, ${headerColor}dd); padding: 25px 30px; border-radius: 8px 8px 0 0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center; vertical-align: middle;">
                        ${logoUrl ? `<img src="${logoUrl}" alt="${companyName || 'Company'}" style="max-height: 40px; max-width: 150px;">` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1f2937; font-size: 28px; font-weight: 600; margin: 0;">Monthly Payment Plan Confirmed!</h1>
                    <p style="color: #6b7280; font-size: 16px; margin: 8px 0 0 0;">Your boiler installation has been booked${companyName ? ' with ' + companyName : ''}</p>
                  </div>

                  <!-- Customer Details Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Your Details
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Name:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${firstName} ${lastName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Email:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${email}</td>
                          </tr>
                          ${phone ? `
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Phone:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${phone}</td>
                          </tr>
                          ` : ''}
                          ${postcode ? `
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Postcode:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${postcode}</td>
                          </tr>
                          ` : ''}
                          ${submissionId ? `
                          <tr>
                            <td style="padding: 12px 15px; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Reference:</td>
                            <td style="padding: 12px 15px; color: #6b7280;">${submissionId}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${installationInfo ? `
                  <!-- Installation Details Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Installation Details
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px; color: #6b7280; line-height: 1.6;">
                        ${installationInfo}
                      </td>
                    </tr>
                  </table>
                  ` : ''}

                  <!-- Order Summary Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Order Summary
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                        ${orderDetails}
                      </td>
                    </tr>
                  </table>

                  <!-- Payment Plan Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: #f0fdf4; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Payment Plan Details
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                        ${formattedPaymentPlanInfo}

                      </td>
                    </tr>
                  </table>





                  <p style="margin: 30px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
                    Thank you for choosing ${companyName || 'our service'}! We look forward to completing your installation.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: ${backgroundColor}; padding: 20px; border-radius: 0 0 8px 8px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center; padding-bottom: 15px;">
                        ${logoUrl ? `<img src="${logoUrl}" alt="${companyName || 'Company'}" style="max-height: 40px; max-width: 150px; margin-bottom: 10px;">` : ''}
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">
                          ©2025 ${companyName || 'Company Name'}. All rights reserved.
                        </p>
                      </td>
                    </tr>
                    ${companyAddress ? `
                    <tr>
                      <td style="text-align: center; padding-bottom: 15px;">
                        <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.4;">
                          ${companyAddress}
                        </p>
                      </td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="text-align: center; padding-bottom: 15px;">
                        <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">
                          ${companyName || 'Company Name'} is authorised and regulated by the Financial Conduct Authority. Finance options are provided by panel of lenders. Finance available subject to status. Terms and conditions apply.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="text-align: center; padding-bottom: 15px;">
                        <div style="display: inline-block;">
                          ${privacyPolicy ? `<a href="#" style="color: ${headerColor}; text-decoration: none; margin: 0 10px; font-size: 14px;">Privacy Policy</a>` : ''}
                          ${privacyPolicy && termsConditions ? `<span style="color: #9ca3af;">|</span>` : ''}
                          ${termsConditions ? `<a href="#" style="color: ${headerColor}; text-decoration: none; margin: 0 10px; font-size: 14px;">Terms & Conditions</a>` : ''}
                        </div>
                      </td>
                    </tr>
                    ${companyWebsite ? `
                    <tr>
                      <td style="text-align: center;">
                        <a href="${companyWebsite}" style="color: ${headerColor}; text-decoration: none; font-size: 14px; font-weight: 600;">
                          Visit our website
                        </a>
                      </td>
                    </tr>
                    ` : ''}
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

function createAdminEmailTemplate(data: {
  companyName?: string
  logoUrl?: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  postcode?: string
  companyColor?: string
  orderDetails: string
  formattedPaymentPlanInfo: string
  installationInfo?: string
  submissionId?: string
  privacyPolicy?: string
  termsConditions?: string
  companyAddress?: string
  companyWebsite?: string
}) {
  const {
    companyName,
    logoUrl,
    firstName,
    lastName,
    email,
    phone,
    postcode,
    companyColor = '#3b82f6',
    orderDetails,
    formattedPaymentPlanInfo,
    installationInfo,
    submissionId,
    privacyPolicy,
    termsConditions,
    companyAddress,
    companyWebsite
  } = data

  const headerColor = companyColor
  const borderColor = '#e5e7eb'
  const backgroundColor = '#f9fafb'

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Monthly Payment Plan Booking - Admin</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table width="700" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, ${headerColor}, ${headerColor}dd); padding: 25px 30px; border-radius: 8px 8px 0 0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center; vertical-align: middle;">
                        ${logoUrl ? `<img src="${logoUrl}" alt="${companyName || 'Company'}" style="max-height: 40px; max-width: 150px;">` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #374151;">
                    New Monthly Payment Plan Booking
                  </h2>
                  
                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    A customer has confirmed their monthly payment plan for boiler installation${companyName ? ' with <strong>' + companyName + '</strong>' : ''}. 
                    Please set up the payment plan and schedule the installation.
                  </p>

                  <!-- Customer Information Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Customer Information
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Full Name:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${firstName} ${lastName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Email:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${email}</td>
                          </tr>
                          ${phone ? `
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Phone:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${phone}</td>
                          </tr>
                          ` : ''}
                          ${postcode ? `
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Postcode:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${postcode}</td>
                          </tr>
                          ` : ''}
                          ${submissionId ? `
                          <tr>
                            <td style="padding: 12px 15px; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Reference:</td>
                            <td style="padding: 12px 15px; color: #6b7280;">${submissionId}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${installationInfo ? `
                  <!-- Installation Details Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Installation Details
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px; color: #6b7280; line-height: 1.6;">
                        ${installationInfo}
                      </td>
                    </tr>
                  </table>
                  ` : ''}

                  <!-- Order Details Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Order Details
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                        ${orderDetails}
                      </td>
                    </tr>
                  </table>

                  <!-- Payment Plan Information Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: #f0fdf4; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Payment Plan Information
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                        ${formattedPaymentPlanInfo}

                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: ${backgroundColor}; padding: 20px; border-radius: 0 0 8px 8px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center; padding-bottom: 15px;">
                        ${logoUrl ? `<img src="${logoUrl}" alt="${companyName || 'Company'}" style="max-height: 40px; max-width: 150px; margin-bottom: 10px;">` : ''}
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">
                          ©2025 ${companyName || 'Company Name'}. All rights reserved.
                        </p>
                      </td>
                    </tr>
                    ${companyAddress ? `
                    <tr>
                      <td style="text-align: center; padding-bottom: 15px;">
                        <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.4;">
                          ${companyAddress}
                        </p>
                      </td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="text-align: center; padding-bottom: 15px;">
                        <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">
                          ${companyName || 'Company Name'} is authorised and regulated by the Financial Conduct Authority. Finance options are provided by panel of lenders. Finance available subject to status. Terms and conditions apply.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="text-align: center; padding-bottom: 15px;">
                        <div style="display: inline-block;">
                          ${privacyPolicy ? `<a href="#" style="color: ${headerColor}; text-decoration: none; margin: 0 10px; font-size: 14px;">Privacy Policy</a>` : ''}
                          ${privacyPolicy && termsConditions ? `<span style="color: #9ca3af;">|</span>` : ''}
                          ${termsConditions ? `<a href="#" style="color: ${headerColor}; text-decoration: none; margin: 0 10px; font-size: 14px;">Terms & Conditions</a>` : ''}
                        </div>
                      </td>
                    </tr>
                    ${companyWebsite ? `
                    <tr>
                      <td style="text-align: center;">
                        <a href="${companyWebsite}" style="color: ${headerColor}; text-decoration: none; font-size: 14px; font-weight: 600;">
                          Visit our website
                        </a>
                      </td>
                    </tr>
                    ` : ''}
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

export async function POST(request: NextRequest) {
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
      orderDetails,
      paymentInfo,
      installationInfo,
      monthlyPayment,
      paymentDuration,
      deposit,
      apr,
      totalAmount,
      
      // Legacy fields for backward compatibility
      first_name, 
      last_name, 
      order_details,
      payment_plan,
      installation_date,
      submission_id,
      subdomain: bodySubdomain 
    } = body || {}

    // Use new fields if available, fallback to legacy fields
    const finalFirstName = firstName || first_name
    const finalLastName = lastName || last_name
    const finalSubmissionId = submissionId || submission_id
    const finalOrderDetails = orderDetails || order_details
    const finalPaymentInfo = paymentInfo || payment_plan
    const finalInstallationInfo = installationInfo || installation_date

    const hostname = parseHostname(request, bodySubdomain)
    console.log('checkout-monthly - Parsed hostname:', hostname);
    
    if (!hostname) {
      return NextResponse.json({ error: 'Missing hostname' }, { status: 400 })
    }

    const supabase = await createClient()
    const partner = await resolvePartnerByHost(supabase, hostname)
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found for this domain' }, { status: 400 })
    }

    const companyName: string | undefined = partner.company_name || undefined
    const logoUrl: string | undefined = partner.logo_url || undefined
    const companyColor: string | undefined = partner.company_color || undefined
    const privacyPolicy: string | undefined = partner.privacy_policy || undefined
    const termsConditions: string | undefined = partner.terms_conditions || undefined
    const companyPhone: string | undefined = partner.phone || undefined
    const companyAddress: string | undefined = partner.address || undefined
    const companyWebsite: string | undefined = partner.website_url || undefined
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

    // Get category-specific admin email from PartnerSettings
    let adminEmail: string | undefined = undefined
    if (boilerCategory) {
      const { data: partnerSettings } = await supabase
        .from('PartnerSettings')
        .select('admin_email')
        .eq('partner_id', partner.user_id)
        .eq('service_category_id', boilerCategory.service_category_id)
        .single()

      adminEmail = partnerSettings?.admin_email || undefined
    }

    const companyEmail: string | undefined = adminEmail || undefined

    const toAddress: string = email || smtp.SMTP_FROM
    if (!toAddress) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
    }

    const formatOrderDetails = (orderData: any) => {
      if (!orderData) return 'Order details not available'
      
      let details = []
      if (orderData.product) {
        details.push(`Product: ${orderData.product.name} - £${(orderData.product.price || 0).toFixed(2)}`)
      }
      if (orderData.addons && orderData.addons.length > 0) {
        details.push('Add-ons:')
        orderData.addons.forEach((addon: any) => {
          details.push(`  • ${addon.title} (x${addon.quantity}) - £${(addon.price * addon.quantity).toFixed(2)}`)
        })
      }
      if (orderData.bundles && orderData.bundles.length > 0) {
        details.push('Bundles:')
        orderData.bundles.forEach((bundle: any) => {
          details.push(`  • ${bundle.title} (x${bundle.quantity}) - £${(bundle.unitPrice * bundle.quantity).toFixed(2)}`)
        })
      }
      if (orderData.total) {
        details.push(`\nTotal: £${orderData.total.toFixed(2)}`)
      }
      return details.join('\n')
    }

    const formatPaymentPlan = (planData: any) => {
      if (!planData) return 'Payment plan: Monthly payments'
      
      let details = [`Payment method: Monthly Payment Plan`]
      if (planData.monthly_amount) {
        details.push(`Monthly payment: £${planData.monthly_amount.toFixed(2)}`)
      }
      if (planData.duration_months) {
        details.push(`Payment duration: ${planData.duration_months} months`)
      }
      if (planData.deposit) {
        details.push(`Deposit: £${planData.deposit.toFixed(2)}`)
      }
      if (planData.total_amount) {
        details.push(`Total amount: £${planData.total_amount.toFixed(2)}`)
      }
      if (planData.apr) {
        details.push(`APR: ${planData.apr}%`)
      }
      return details.join('\n')
    }

    const formattedOrderDetails = formatOrderDetails(order_details)
    const formattedPaymentPlanInfo = formatPaymentPlan(payment_plan)
    const formattedInstallationInfo = installation_date ? `Scheduled installation date: ${new Date(installation_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : undefined

    // Fetch quote data from submission if available (using same approach as quote-initial)
    const formatQuoteData = (submissionData: any, questionsList: any[]) => {
      if (!submissionData?.form_answers || !Array.isArray(submissionData.form_answers)) return ''
      
      const formattedAnswers: string[] = []
      
      submissionData.form_answers.forEach((answerObj: any) => {
        if (answerObj?.question_text && answerObj?.answer !== null && answerObj?.answer !== undefined && answerObj?.answer !== '') {
          const formattedAnswer = Array.isArray(answerObj.answer) ? answerObj.answer.join(', ') : String(answerObj.answer)
          formattedAnswers.push(`${answerObj.question_text}: ${formattedAnswer}`)
        }
      })
      
      return formattedAnswers.join('\n')
    }

    // Get service category ID for boiler (same approach as quote-initial)
    const { data: boilerServiceCategory } = await supabase
      .from('ServiceCategories')
      .select('service_category_id')
      .eq('slug', 'boiler')
      .single()

    // Debug logging
    console.log('checkout-monthly - Received data:', {
      finalSubmissionId,
      finalOrderDetails,
      productId: finalOrderDetails?.product?.id,
      boilerServiceCategory: boilerServiceCategory?.service_category_id
    })

    // Fetch quote data and product information like other email types
    let quoteData = undefined
    let productInformation = undefined
    
    if (finalSubmissionId) {
      try {
        // Fetch quote data from partner_leads table (where the form_answers are actually stored)
        const { data: leadData, error: leadError } = await supabase
          .from('partner_leads')
          .select('form_answers')
          .eq('submission_id', finalSubmissionId)
          .single()
        
        console.log('checkout-monthly - Lead data fetch result:', { leadData, leadError })
        
        if (leadData && leadData.form_answers && Array.isArray(leadData.form_answers)) {
          console.log('checkout-monthly - Found form_answers:', leadData.form_answers)
          
          // Format the quote data from the form_answers array
          const formattedAnswers: string[] = []
          leadData.form_answers.forEach((answerObj: any) => {
            if (answerObj?.question_text && answerObj?.answer) {
              const answerText = Array.isArray(answerObj.answer) 
                ? answerObj.answer.join(', ') 
                : String(answerObj.answer)
              formattedAnswers.push(`${answerObj.question_text}: ${answerText}`)
            }
          })
          
          quoteData = formattedAnswers.join('\n')
          console.log('checkout-monthly - Generated quoteData:', quoteData)
        } else {
          console.log('checkout-monthly - No form_answers found in partner_leads')
        }
        
        // Fetch product data (same as save-quote)
        if (finalOrderDetails?.product?.id) {
          console.log('checkout-monthly - Fetching product data for ID:', finalOrderDetails.product.id)
          const { data: fullProduct, error: productError } = await supabase
            .from('PartnerProducts')
            .select('partner_product_id, name, description, price, image_url, product_fields')
            .eq('partner_product_id', finalOrderDetails.product.id)
            .eq('is_active', true)
            .single()
          
          console.log('checkout-monthly - Product fetch result:', { fullProduct, productError })
          
          if (!productError && fullProduct) {
            const fullProductData = {
              name: fullProduct.name,
              description: fullProduct.description,
              price: fullProduct.price,
              image_url: fullProduct.image_url,
              product_fields: fullProduct.product_fields || {}
            }
            productInformation = formatProducts([fullProductData])
            console.log('checkout-monthly - Generated productInformation:', productInformation)
          }
        } else {
          console.log('checkout-monthly - No product ID found in order details')
        }
      } catch (error) {
        console.error('Error fetching quote and product data:', error)
      }
    }

    // Prepare template data
    // Prepare template data with new standardized field structure
    const templateData = {
      // User Information fields
      firstName: finalFirstName,
      lastName: finalLastName,
      email,
      phone,
      postcode,
      fullAddress: fullAddress || undefined,
      submissionId: finalSubmissionId,
      submissionDate: submissionDate || new Date().toISOString(),
      
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
      
      // Comprehensive Product Information (formatted HTML for multiple products)
      productInformation: productInformation || formattedOrderDetails,
      
      // Quote Information (formatted question/answer pairs like initial-quote)
      quoteData: quoteData || formattedOrderDetails,
      
      // Order and Payment fields
      orderDetails: formattedOrderDetails,
      paymentInfo: formattedPaymentPlanInfo,
      paymentPlanInfo: formattedPaymentPlanInfo,
      installationInfo: finalInstallationInfo || formattedInstallationInfo,
      
      // Monthly payment plan fields (extract from payment_plan if individual fields not provided)
      monthlyPayment: monthlyPayment || (payment_plan?.monthly_amount ? `£${payment_plan.monthly_amount.toFixed(2)}` : undefined),
      paymentDuration: paymentDuration || (payment_plan?.duration_months ? `${payment_plan.duration_months} months` : undefined),
      deposit: deposit || (payment_plan?.deposit_amount !== undefined ? `£${payment_plan.deposit_amount.toFixed(2)}` : (payment_plan?.deposit_percentage !== undefined ? `${payment_plan.deposit_percentage}%` : '£0.00')),
      apr: apr || (payment_plan?.apr ? `${payment_plan.apr}` : undefined),
      totalAmount: totalAmount || (payment_plan?.total_amount ? `£${payment_plan.total_amount.toFixed(2)}` : undefined),
      
      // Legacy fields for backward compatibility
      formattedPaymentPlanInfo: formattedPaymentPlanInfo,
    }

    // Try to get custom templates
    let customerSubject = `Monthly Payment Plan Confirmed - Your Boiler Installation${companyName ? ' with ' + companyName : ''}`
    let customerHtml = ''
    let customerText = ''

    const customCustomerTemplate = await getProcessedEmailTemplate(
      partner.user_id,
      'boiler',
      'checkout-monthly',
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
        companyName,
        logoUrl,
        firstName: finalFirstName,
        lastName: finalLastName,
        email,
        phone,
        postcode,
        companyColor,
        orderDetails,
        formattedPaymentPlanInfo,
        installationInfo,
        submissionId: finalSubmissionId,
        privacyPolicy,
        termsConditions,
        companyPhone,
        companyEmail,
        companyAddress,
        companyWebsite
      })
    }

    // Fallback customerText only if no custom template
    if (!customerText) {
      customerText = `Monthly Payment Plan Confirmed - Your Boiler Installation${companyName ? ' with ' + companyName : ''}\n\n` +
        `Hi ${first_name},\n\n` +
        `Great news! Your monthly payment plan has been set up and your boiler installation is now booked.\n\n` +
        `Customer Details:\n` +
        `Name: ${first_name} ${last_name}\n` +
        `Email: ${email}\n` +
        (phone ? `Phone: ${phone}\n` : '') +
        (postcode ? `Postcode: ${postcode}\n` : '') +
        `\n${installationInfo ? installationInfo + '\n\n' : ''}` +
        `Order Summary:\n${orderDetails}\n\n` +
        `Payment Plan Details:\n${formattedPaymentPlanInfo}\n\n` +
        (submission_id ? `Booking Reference: ${submission_id}\n\n` : '') +
        `What happens next?\n` +
        `• We'll contact you within 24 hours to set up payment details\n` +
        `• Direct debit will be arranged for your monthly payments\n` +
        `• Our team will contact you 24-48 hours before installation\n` +
        `• Our certified engineers will arrive on your scheduled date\n` +
        `• Installation will be completed with full warranty\n\n` +
        `Thank you for choosing ${companyName || 'our service'}!`
    }

    let adminSubject = `New Monthly Payment Plan Booking${companyName ? ' - ' + companyName : ''}`
    let adminHtml = ''
    let adminText = ''

    if (adminEmail) {
      const customAdminTemplate = await getProcessedEmailTemplate(
        partner.user_id,
        'boiler',
        'checkout-monthly',
        'admin',
        templateData
      )

      if (customAdminTemplate) {
        adminSubject = customAdminTemplate.subject
        adminHtml = customAdminTemplate.html
        adminText = customAdminTemplate.text
      }

      // Fallback to hardcoded template if no custom template
      if (!adminHtml) {
        adminHtml = createAdminEmailTemplate({
          companyName,
          logoUrl,
          firstName: first_name,
          lastName: last_name,
          email,
          phone,
          postcode,
          companyColor,
          orderDetails,
          formattedPaymentPlanInfo,
          installationInfo,
          submissionId: finalSubmissionId,
          privacyPolicy,
          termsConditions,
          companyAddress,
          companyWebsite
        })
      }

      // Fallback adminText only if no custom template
      if (!adminText) {
        adminText = `New Monthly Payment Plan Booking${companyName ? ' - ' + companyName : ''}\n\n` +
          `A customer has confirmed their monthly payment plan for boiler installation.\n\n` +
          `Customer Information:\n` +
          `Name: ${first_name} ${last_name}\n` +
          `Email: ${email}\n` +
          (phone ? `Phone: ${phone}\n` : '') +
          (postcode ? `Postcode: ${postcode}\n` : '') +
          (submission_id ? `Reference: ${submission_id}\n` : '') +
          `\n${installationInfo ? installationInfo + '\n\n' : ''}` +
          `Order Details:\n${orderDetails}\n\n` +
          `Payment Plan Information:\n${formattedPaymentPlanInfo}\n\n` +
          `Action Required: Contact customer within 24 hours to set up direct debit and payment plan details.`
      }
    }

    try {
      // Send customer email
      await transporter.sendMail({
        from: smtp.SMTP_FROM || smtp.SMTP_USER,
        to: toAddress,
        subject: customerSubject,
        text: customerText,
        html: customerHtml,
      })

      // Send admin email if admin email is configured
      if (adminEmail && adminHtml) {
        await transporter.sendMail({
          from: smtp.SMTP_FROM || smtp.SMTP_USER,
          to: adminEmail,
          subject: adminSubject,
          text: adminText,
          html: adminHtml,
        })
      }
    } catch (sendErr: any) {
      return NextResponse.json({ error: 'SMTP send failed', details: sendErr?.message || String(sendErr) }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Monthly checkout email error:', error)
    return NextResponse.json({ error: 'Failed to send monthly checkout email', details: error?.message || String(error) }, { status: 500 })
  }
}