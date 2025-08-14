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
  if (!hostname || hostname === 'www' || hostname === 'localhost') return null;
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
    const { phoneNumber, code, verificationSid, subdomain: bodySubdomain } = await request.json();

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
        { status: 400 }
      );
    }

    // Resolve Twilio credentials (by hostname if available)
    const { accountSid, authToken, verifySid } = await getTwilioCredentials(request, bodySubdomain);

    if (!accountSid || !authToken || !verifySid) {
      console.error('Missing Twilio credentials');
      return NextResponse.json(
        { error: 'SMS service not configured' },
        { status: 500 }
      );
    }

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
      // Verify OTP via Twilio Verify API
      const response = await fetch(
        `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phoneNumber,
            Code: code
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Twilio verification error:', data);
        const message = data?.message || data?.error || 'Verification failed';
        const status = response.status;
        return NextResponse.json({ error: message, details: data }, { status });
      }

      if (data.status === 'approved') {
        console.log(`OTP verified successfully for ${phoneNumber}`);
        return NextResponse.json({
          success: true,
          status: 'approved',
          message: 'Phone number verified successfully'
        });
      } else {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }

    } catch (twilioError) {
      const message = twilioError instanceof Error ? twilioError.message : 'Verification failed';
      console.error('Twilio verification error:', message);
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}