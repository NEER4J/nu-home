import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { decryptObject } from '@/lib/encryption'
import { resolvePartnerByHostname } from '@/lib/partner'
import { getProcessedEmailTemplate, buildQuoteLink } from '@/lib/email-templates'
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
  refNumber: string
  companyName?: string
  logoUrl?: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  postcode?: string
  companyColor?: string
  privacyPolicy?: string
  termsConditions?: string
  companyPhone?: string
  companyEmail?: string
  companyAddress?: string
  companyWebsite?: string
  baseUrl?: string
  submissionId?: string
}) {
  const {
    refNumber,
    companyName,
    logoUrl,
    firstName,
    lastName,
    email,
    phone,
    postcode,
    companyColor = '#3b82f6',
    privacyPolicy,
    termsConditions,
    companyPhone,
    companyEmail,
    companyAddress,
    companyWebsite,
    baseUrl,
    submissionId
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
      <title>Boiler Quote Request</title>
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
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                    Hi ${firstName ? firstName : 'there'},
                  </p>
                  
                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    Excellent decision on requesting your free boiler quote.
                  </p>

                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    We know that when you need a boiler, finding a reliable company who you can trust can be a challenge, so our goal at ${companyName || 'our company'} is to make the process as simple and stress free as possible.
                  </p>

                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    Here are a few things you should know about us before you buy your new boiler:
                  </p>

                  <div style="margin-bottom: 30px;">
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                      ✓ We are a local company and have built our reputation by going above and beyond for our customers. We take care of everything and even have incredible aftercare so you know you are always in safe hands.
                    </p>
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                      ✓ Every single job is audited before and after by our qualified team to make sure it meets our high standards.
                    </p>
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                      ✓ We offer a PRICE MATCH PROMISE. If you stumble across a better price, just reply to this email with your quote attached and we'll better it, or send you a £50 voucher if we can't.
                    </p>
                  </div>

                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    Want to know more about why we are the best choice for your new boiler?
                  </p>

                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    Check out our <strong>website</strong> and if you have any questions, simply reply to this email and we'll reply as soon as possible.
                  </p>

                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    Or give us a call on <strong>${companyPhone || 'our phone number'}</strong>.
                  </p>

                  <!-- Simple Information Table -->
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
                          <tr>
                            <td style="padding: 12px 15px; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Reference:</td>
                            <td style="padding: 12px 15px; color: #6b7280;">${refNumber}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${baseUrl && submissionId ? `
                  <!-- View Quote Button -->
                  <div style="text-align: center; margin-bottom: 30px;">
                    <a href="${baseUrl}/boiler/products?submission=${submissionId}" style="display: inline-block; background-color: ${headerColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; line-height: 1;">
                      View Your Quote & Select Products
                    </a>
                  </div>
                  ` : ''}

                  <!-- Contact Information Section -->
                  <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #0c4a6e; text-align: center;">
                      Have a question?
                    </h3>
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #0c4a6e; text-align: center; line-height: 1.6;">
                      Contact us via Live Chat, give us a ring on <strong>${companyPhone || 'our phone number'}</strong>, or drop us an email at <strong>${companyEmail || 'our email'}</strong>.
                    </p>
                    <div style="text-align: center;">
                      <a href="tel:${companyPhone || ''}" style="display: inline-block; background-color: white; color: ${headerColor}; border: 2px solid ${headerColor}; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 0 10px; font-weight: 600;">
                        📞 Call us
                      </a>
                      <a href="mailto:${companyEmail || ''}" style="display: inline-block; background-color: ${headerColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 0 10px; font-weight: 600;">
                        ✉️ Mail us
                      </a>
                    </div>
                  </div>

                  <p style="margin: 30px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    We will be in touch shortly after phone verification to discuss your requirements in detail.
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
  refNumber: string
  companyName?: string
  logoUrl?: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  postcode?: string
  addressInfo: string
  quoteInfo: string
  companyColor?: string
  submissionDate: string
  privacyPolicy?: string
  termsConditions?: string
  companyAddress?: string
  companyWebsite?: string
}) {
  const {
    refNumber,
    companyName,
    logoUrl,
    firstName,
    lastName,
    email,
    phone,
    postcode,
    addressInfo,
    quoteInfo,
    companyColor = '#3b82f6',
    submissionDate,
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
      <title>New Boiler Quote Request - Admin</title>
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
                    New Boiler Quote Request Received
                  </h2>
                  
                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    A new boiler quote request has been submitted${companyName ? ' for <strong>' + companyName + '</strong>' : ''}. 
                    Please review the details below and contact the customer for phone verification.
                  </p>

                  <!-- Customer Details Table -->
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
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Submission Date:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${submissionDate}</td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 15px; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Reference:</td>
                            <td style="padding: 12px 15px; color: #6b7280;">${refNumber}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${addressInfo ? `
                  <!-- Property Details Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Property Details
                      </td>
                    </tr>
                    <tr>
                      <td style="border: 1px solid ${borderColor}; border-top: none; padding: 15px; color: #6b7280; line-height: 1.6;">
                        ${addressInfo.replace(/\n/g, '<br>')}
                      </td>
                    </tr>
                  </table>
                  ` : ''}

                  ${quoteInfo ? `
                  <!-- Quote Information Section -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid ${borderColor};">
                        Quote Information
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          ${quoteInfo.split('\n').map((line, index) => {
                            if (!line.trim()) return ''
                            const parts = line.split(': ')
                            if (parts.length >= 2) {
                              const question = parts[0]
                              const answer = parts.slice(1).join(': ')
                              return `
                            <tr>
                              <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa; vertical-align: top;">${question}:</td>
                              <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280; line-height: 1.6;">${answer}</td>
                            </tr>
                          `
                            }
                            return ''
                          }).join('')}
                        </table>
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
      
      // Legacy fields for backward compatibility
      first_name, 
      last_name, 
      quote_data,
      address_data,
      questions,
      submission_id,
      subdomain: bodySubdomain,
      is_iframe
    } = body || {}

    // Use new fields if available, fallback to legacy fields
    const finalFirstName = firstName || first_name
    const finalLastName = lastName || last_name
    const finalSubmissionId = submissionId || submission_id
    const finalQuoteData = quoteData || quote_data

    const hostname = parseHostname(request, bodySubdomain)
    console.log('quote-initial - Parsed hostname:', hostname);
    
    if (!hostname) {
      return NextResponse.json({ error: 'Missing hostname' }, { status: 400 })
    }

    const supabase = await createClient()
    const partner = await resolvePartnerByHostname(supabase, hostname)
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

    // Use submission_id as reference number, or generate one if not provided
    const refNumber = finalSubmissionId || `BOILER-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const finalSubmissionDate = submissionDate || new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const formatQuoteData = (quoteData: Record<string, any>, questionsList: any[]) => {
      if (!quoteData || !questionsList) return ''
      
      const formattedAnswers: string[] = []
      
      Object.entries(quoteData).forEach(([questionId, answer]) => {
          // Filter out non-question data like postcode, address, etc.
          const question = questionsList.find((q: any) => q.question_id === questionId)
        if (question !== undefined && answer !== null && answer !== undefined && answer !== '') {
          const questionText = question?.question_text || questionId
          const formattedAnswer = Array.isArray(answer) ? answer.join(', ') : String(answer)
          formattedAnswers.push(`${questionText}: ${formattedAnswer}`)
        }
        })
      
      return formattedAnswers.join('\n')
    }
    
    // Use pre-formatted quote data if available, otherwise format from raw data
    const quoteInfo = finalQuoteData || formatQuoteData(quote_data, questions || [])

    const addressInfo = address_data ? Object.entries(address_data)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n') : ''

    // Build base URL for the quote link
    const baseUrl = partner.custom_domain && partner.domain_verified 
      ? `https://${partner.custom_domain}`
      : partner.subdomain 
        ? `https://${partner.subdomain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'yourdomain.com'}`
        : null

    // Get service category ID for boiler
    const { data: boilerCategory } = await supabase
      .from('ServiceCategories')
      .select('service_category_id')
      .eq('slug', 'boiler')
      .single()

    // Get category-specific settings from PartnerSettings
    let adminEmail: string | undefined = undefined
    let mainPageUrl: string | null = null
    if (boilerCategory) {
      const { data: partnerSettings } = await supabase
        .from('PartnerSettings')
        .select('admin_email, main_page_url')
        .eq('partner_id', partner.user_id)
        .eq('service_category_id', boilerCategory.service_category_id)
        .single()

      adminEmail = partnerSettings?.admin_email || undefined
      mainPageUrl = partnerSettings?.main_page_url || null
    }

    const finalQuoteLink = quoteLink || buildQuoteLink(
      partner.custom_domain || null,
      partner.domain_verified || null,
      partner.subdomain || null,
      finalSubmissionId,
      'boiler',
      mainPageUrl,
      is_iframe
    )

    const companyEmail: string | undefined = adminEmail || undefined

    // Prepare template data with new standardized field structure
    const templateData = {
      // User Information fields
      firstName: finalFirstName,
      lastName: finalLastName,
      email,
      phone,
      postcode,
      fullAddress: fullAddress || addressInfo,
      submissionId: finalSubmissionId,
      submissionDate: finalSubmissionDate,
      
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
      quoteData: quoteInfo,
      quoteLink: finalQuoteLink,
      
      // Legacy fields for backward compatibility
      refNumber,
      addressInfo,
    }

    // Try to get custom customer template first
    let customerSubject = `Your boiler quote request${companyName ? ' - ' + companyName : ''}`
    let customerHtml = ''
    let customerText = ''

    if (boilerCategory) {
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
    }

    // Fallback to hardcoded template if no custom template
    if (!customerHtml) {
      customerHtml = createCustomerEmailTemplate({
        refNumber,
        companyName,
        logoUrl,
        firstName: finalFirstName,
        lastName: finalLastName,
        email,
        phone,
        postcode,
        companyColor,
        privacyPolicy,
        termsConditions,
        companyPhone,
        companyEmail,
        companyAddress,
        companyWebsite,
        baseUrl: baseUrl || undefined,
        submissionId: finalSubmissionId
      })
    }

    // Fallback customerText only if no custom template
    if (!customerText) {
      customerText = `Hi ${finalFirstName ? String(finalFirstName) : 'there'},\n` +
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
      `Name: ${finalFirstName} ${finalLastName}\n` +
      `Email: ${email}\n` +
      (phone ? `Phone: ${phone}\n` : '') +
      (postcode ? `Postcode: ${postcode}\n` : '') +
      `\nWe will be in touch shortly after phone verification.\n\n` +
        `Reference: ${refNumber}` +
      (companyName ? `\n${companyName}` : '') +
      `\n\nThis is an automated email. Please do not reply to this message.`
    }

    try {
      await transporter.sendMail({
        from: smtp.SMTP_FROM || smtp.SMTP_USER,
        to: email,
        subject: customerSubject,
        text: customerText,
        html: customerHtml,
      })
    } catch (sendErr: any) {
      console.error('Failed to send customer email:', sendErr?.message || String(sendErr))
    }

    // Send detailed email to admin if admin email is configured
    if (adminEmail) {
      // Try to get custom admin template first
      let adminSubject = `New Boiler Quote Request${companyName ? ' - ' + companyName : ''}`
      let adminHtml = ''
      let adminText = ''

      if (boilerCategory) {
        const customAdminTemplate = await getProcessedEmailTemplate(
          partner.user_id,
          'boiler',
          'quote-initial',
          'admin',
          templateData
        )

        if (customAdminTemplate) {
          adminSubject = customAdminTemplate.subject
          adminHtml = customAdminTemplate.html
          adminText = customAdminTemplate.text
        }
      }

      // Fallback to hardcoded template if no custom template
      if (!adminHtml) {
        adminHtml = createAdminEmailTemplate({
          refNumber,
          companyName,
          logoUrl,
          firstName: finalFirstName,
          lastName: finalLastName,
          email,
          phone,
          postcode,
          addressInfo,
          quoteInfo,
          companyColor,
          submissionDate: finalSubmissionDate,
          privacyPolicy,
          termsConditions,
          companyAddress,
          companyWebsite
        })
      }

      // Fallback adminText only if no custom template
      if (!adminText) {
        adminText = `New Boiler Quote Request Received\n\n` +
          `Reference: ${refNumber}\n` +
          `Company: ${companyName || 'N/A'}\n` +
          `Submission Date: ${finalSubmissionDate}\n\n` +
          `Customer Details:\n` +
          `Name: ${finalFirstName} ${finalLastName}\n` +
          `Email: ${email}\n` +
          (phone ? `Phone: ${phone}\n` : '') +
          (postcode ? `Postcode: ${postcode}\n` : '') +
          (addressInfo ? `\nProperty Details:\n${addressInfo}\n` : '') +
          (quoteInfo ? `\nQuote Information:\n${quoteInfo}\n` : '') +
          `\nReference: ${refNumber}` +
          (companyName ? `\n${companyName}` : '') +
          `\n\nThis is an automated notification. Please respond to the customer directly.`
      }

      try {
        await transporter.sendMail({
          from: smtp.SMTP_FROM || smtp.SMTP_USER,
          to: adminEmail,
          subject: adminSubject,
          text: adminText,
          html: adminHtml,
        })
      } catch (sendErr: any) {
        console.error('Failed to send admin email:', sendErr?.message || String(sendErr))
      }
    }

    return NextResponse.json({ success: true, refNumber })
  } catch (error: any) {
    console.error('Initial quote email error:', error)
    return NextResponse.json({ error: 'Failed to send initial quote email', details: error?.message || String(error) }, { status: 500 })
  }
}