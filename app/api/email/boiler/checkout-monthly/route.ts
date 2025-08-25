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
      order_details,
      payment_plan,
      installation_date,
      submission_id,
      subdomain: bodySubdomain 
    } = body || {}

    const hostname = parseHostname(request, bodySubdomain)
    console.log('checkout-monthly - Parsed hostname:', hostname);
    
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

    const subject = `Monthly Payment Plan Confirmed - Your Boiler Installation${companyName ? ' with ' + companyName : ''}`
    
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

    const orderInfo = formatOrderDetails(order_details)
    const paymentPlanInfo = formatPaymentPlan(payment_plan)
    const installationInfo = installation_date ? `Scheduled installation date: ${new Date(installation_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : ''

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #f8fafc; padding: 32px 24px; text-align: center;">
          <div style="background: #10b981; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px; font-weight: bold;">📅</span>
          </div>
          <h1 style="color: #1f2937; font-size: 28px; font-weight: 600; margin: 0;">Monthly Payment Plan Confirmed!</h1>
          <p style="color: #6b7280; font-size: 16px; margin: 8px 0 0 0;">Your boiler installation has been booked${companyName ? ' with ' + companyName : ''}</p>
        </div>
        
        <div style="padding: 32px 24px;">
          <div style="margin-bottom: 32px;">
            <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Customer Details</h2>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${first_name} ${last_name}</p>
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
              ${phone ? `<p style="margin: 0 0 8px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
              ${postcode ? `<p style="margin: 0;"><strong>Postcode:</strong> ${postcode}</p>` : ''}
            </div>
          </div>

          ${installationInfo ? `
          <div style="margin-bottom: 32px;">
            <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Installation Details</h2>
            <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
              <p style="margin: 0; color: #1f2937;">${installationInfo}</p>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">Our installers will arrive between 8-10am and the installation typically takes 1-2 days to complete.</p>
            </div>
          </div>
          ` : ''}

          <div style="margin-bottom: 32px;">
            <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Order Summary</h2>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
              <pre style="font-family: inherit; margin: 0; white-space: pre-wrap; color: #374151;">${orderInfo}</pre>
            </div>
          </div>

          <div style="margin-bottom: 32px;">
            <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Payment Plan Details</h2>
            <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
              <pre style="font-family: inherit; margin: 0; white-space: pre-wrap; color: #374151;">${paymentPlanInfo}</pre>
              <div style="margin-top: 16px; padding: 12px; background: #ecfdf5; border-radius: 6px;">
                <p style="margin: 0; color: #047857; font-size: 14px; font-weight: 500;">💡 Payment Setup</p>
                <p style="margin: 8px 0 0 0; color: #065f46; font-size: 14px;">We'll contact you within 24 hours to set up your monthly payment plan and direct debit details.</p>
              </div>
            </div>
          </div>

          ${submission_id ? `
          <div style="margin-bottom: 32px;">
            <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Booking Reference</h2>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">${submission_id}</p>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">Keep this reference number for your records</p>
            </div>
          </div>
          ` : ''}

          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">What happens next?</h3>
            <ul style="color: #92400e; margin: 0; padding-left: 20px;">
              <li>We'll contact you within 24 hours to set up payment details</li>
              <li>Direct debit will be arranged for your monthly payments</li>
              <li>Our team will contact you 24-48 hours before installation</li>
              <li>Our certified engineers will arrive on your scheduled date</li>
              <li>Installation will be completed with full warranty</li>
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

    const text = `Monthly Payment Plan Confirmed - Your Boiler Installation${companyName ? ' with ' + companyName : ''}\n\n` +
      `Hi ${first_name},\n\n` +
      `Great news! Your monthly payment plan has been set up and your boiler installation is now booked.\n\n` +
      `Customer Details:\n` +
      `Name: ${first_name} ${last_name}\n` +
      `Email: ${email}\n` +
      (phone ? `Phone: ${phone}\n` : '') +
      (postcode ? `Postcode: ${postcode}\n` : '') +
      `\n${installationInfo ? installationInfo + '\n\n' : ''}` +
      `Order Summary:\n${orderInfo}\n\n` +
      `Payment Plan Details:\n${paymentPlanInfo}\n\n` +
      (submission_id ? `Booking Reference: ${submission_id}\n\n` : '') +
      `What happens next?\n` +
      `• We'll contact you within 24 hours to set up payment details\n` +
      `• Direct debit will be arranged for your monthly payments\n` +
      `• Our team will contact you 24-48 hours before installation\n` +
      `• Our certified engineers will arrive on your scheduled date\n` +
      `• Installation will be completed with full warranty\n\n` +
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
    console.error('Monthly checkout email error:', error)
    return NextResponse.json({ error: 'Failed to send monthly checkout email', details: error?.message || String(error) }, { status: 500 })
  }
}