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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { 
      first_name, 
      last_name, 
      email, 
      phone,
      postcode, 
      enquiry_details,
      submission_id,
      category,
      uploaded_image_urls,
      subdomain: bodySubdomain 
    } = body || {}

    const hostname = parseHostname(request, bodySubdomain)
    console.log('enquiry-submitted - Parsed hostname:', hostname);
    
    if (!hostname) {
      return NextResponse.json({ error: 'Missing hostname' }, { status: 400 })
    }

    const supabase = await createClient()
    const partner = await resolvePartnerByHostname(supabase, hostname)
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found for this domain' }, { status: 400 })
    }

    const companyName: string | undefined = partner.company_name || undefined
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

    const categoryName = category || 'boiler'
    const subject = `Enquiry Complete - Your ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Installation${companyName ? ' with ' + companyName : ''}`

    const formatEnquiryDetails = (details: any) => {
      if (!details || typeof details !== 'object') return 'No additional details provided'
      
      const formatted = []
      Object.entries(details).forEach(([key, value]) => {
        if (value) {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
          formatted.push(`${formattedKey}: ${value}`)
        }
      })
      return formatted.join('\n')
    }

    const formatUploadedImages = (imageUrls: Record<number, string[]>) => {
      if (!imageUrls || Object.keys(imageUrls).length === 0) {
        return 'No images uploaded'
      }

      const imageAreaTitles = [
        'Gas meter area',
        'Front of property',
        'Hot water tank', 
        'Existing controls/thermostat',
        'Existing pump/valves',
        'Rear of property'
      ]

      const formatted = []
      Object.entries(imageUrls).forEach(([areaIndex, urls]) => {
        const areaTitle = imageAreaTitles[parseInt(areaIndex)] || `Area ${areaIndex}`
        formatted.push(`${areaTitle}:`)
        urls.forEach((url, index) => {
          formatted.push(`  • Image ${index + 1}: ${url}`)
        })
      })
      return formatted.join('\n')
    }

    const enquiryInfo = formatEnquiryDetails(enquiry_details)
    const imagesInfo = formatUploadedImages(uploaded_image_urls || {})

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #f8fafc; padding: 32px 24px; text-align: center;">
          <div style="background: #10b981; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px; font-weight: bold;">📋</span>
          </div>
          <h1 style="color: #1f2937; font-size: 28px; font-weight: 600; margin: 0;">Enquiry Complete!</h1>
          <p style="color: #6b7280; font-size: 16px; margin: 8px 0 0 0;">Your ${categoryName} installation enquiry has been submitted${companyName ? ' to ' + companyName : ''}</p>
        </div>
        
        <div style="padding: 32px 24px;">
          <div style="margin-bottom: 32px;">
            <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Your Details</h2>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${first_name} ${last_name}</p>
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
              ${phone ? `<p style="margin: 0 0 8px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
              ${postcode ? `<p style="margin: 0;"><strong>Postcode:</strong> ${postcode}</p>` : ''}
            </div>
          </div>

          <div style="margin-bottom: 32px;">
            <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Enquiry Details</h2>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
              <pre style="font-family: inherit; margin: 0; white-space: pre-wrap; color: #374151;">${enquiryInfo}</pre>
            </div>
          </div>

          <div style="margin-bottom: 32px;">
            <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Uploaded Images</h2>
            <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
              <pre style="font-family: inherit; margin: 0; white-space: pre-wrap; color: #374151;">${imagesInfo}</pre>
            </div>
          </div>

          ${submission_id ? `
          <div style="margin-bottom: 32px;">
            <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Reference Number</h2>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">${submission_id}</p>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">Keep this reference number for your records</p>
            </div>
          </div>
          ` : ''}

          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">What happens next?</h3>
            <ul style="color: #92400e; margin: 0; padding-left: 20px;">
              <li>We'll review your enquiry and uploaded images</li>
              <li>Our technical team will assess your requirements</li>
              <li>We'll contact you within 24-48 hours to discuss details</li>
              <li>We'll arrange a site survey at your convenience</li>
              <li>You'll receive a detailed quote and installation plan</li>
              <li>We'll schedule your ${categoryName} installation</li>
            </ul>
          </div>
        </div>
        
        <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            Thank you for choosing ${companyName || 'our service'}! If you have any questions, please don't hesitate to contact us.
          </p>
        </div>
      </div>
    `

    const text = `Enquiry Complete - Your ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Installation${companyName ? ' with ' + companyName : ''}\n\n` +
      `Hi ${first_name},\n\n` +
      `Thank you for completing your ${categoryName} installation enquiry! We've received your details and uploaded images.\n\n` +
      `Your Details:\n` +
      `Name: ${first_name} ${last_name}\n` +
      `Email: ${email}\n` +
      (phone ? `Phone: ${phone}\n` : '') +
      (postcode ? `Postcode: ${postcode}\n` : '') +
      `\nEnquiry Details:\n${enquiryInfo}\n\n` +
      `Uploaded Images:\n${imagesInfo}\n\n` +
      (submission_id ? `Reference Number: ${submission_id}\n\n` : '') +
      `What happens next?\n` +
      `• We'll review your enquiry and uploaded images\n` +
      `• Our technical team will assess your requirements\n` +
      `• We'll contact you within 24-48 hours to discuss details\n` +
      `• We'll arrange a site survey at your convenience\n` +
      `• You'll receive a detailed quote and installation plan\n` +
      `• We'll schedule your ${categoryName} installation\n\n` +
      `Thank you for choosing ${companyName || 'our service'}!`

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

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Enquiry submission email error:', error)
    return NextResponse.json({ error: 'Failed to send enquiry submission email', details: error?.message || String(error) }, { status: 500 })
  }
}