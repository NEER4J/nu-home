import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the raw integration data from database
    const { data: integration, error } = await supabase
      .from('ghl_integrations')
      .select('*')
      .eq('partner_id', user.id)
      .eq('is_active', true)
      .single()

    if (error) {
      return NextResponse.json({ error: 'No integration found' }, { status: 404 })
    }

    // Return the integration details (without sensitive tokens)
    return NextResponse.json({
      integration: {
        integration_id: integration.integration_id,
        partner_id: integration.partner_id,
        company_id: integration.company_id,
        location_id: integration.location_id,
        user_type: integration.user_type,
        scope: integration.scope,
        user_id: integration.user_id,
        is_active: integration.is_active,
        created_at: integration.created_at,
        updated_at: integration.updated_at,
        token_expires_at: integration.token_expires_at,
        has_access_token: !!integration.access_token,
        has_refresh_token: !!integration.refresh_token,
        access_token_preview: integration.access_token ? integration.access_token.substring(0, 20) + '...' : null
      }
    })
  } catch (error) {
    console.error('Error debugging GHL integration:', error)
    return NextResponse.json(
      { error: 'Failed to debug GHL integration' },
      { status: 500 }
    )
  }
}
