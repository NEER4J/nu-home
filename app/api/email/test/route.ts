import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { decryptObject } from '@/lib/encryption'
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
    console.log('=== TEST EMAIL DEBUG START ===')
    
    const supabase = await createClient()
    console.log('Test email - Supabase client created')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Test email - Auth result:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      authError 
    })
    
    if (!user) {
      console.log('Test email - No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, subject, html, text } = body
    console.log('Test email - Request body:', { to, subject: subject?.substring(0, 50) + '...', htmlLength: html?.length, textLength: text?.length })

    if (!to || !subject || !html) {
      console.log('Test email - Missing required fields:', { to: !!to, subject: !!subject, html: !!html })
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    // Get partner profile directly using authenticated user ID
    console.log('Test email - Querying UserProfiles for user ID:', user.id)
    
    const { data: partner, error: partnerError } = await supabase
      .from('UserProfiles')
      .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color, otp, smtp_settings, twilio_settings, custom_domain, domain_verified, privacy_policy, terms_conditions, address, status')
      .eq('user_id', user.id)
      .single()
    
    console.log('Test email - UserProfiles query result:', { 
      partner: partner ? { 
        company_name: partner.company_name, 
        user_id: partner.user_id, 
        status: partner.status,
        has_smtp: !!partner.smtp_settings 
      } : null, 
      partnerError 
    })
    
    if (partnerError) {
      console.log('Test email - Database error details:', partnerError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: partnerError.message,
        code: partnerError.code 
      }, { status: 500 })
    }
    
    if (!partner) {
      console.log('Test email - No partner profile found for user ID:', user.id)
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }
    
    console.log('Test email - Partner found successfully:', partner.company_name, 'status:', partner.status)

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

    console.log('Test email - Email sent successfully to:', to)
    console.log('=== TEST EMAIL DEBUG END ===')
    
    return NextResponse.json({ 
      success: true, 
      message: `Test email sent successfully to ${to}` 
    })

  } catch (error: any) {
    console.error('=== TEST EMAIL ERROR ===')
    console.error('Test email error:', error)
    console.error('Error stack:', error?.stack)
    console.error('=== TEST EMAIL ERROR END ===')
    
    return NextResponse.json(
      { 
        error: 'Failed to send test email', 
        details: error?.message || String(error) 
      },
      { status: 500 }
    )
  }
}