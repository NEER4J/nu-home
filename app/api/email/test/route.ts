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
  // Return hostname even for localhost (for development)
  if (!hostname) return null
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, subject, html, text, subdomain } = body

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    // Get partner profile and SMTP settings
    const hostname = parseHostname(request, subdomain)
    console.log('Test email - Request host:', request.headers.get('host'))
    console.log('Test email - Request URL:', request.url)
    console.log('Test email - Body subdomain:', subdomain)
    console.log('Test email - Parsed hostname:', hostname)
    
    if (!hostname) {
      return NextResponse.json({ error: 'Invalid hostname' }, { status: 400 })
    }

    let partner = await resolvePartnerByHostname(supabase, hostname)
    console.log('Test email - Partner found by hostname:', partner ? partner.company_name : 'null')
    
    // If no partner found by hostname and we're in localhost (development), 
    // try to get partner by authenticated user
    if (!partner && (hostname === 'localhost' || hostname.includes('localhost'))) {
      console.log('Test email - No partner found by hostname, trying to get by user ID')
      const { data: userPartner, error: userError } = await supabase
        .from('UserProfiles')
        .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color, otp, smtp_settings, twilio_settings, custom_domain, domain_verified, admin_mail, privacy_policy, terms_conditions, address')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      
      if (!userError && userPartner) {
        partner = userPartner
        console.log('Test email - Partner found by user ID:', partner.company_name)
      } else {
        console.log('Test email - No partner found by user ID, error:', userError)
      }
    }
    
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    if (!partner.smtp_settings) {
      return NextResponse.json(
        { error: 'SMTP settings not configured. Please configure email settings first.' },
        { status: 400 }
      )
    }

    // Decrypt SMTP settings
    const decrypted = decryptObject(partner.smtp_settings)
    const smtp: NormalizedSmtp = migrateSmtp(decrypted)
    
    if (!smtp.SMTP_HOST || !smtp.SMTP_USER || !smtp.SMTP_PASSWORD) {
      return NextResponse.json(
        { error: 'Incomplete SMTP settings. Please check your email configuration.' },
        { status: 400 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtp.SMTP_HOST,
      port: smtp.SMTP_PORT,
      secure: smtp.SMTP_SECURE,
      auth: { user: smtp.SMTP_USER, pass: smtp.SMTP_PASSWORD },
    })

    // Send test email
    await transporter.sendMail({
      from: smtp.SMTP_FROM || smtp.SMTP_USER,
      to,
      subject: `[TEST] ${subject}`,
      text: text || 'This is a test email from your email template system.',
      html,
    })

    return NextResponse.json({ 
      success: true, 
      message: `Test email sent successfully to ${to}` 
    })

  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send test email', 
        details: error?.message || String(error) 
      },
      { status: 500 }
    )
  }
}