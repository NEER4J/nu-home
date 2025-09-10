import { NextRequest, NextResponse } from 'next/server'
import { GHLAPIService } from '@/lib/ghl-api'

export async function GET(request: NextRequest) {
  try {
    // Get the base URL from environment or construct from request
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   `${request.nextUrl.protocol}//${request.nextUrl.host}`
    
    const redirectUri = `${baseUrl}/auth/crm/callback`
    console.log('Generated redirect URI:', redirectUri)
    
    const authUrl = GHLAPIService.getAuthorizationUrl(redirectUri)
    console.log('Generated auth URL:', authUrl)
    
    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error generating GHL auth URL:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}
