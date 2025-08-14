import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { decryptObject } from '@/lib/encryption';
import { resolvePartnerByHostname } from '@/lib/partner';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

type SmtpSettings = {
  SMTP_HOST?: string;
  SMTP_PORT?: number | string;
  SMTP_SECURE?: boolean | string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM?: string;
  host?: string;
  port?: number | string;
  secure?: boolean | string;
  username?: string;
  user?: string;
  password?: string;
  from?: string;
  from_email?: string;
};

function parseHostname(request: NextRequest, bodySubdomain?: string | null): string | null {
  try {
    const url = new URL(request.url);
    const urlParamSubdomain = url.searchParams.get('subdomain');
    if (urlParamSubdomain) return urlParamSubdomain;
  } catch {}

  if (bodySubdomain) return bodySubdomain;

  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];
  if (!hostname || hostname === 'www' || hostname === 'localhost') return null;
  return hostname;
}

type NormalizedSmtp = {
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_FROM: string;
};

function migrateSmtp(raw: any): NormalizedSmtp {
  const merged: SmtpSettings = {
    SMTP_HOST: '',
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    SMTP_FROM: '',
    ...(raw || {}),
  };
  if (!merged.SMTP_HOST && raw?.host) merged.SMTP_HOST = raw.host;
  if (!merged.SMTP_PORT && (raw?.port || raw?.SMTP_PORT === 0)) merged.SMTP_PORT = Number(raw.port ?? raw.SMTP_PORT ?? 587);
  if (typeof merged.SMTP_SECURE !== 'boolean' && typeof raw?.secure === 'boolean') merged.SMTP_SECURE = raw.secure as boolean;
  if (!merged.SMTP_USER && (raw?.username || raw?.user)) merged.SMTP_USER = (raw.username ?? raw.user) as string;
  if (!merged.SMTP_PASSWORD && raw?.password) merged.SMTP_PASSWORD = raw.password as string;
  if (!merged.SMTP_FROM && (raw?.from_email || raw?.from)) merged.SMTP_FROM = (raw.from_email ?? raw.from) as string;
  // Normalize types
  const port = typeof merged.SMTP_PORT === 'string' ? parseInt(merged.SMTP_PORT, 10) : (merged.SMTP_PORT || 587);
  const secure = typeof merged.SMTP_SECURE === 'string' ? merged.SMTP_SECURE === 'true' : Boolean(merged.SMTP_SECURE);
  return {
    SMTP_HOST: String(merged.SMTP_HOST || ''),
    SMTP_PORT: Number.isFinite(port) ? port : 587,
    SMTP_SECURE: secure,
    SMTP_USER: String(merged.SMTP_USER || ''),
    SMTP_PASSWORD: String(merged.SMTP_PASSWORD || ''),
    SMTP_FROM: String(merged.SMTP_FROM || ''),
  };
}

// ENV fallback removed as requested. Always use DB-encrypted SMTP settings.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { to, subject, text, html, subdomain: bodySubdomain, productName } = body || {};

    const hostname = parseHostname(request, bodySubdomain);
    if (!hostname) {
      return NextResponse.json({ error: 'Missing hostname' }, { status: 400 });
    }

    const supabase = await createClient();
    const partner = await resolvePartnerByHostname(supabase, hostname);
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found for this domain' }, { status: 400 });
    }

    const companyName: string | undefined = partner.company_name || undefined;
    if (!partner.smtp_settings) {
      return NextResponse.json({ error: 'SMTP settings not configured' }, { status: 400 });
    }

    const decrypted = decryptObject(partner.smtp_settings || {});
    const smtp: NormalizedSmtp = migrateSmtp(decrypted);
    if (!smtp.SMTP_HOST || !smtp.SMTP_USER || !smtp.SMTP_PASSWORD) {
      return NextResponse.json({ error: 'Incomplete SMTP settings' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtp.SMTP_HOST,
      port: smtp.SMTP_PORT,
      secure: smtp.SMTP_SECURE,
      auth: {
        user: smtp.SMTP_USER,
        pass: smtp.SMTP_PASSWORD,
      },
    });

    // Verify SMTP connection first for clearer errors
    try {
      await transporter.verify();
    } catch (verifyErr: any) {
      return NextResponse.json(
        {
          error: 'SMTP verification failed',
          code: 'SMTP_VERIFY_FAILED',
          details: verifyErr?.message || String(verifyErr),
          host: smtp.SMTP_HOST,
          port: smtp.SMTP_PORT,
          secure: smtp.SMTP_SECURE,
          user: smtp.SMTP_USER,
        },
        { status: 400 }
      );
    }

    const toAddress: string = to || smtp.SMTP_FROM;
    if (!toAddress) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    const mailSubject = subject || `Your saved quote${companyName ? ' - ' + companyName : ''}`;
    const htmlBody = html || `
      <div>
        <p>Thanks for saving your quote${companyName ? ' with ' + companyName : ''}.</p>
        ${productName ? `<p>Product: <strong>${String(productName)}</strong></p>` : ''}
        <p>We will be in touch shortly.</p>
      </div>
    `;
    const textBody = text || `Thanks for saving your quote${companyName ? ' with ' + companyName : ''}. ${productName ? 'Product: ' + String(productName) + '. ' : ''}We will be in touch shortly.`;

    try {
      await transporter.sendMail({
        from: smtp.SMTP_FROM || smtp.SMTP_USER,
        to: toAddress,
        subject: mailSubject,
        text: textBody,
        html: htmlBody,
      });
    } catch (sendErr: any) {
      return NextResponse.json(
        {
          error: 'SMTP send failed',
          code: 'SMTP_SEND_FAILED',
          details: sendErr?.message || String(sendErr),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Test email send error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send email',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}


