import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
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
        throw new Error(data.message || 'Failed to send OTP');
      }

      console.log(`OTP sent successfully to ${phoneNumber}:`, data.sid);
      
      return NextResponse.json({
        success: true,
        sid: data.sid,
        message: 'OTP sent successfully'
      });

    } catch (twilioError) {
      console.error('Twilio error:', twilioError);
      return NextResponse.json(
        { error: 'Failed to send OTP. Please check your phone number.' },
        { status: 500 }
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
