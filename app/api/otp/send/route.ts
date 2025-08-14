import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { decryptObject } from '@/lib/encryption';
import { resolvePartnerByHostname } from '@/lib/partner';

type TwilioCredentials = {
  accountSid: string | null;
  authToken: string | null;
  verifySid: string | null;
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
  if (!hostname || hostname === 'localhost') return null;
  return hostname;
}

async function getTwilioCredentials(request: NextRequest, bodySubdomain?: string | null): Promise<TwilioCredentials> {
  const hostname = parseHostname(request, bodySubdomain);
  if (hostname) {
    const supabase = await createClient();
    const partner = await resolvePartnerByHostname(supabase, hostname);

    if (partner?.twilio_settings) {
      const decrypted = decryptObject(partner.twilio_settings || {});
      const accountSid = (decrypted.TWILIO_ACCOUNT_SID || decrypted.account_sid || decrypted.ACCOUNT_SID) || null;
      const authToken = (decrypted.TWILIO_AUTH_TOKEN || decrypted.auth_token || decrypted.AUTH_TOKEN) || null;
      const verifySid = (decrypted.TWILIO_VERIFY_SID || decrypted.verify_sid || decrypted.messaging_service_sid || decrypted.VERIFY_SID) || null;
      return { accountSid, authToken, verifySid };
    }
  }

  // Fallback to environment variables
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID || null,
    authToken: process.env.TWILIO_AUTH_TOKEN || null,
    verifySid: process.env.TWILIO_VERIFY_SID || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, subdomain: bodySubdomain } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Resolve Twilio credentials (by hostname if available)
    const { accountSid, authToken, verifySid } = await getTwilioCredentials(request, bodySubdomain);

    if (!accountSid || !authToken || !verifySid) {
      console.error('Missing Twilio credentials', { hasAccountSid: !!accountSid, hasAuthToken: !!authToken, hasVerifySid: !!verifySid });
      return NextResponse.json(
        { 
          error: 'SMS service not configured',
          missing: {
            TWILIO_ACCOUNT_SID: !accountSid,
            TWILIO_AUTH_TOKEN: !authToken,
            TWILIO_VERIFY_SID: !verifySid,
          },
          hint: 'Ensure Twilio Verify Service SID (starts with VA...) is saved in your Account Settings.'
        },
        { status: 400 }
      );
    }

    // Basic sanity checks to help users configure correctly before calling Twilio
    if (!String(accountSid).startsWith('AC')) {
      return NextResponse.json(
        { error: 'Invalid TWILIO_ACCOUNT_SID format. It should start with AC...', value: accountSid },
        { status: 400 }
      );
    }
    if (!/^VA[0-9a-zA-Z]{32}$/.test(String(verifySid))) {
      return NextResponse.json(
        { error: 'Invalid TWILIO_VERIFY_SID format. It should start with VA and be 34 chars long.', value: verifySid },
        { status: 400 }
      );
    }

    try {
      // Send OTP via Twilio Verify API
      const response = await fetch(
        `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phoneNumber,
            Channel: 'sms'
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Twilio API error:', data);
        const message = data?.message || data?.error || 'Failed to send OTP';
        const code = data?.code || data?.status || response.status;
        return NextResponse.json(
          { error: message, code, details: data },
          { status: 400 }
        );
      }

      console.log(`OTP sent successfully to ${phoneNumber}:`, data.sid);
      
      return NextResponse.json({
        success: true,
        sid: data.sid,
        message: 'OTP sent successfully'
      });

    } catch (twilioError) {
      const message = twilioError instanceof Error ? twilioError.message : 'Failed to send OTP';
      console.error('Twilio error:', message);
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}