import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getGHLService } from '@/lib/ghl-api'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ghlService = await getGHLService(user.id)
    if (!ghlService) {
      return NextResponse.json({ error: 'GHL integration not found' }, { status: 404 })
    }

    const customFields = await ghlService.getCustomFields()
    return NextResponse.json(customFields)
  } catch (error) {
    console.error('Error fetching GHL custom fields:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GHL custom fields' },
      { status: 500 }
    )
  }
}
