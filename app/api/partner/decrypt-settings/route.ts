import { NextRequest, NextResponse } from 'next/server';
import { decryptObject } from '@/lib/encryption';

export async function POST(req: NextRequest) {
  try {
    const { smtp_settings, twilio_settings, stripe_settings, kanda_settings } = await req.json();

    // Decrypt the settings
    const decrypted_smtp = decryptObject(smtp_settings || {});
    const decrypted_twilio = decryptObject(twilio_settings || {});
    const decrypted_stripe = decryptObject(stripe_settings || {});
    const decrypted_kanda = decryptObject(kanda_settings || {});

    return NextResponse.json({
      smtp_settings: decrypted_smtp,
      twilio_settings: decrypted_twilio,
      stripe_settings: decrypted_stripe,
      kanda_settings: decrypted_kanda,
    });
  } catch (error) {
    console.error('Error decrypting settings:', error);
    return NextResponse.json(
      { error: 'Failed to decrypt settings' },
      { status: 500 }
    );
  }
}
