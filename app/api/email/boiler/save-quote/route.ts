import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { decryptObject } from '@/lib/encryption'
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner'
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
  postcode?: string
  companyColor?: string
  productsInfo: string
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
    postcode,
    companyColor = '#3b82f6',
    productsInfo,
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
      <title>Quote Saved Successfully</title>
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
                    <h1 style="color: #1f2937; font-size: 28px; font-weight: 600; margin: 0;">Quote Saved!</h1>
                    <p style="color: #6b7280; font-size: 16px; margin: 8px 0 0 0;">Your boiler quote has been saved${companyName ? ' with ' + companyName : ''}</p>
                  </div>

                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
                    Your quote has been successfully saved. You can return anytime to complete your booking or make changes to your selection.
                  </p>

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

                  ${productsInfo ? `
                  <!-- Saved Products Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Saved Products & Options
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                        ${productsInfo}
                      </td>
                    </tr>
                  </table>
                  ` : ''}



                  <p style="margin: 30px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
                    Thank you for choosing ${companyName || 'our service'}! We're here whenever you're ready to proceed.
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
  postcode?: string
  companyColor?: string
  productsInfo: string
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
    postcode,
    companyColor = '#3b82f6',
    productsInfo,
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
      <title>Customer Saved Quote - Admin</title>
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
                    Customer Saved Quote - Follow Up Opportunity
                  </h2>
                  
                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    A customer has saved their boiler quote${companyName ? ' with <strong>' + companyName + '</strong>' : ''}. 
                    This presents a great opportunity for follow-up to help convert the quote into a booking.
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

                  ${productsInfo ? `
                  <!-- Saved Products Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Saved Products & Options
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                        ${productsInfo}
                      </td>
                    </tr>
                  </table>
                  ` : ''}


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
    const { first_name, last_name, email, submission_id, postcode, products, subdomain: bodySubdomain } = body || {}

    const hostname = parseHostname(request, bodySubdomain)
    console.log('save-quote - Parsed hostname:', hostname);
    
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
    const adminEmail: string | undefined = partner.admin_mail || undefined
    const privacyPolicy: string | undefined = partner.privacy_policy || undefined
    const termsConditions: string | undefined = partner.terms_conditions || undefined
    const companyPhone: string | undefined = partner.phone || undefined
    const companyEmail: string | undefined = partner.admin_mail || undefined
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

    const toAddress: string = email || smtp.SMTP_FROM
    if (!toAddress) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
    }

    const customerSubject = `Quote Saved Successfully${companyName ? ' - ' + companyName : ''}`
    const adminSubject = `Customer Saved Quote - Follow Up${companyName ? ' - ' + companyName : ''}`

    // Format products information
    const formatProducts = (productsData: any) => {
      if (!productsData) return 'No products selected'
      
      if (Array.isArray(productsData)) {
        return productsData.map((product: any, index: number) => {
          let productText = `${index + 1}. ${product.name || 'Product'}`
          if (product.price) productText += ` - £${product.price.toFixed(2)}`
          if (product.description) productText += `\n   ${product.description}`
          return productText
        }).join('\n\n')
      }
      
      if (typeof productsData === 'object') {
        return Object.entries(productsData).map(([key, value]) => `${key}: ${value}`).join('\n')
      }
      
      return String(productsData)
    }

    const productsInfo = formatProducts(products)

    const customerHtml = createCustomerEmailTemplate({
      companyName,
      logoUrl,
      firstName: first_name,
      lastName: last_name,
      email,
      postcode,
      companyColor,
      productsInfo,
      submissionId: submission_id,
      privacyPolicy,
      termsConditions,
      companyPhone,
      companyEmail,
      companyAddress,
      companyWebsite
    })

    let adminHtml
    if (adminEmail) {
      adminHtml = createAdminEmailTemplate({
        companyName,
        logoUrl,
        firstName: first_name,
        lastName: last_name,
        email,
        postcode,
        companyColor,
        productsInfo,
        submissionId: submission_id,
        privacyPolicy,
        termsConditions,
        companyAddress,
        companyWebsite
      })
    }

    const customerText = `Quote Saved Successfully${companyName ? ' - ' + companyName : ''}\n\n` +
      `Hi ${first_name},\n\n` +
      `Your boiler quote has been successfully saved. You can return anytime to complete your booking or make changes.\n\n` +
      `Your Details:\n` +
      `Name: ${first_name} ${last_name}\n` +
      `Email: ${email}\n` +
      (postcode ? `Postcode: ${postcode}\n` : '') +
      (submission_id ? `Reference: ${submission_id}\n` : '') +
      `\n${productsInfo ? 'Saved Products & Options:\n' + productsInfo + '\n\n' : ''}` +
      `Your Quote Benefits:\n` +
      `• Quote saved for 30 days - no pressure to decide now\n` +
      `• Prices locked in at current rates\n` +
      `• Easy to return and complete your booking\n` +
      `• Modify your selection anytime before booking\n` +
      `• Professional installation included\n` +
      `• Full warranty and aftercare support\n\n` +
      `Thank you for choosing ${companyName || 'our service'}! We're here whenever you're ready to proceed.`

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
        const adminText = `Customer Saved Quote - Follow Up${companyName ? ' - ' + companyName : ''}\n\n` +
          `A customer has saved their boiler quote - great follow-up opportunity!\n\n` +
          `Customer Information:\n` +
          `Name: ${first_name} ${last_name}\n` +
          `Email: ${email}\n` +
          (postcode ? `Postcode: ${postcode}\n` : '') +
          (submission_id ? `Reference: ${submission_id}\n` : '') +
          `\n${productsInfo ? 'Saved Products & Options:\n' + productsInfo + '\n\n' : ''}` +
          `Action Required: Contact customer within 24-48 hours to help convert the quote into a booking. ` +
          `High conversion opportunity - customer has shown strong interest by saving their quote.`

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
    console.error('Save quote email error:', error)
    return NextResponse.json({ error: 'Failed to send save quote email', details: error?.message || String(error) }, { status: 500 })
  }
}