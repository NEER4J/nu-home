import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, code, verificationSid } = await request.json();

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
        { status: 400 }
      );
    }

    // Get Twilio credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifySid = process.env.TWILIO_VERIFY_SID;

    if (!accountSid || !authToken || !verifySid) {
      console.error('Missing Twilio credentials');
      return NextResponse.json(
        { error: 'SMS service not configured' },
        { status: 500 }
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
        throw new Error(data.message || 'Verification failed');
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
      console.error('Twilio verification error:', twilioError);
      return NextResponse.json(
        { error: 'Invalid verification code' },
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
