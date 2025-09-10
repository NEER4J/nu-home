import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getGHLIntegration } from '@/lib/ghl-api'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integration = await getGHLIntegration(user.id)
    return NextResponse.json(integration)
  } catch (error) {
    console.error('Error fetching GHL integration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GHL integration' },
      { status: 500 }
    )
  }
}
