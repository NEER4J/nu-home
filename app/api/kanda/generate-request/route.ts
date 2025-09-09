import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { payload, enterpriseId } = await request.json()

    if (!payload || !enterpriseId) {
      return NextResponse.json(
        { error: 'Payload and enterprise ID are required' },
        { status: 400 }
      )
    }

    // JSON encode the payload
    const body = JSON.stringify(payload, null, 0)

    // Format the body, removing any non-printable ascii characters
    // and adding spaces after commas and colons (artifact from generating signed requests in python)
    const fbody = body.replace(/,"/g, ', "').replace(/":/g, '": ')

    // Base64 encode the formatted body
    const encodedPayload = Buffer.from(fbody).toString('base64')

    // HMAC hash the formatted body using SHA256
    const signature = crypto
      .createHmac('sha256', enterpriseId)
      .update(fbody)
      .digest('hex')

    // Combine the signature and the payload into signed request
    const signedRequest = `${signature}.${encodedPayload}`

    // Return just the signed request string like the PHP implementation
    return new NextResponse(signedRequest, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  } catch (error) {
    console.error('Error generating Kanda request:', error)
    return NextResponse.json(
      { error: 'Failed to generate Kanda request' },
      { status: 500 }
    )
  }
}
