import { NextRequest, NextResponse } from 'next/server';
import { encryptObject } from '@/lib/encryption';

export async function POST(req: NextRequest) {
  try {
    console.log('Encryption API called');
    
    const body = await req.json();
    console.log('Request body:', body);
    
    const { smtp_settings, twilio_settings } = body;

    if (!smtp_settings && !twilio_settings) {
      console.log('No settings provided');
      return NextResponse.json({
        encrypted_smtp: {},
        encrypted_twilio: {},
      });
    }

    console.log('Encrypting SMTP settings...');
    const encrypted_smtp = smtp_settings ? encryptObject(smtp_settings) : {};
    console.log('SMTP encryption complete');

    console.log('Encrypting Twilio settings...');
    const encrypted_twilio = twilio_settings ? encryptObject(twilio_settings) : {};
    console.log('Twilio encryption complete');

    return NextResponse.json({
      encrypted_smtp,
      encrypted_twilio,
    });
  } catch (error) {
    console.error('Error in encryption API:', error);
    
    // More detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to encrypt settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
