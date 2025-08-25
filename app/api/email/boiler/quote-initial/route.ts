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
      city,
      form_answers,
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
    const companyPhone: string | undefined = partner.phone || undefined
    const companyWebsite: string | undefined = partner.website_url || undefined
    const companyDescription: string | undefined = partner.business_description || undefined
    
    if (!partner.smtp_settings) {
      return NextResponse.json({ error: 'SMTP settings not configured' }, { status: 400 })
    }

    const decrypted = decryptObject(partner.smtp_settings || {})
    const smtp: NormalizedSmtp = migrateSmtp(decrypted)
    if (!smtp.SMTP_HOST || !smtp.SMTP_USER || !smtp.SMTP_PASSWORD) {
      return NextResponse.json({ error: 'Incomplete SMTP settings' }, { status: 400 })
    }

    const transporter = nodemailer.createTransporter({
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

    const subject = `Your boiler quote request${companyName ? ' - ' + companyName : ''}`
    
    // Format form answers for display
    const formAnswersHtml = form_answers && Object.keys(form_answers).length > 0 
      ? Object.entries(form_answers).map(([key, value]) => {
          const question = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          return `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${question}:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${String(value)}</td></tr>`
        }).join('')
      : '<tr><td colspan="2" style="padding: 8px; text-align: center; color: #6b7280;">No additional questions answered</td></tr>'

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          ${companyName ? `<h1 style="color: #1f2937; margin: 0;">${companyName}</h1>` : ''}
          ${companyDescription ? `<p style="color: #6b7280; margin: 10px 0 0 0;">${companyDescription}</p>` : ''}
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Quote Request Received</h2>
          <p style="color: #374151; margin: 0 0 15px 0;">Hi ${first_name ? String(first_name) : ''},</p>
          <p style="color: #374151; margin: 0 0 15px 0;">Thank you for submitting your boiler quote request. We have received your information and will process it shortly.</p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin: 0; padding: 20px 20px 10px 20px; border-bottom: 1px solid #e5e7eb;">Your Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 20px; border-bottom: 1px solid #e5e7eb;"><strong>Name:</strong></td><td style="padding: 8px 20px; border-bottom: 1px solid #e5e7eb;">${first_name ? String(first_name) : ''} ${last_name ? String(last_name) : ''}</td></tr>
            <tr><td style="padding: 8px 20px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td><td style="padding: 8px 20px; border-bottom: 1px solid #e5e7eb;">${email || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px 20px; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td><td style="padding: 8px 20px; border-bottom: 1px solid #e5e7eb;">${phone || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px 20px; border-bottom: 1px solid #e5e7eb;"><strong>Postcode:</strong></td><td style="padding: 8px 20px; border-bottom: 1px solid #e5e7eb;">${postcode || 'Not provided'}</td></tr>
            ${city ? `<tr><td style="padding: 8px 20px; border-bottom: 1px solid #e5e7eb;"><strong>City:</strong></td><td style="padding: 8px 20px; border-bottom: 1px solid #e5e7eb;">${city}</td></tr>` : ''}
          </table>
        </div>

        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin: 0; padding: 20px 20px 10px 20px; border-bottom: 1px solid #e5e7eb;">Quote Requirements</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${formAnswersHtml}
          </table>
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #1e40af; margin: 0 0 15px 0;">Next Steps</h3>
          <p style="color: #1e40af; margin: 0 0 10px 0;">1. We will review your requirements</p>
          <p style="color: #1e40af; margin: 0 0 10px 0;">2. Our team will prepare your personalized quote</p>
          <p style="color: #1e40af; margin: 0 0 15px 0;">3. You will receive your quote within 24-48 hours</p>
        </div>

        ${companyPhone || companyWebsite ? `
        <div style="text-align: center; padding: 20px; background: #f9fafb; border-radius: 8px;">
          <p style="color: #6b7280; margin: 0 0 10px 0;">Need immediate assistance?</p>
          ${companyPhone ? `<p style="color: #1f2937; margin: 0 0 5px 0;"><strong>Phone:</strong> ${companyPhone}</p>` : ''}
          ${companyWebsite ? `<p style="color: #1f2937; margin: 0;"><strong>Website:</strong> <a href="${companyWebsite}" style="color: #3b82f6;">${companyWebsite}</a></p>` : ''}
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            This email was sent from your quote request form.
            ${companyName ? `© ${new Date().getFullYear()} ${companyName}. All rights reserved.` : ''}
          </p>
        </div>
      </div>
    `

    const text = `Quote Request Received\n\n` +
      `Hi ${first_name ? String(first_name) : ''},\n\n` +
      `Thank you for submitting your boiler quote request. We have received your information and will process it shortly.\n\n` +
      `Your Details:\n` +
      `Name: ${first_name ? String(first_name) : ''} ${last_name ? String(last_name) : ''}\n` +
      `Email: ${email || 'Not provided'}\n` +
      `Phone: ${phone || 'Not provided'}\n` +
      `Postcode: ${postcode || 'Not provided'}\n` +
      `${city ? `City: ${city}\n` : ''}` +
      `\nQuote Requirements:\n` +
      (form_answers && Object.keys(form_answers).length > 0 
        ? Object.entries(form_answers).map(([key, value]) => {
            const question = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            return `${question}: ${String(value)}`
          }).join('\n')
        : 'No additional questions answered') +
      `\n\nNext Steps:\n` +
      `1. We will review your requirements\n` +
      `2. Our team will prepare your personalized quote\n` +
      `3. You will receive your quote within 24-48 hours\n\n` +
      `${companyPhone ? `Need immediate assistance? Phone: ${companyPhone}\n` : ''}` +
      `${companyWebsite ? `Website: ${companyWebsite}\n` : ''}` +
      `\nThis email was sent from your quote request form.` +
      `${companyName ? `\n© ${new Date().getFullYear()} ${companyName}. All rights reserved.` : ''}`

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
    console.error('Quote initial email error:', error)
    return NextResponse.json({ error: 'Failed to send quote initial email', details: error?.message || String(error) }, { status: 500 })
  }
}
