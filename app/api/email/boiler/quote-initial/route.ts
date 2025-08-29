import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { decryptObject } from '@/lib/encryption'
import { resolvePartnerByHostname } from '@/lib/partner'
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

function generateReferenceNumber(): string {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `BOILER-${timestamp}-${random}`
}

function createEmailTemplate(data: {
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
    companyColor = '#3b82f6'
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
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, ${headerColor}, ${headerColor}dd); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  ${logoUrl ? `<img src="${logoUrl}" alt="${companyName || 'Company'}" style="max-height: 60px; max-width: 200px; margin-bottom: 15px;">` : ''}
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
                    ${companyName || 'Boiler Quote Request'}
                  </h1>
                  <p style="color: white; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                    Reference: <strong>${refNumber}</strong>
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                    Hi ${firstName ? firstName : 'there'},
                  </p>
                  
                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    Thank you for requesting a boiler quote${companyName ? ' with <strong>' + companyName + '</strong>' : ''}. 
                    We have received your initial information and will verify your phone number next.
                  </p>

                  <!-- Customer Details Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; border: 1px solid ${borderColor}; border-radius: 8px 8px 0 0; font-weight: 600; color: #374151;">
                        Customer Details
                      </td>
                    </tr>
                    <tr>
                      <td style="border: 1px solid ${borderColor}; border-top: none;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 30%; font-weight: 600; color: #374151;">Name:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${firstName} ${lastName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 30%; font-weight: 600; color: #374151;">Email:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${email}</td>
                          </tr>
                          ${phone ? `
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 30%; font-weight: 600; color: #374151;">Phone:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${phone}</td>
                          </tr>
                          ` : ''}
                          ${postcode ? `
                          <tr>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; width: 30%; font-weight: 600; color: #374151;">Postcode:</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid ${borderColor}; color: #6b7280;">${postcode}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${addressInfo ? `
                  <!-- Property Details Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; border: 1px solid ${borderColor}; border-radius: 8px 8px 0 0; font-weight: 600; color: #374151;">
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
                  <!-- Quote Information Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse;">
                    <tr>
                      <td style="background-color: ${backgroundColor}; padding: 15px; border: 1px solid ${borderColor}; border-radius: 8px 8px 0 0; font-weight: 600; color: #374151;">
                        Quote Information
                      </td>
                    </tr>
                    <tr>
                      <td style="border: 1px solid ${borderColor}; border-top: none; padding: 15px; color: #6b7280; line-height: 1.6;">
                        ${quoteInfo.replace(/\n/g, '<br>')}
                      </td>
                    </tr>
                  </table>
                  ` : ''}

                  <p style="margin: 30px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    We will be in touch shortly after phone verification to discuss your requirements in detail.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: ${backgroundColor}; padding: 30px; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0 0 15px 0; font-size: 14px; color: #6b7280;">
                    <strong>Reference Number:</strong> ${refNumber}
                  </p>
                  ${companyName ? `<p style="margin: 0 0 15px 0; font-size: 14px; color: #6b7280;"><strong>${companyName}</strong></p>` : ''}
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    This is an automated email. Please do not reply to this message.
                  </p>
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
      first_name, 
      last_name, 
      email, 
      phone,
      postcode, 
      quote_data,
      address_data,
      questions,
      subdomain: bodySubdomain 
    } = body || {}

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

    const refNumber = generateReferenceNumber()
    const subject = `Your boiler quote request${companyName ? ' - ' + companyName : ''} - ${refNumber}`
    
    const formatQuoteData = (quoteData: Record<string, any>, questionsList: any[]) => {
      if (!quoteData || !questionsList) return 'Quote details provided'
      
      return Object.entries(quoteData)
        .filter(([key, value]) => {
          // Filter out non-question data like postcode, address, etc.
          const question = questionsList.find((q: any) => q.question_id === key)
          return question !== undefined && value !== null && value !== undefined && value !== ''
        })
        .map(([questionId, answer]) => {
          const question = questionsList.find((q: any) => q.question_id === questionId)
          const questionText = question?.question_text || questionId
          return `${questionText}: ${Array.isArray(answer) ? answer.join(', ') : answer}`
        })
        .join('\n')
    }
    
    const quoteInfo = formatQuoteData(quote_data, questions || [])

    const addressInfo = address_data ? Object.entries(address_data)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n') : ''

    const html = createEmailTemplate({
      refNumber,
      companyName,
      logoUrl,
      firstName: first_name,
      lastName: last_name,
      email,
      phone,
      postcode,
      addressInfo,
      quoteInfo,
      companyColor
    })

    const text = `Hi ${first_name ? String(first_name) : 'there'},\n` +
      `Thank you for requesting a boiler quote${companyName ? ' with ' + companyName : ''}.\n` +
      `Reference Number: ${refNumber}\n\n` +
      `We have received your initial information and will verify your phone number next.\n\n` +
      `Your Details:\n` +
      `Name: ${first_name} ${last_name}\n` +
      `Email: ${email}\n` +
      (phone ? `Phone: ${phone}\n` : '') +
      (postcode ? `Postcode: ${postcode}\n` : '') +
      (addressInfo ? `\nProperty Details:\n${addressInfo}\n` : '') +
      (quoteInfo ? `\nQuote Information:\n${quoteInfo}\n` : '') +
      `\nWe will be in touch shortly after phone verification.\n\n` +
      `Reference Number: ${refNumber}` +
      (companyName ? `\n${companyName}` : '') +
      `\n\nThis is an automated email. Please do not reply to this message.`

    try {
      await transporter.sendMail({
        from: smtp.SMTP_FROM || smtp.SMTP_USER,
        to: toAddress,
        subject,
        text,
        html,
      })
    } catch (sendErr: any) {
      return NextResponse.json({ error: 'SMTP send failed', details: sendErr?.message || String(sendErr) }, { status: 400 })
    }

    return NextResponse.json({ success: true, refNumber })
  } catch (error: any) {
    console.error('Initial quote email error:', error)
    return NextResponse.json({ error: 'Failed to send initial quote email', details: error?.message || String(error) }, { status: 500 })
  }
}