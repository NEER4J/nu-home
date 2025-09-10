import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GHLAPIService, saveGHLIntegration } from '@/lib/ghl-api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  console.log('GHL OAuth callback received:', { 
    hasCode: !!code, 
    hasState: !!state, 
    hasError: !!error,
    error: error 
  })

  // Get base URL for redirects
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 `${request.nextUrl.protocol}//${request.nextUrl.host}`

  // Handle OAuth errors
  if (error) {
    console.error('GHL OAuth error:', error)
    return NextResponse.redirect(
      `${baseUrl}/partner/settings?ghl_error=${encodeURIComponent(error)}`
    )
  }

  if (!code) {
    console.error('No authorization code received')
    return NextResponse.redirect(
      `${baseUrl}/partner/settings?ghl_error=no_code`
    )
  }

  try {
    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User authentication error:', userError)
      return NextResponse.redirect(
        `${baseUrl}/sign-in?redirect_to=${encodeURIComponent('/partner/settings')}`
      )
    }

    console.log('OAuth callback - User authenticated:', user.id)

    // Exchange code for access token
    const redirectUri = `${baseUrl}/auth/crm/callback`
    console.log('Exchanging code for token with redirect URI:', redirectUri)
    
    const tokenData = await GHLAPIService.exchangeCodeForToken(code, redirectUri)
    console.log('Token exchange successful, received data:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      companyId: tokenData.companyId,
      userId: tokenData.userId,
      userType: tokenData.userType
    })

    // Save integration to database
    await saveGHLIntegration(user.id, tokenData)
    console.log('GHL integration saved successfully')

    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${baseUrl}/partner/settings?ghl_success=true`
    )

  } catch (error) {
    console.error('GHL OAuth callback error:', error)
    return NextResponse.redirect(
      `${baseUrl}/partner/settings?ghl_error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Unknown error'
      )}`
    )
  }
}
