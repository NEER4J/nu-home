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

    const subject = `Your boiler quote request${companyName ? ' - ' + companyName : ''}`
    
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

    const html = `
      <div>
        <p>Hi ${first_name ? String(first_name) : ''},</p>
        <p>Thank you for requesting a boiler quote${companyName ? ' with <strong>' + companyName + '</strong>' : ''}.</p>
        <p>We have received your initial information and will verify your phone number next.</p>
        
        <div style="margin: 20px 0;">
          <h3>Your Details:</h3>
          <p><strong>Name:</strong> ${first_name} ${last_name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
          ${postcode ? `<p><strong>Postcode:</strong> ${postcode}</p>` : ''}
        </div>

        ${addressInfo ? `<div style="margin: 20px 0;"><h3>Property Details:</h3><pre style="background:#f9fafb;padding:12px;border:1px solid #e5e7eb;border-radius:8px;">${addressInfo}</pre></div>` : ''}
        
        ${quoteInfo ? `<div style="margin: 20px 0;"><h3>Quote Information:</h3><pre style="background:#f9fafb;padding:12px;border:1px solid #e5e7eb;border-radius:8px;">${quoteInfo}</pre></div>` : ''}
        
        <p>We will be in touch shortly after phone verification.</p>
      </div>
    `

    const text = `Hi ${first_name ? String(first_name) : ''},\n` +
      `Thank you for requesting a boiler quote${companyName ? ' with ' + companyName : ''}.\n` +
      `We have received your initial information and will verify your phone number next.\n\n` +
      `Your Details:\n` +
      `Name: ${first_name} ${last_name}\n` +
      `Email: ${email}\n` +
      (phone ? `Phone: ${phone}\n` : '') +
      (postcode ? `Postcode: ${postcode}\n` : '') +
      (addressInfo ? `\nProperty Details:\n${addressInfo}\n` : '') +
      (quoteInfo ? `\nQuote Information:\n${quoteInfo}\n` : '') +
      `\nWe will be in touch shortly after phone verification.`

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
    console.error('Initial quote email error:', error)
    return NextResponse.json({ error: 'Failed to send initial quote email', details: error?.message || String(error) }, { status: 500 })
  }
}