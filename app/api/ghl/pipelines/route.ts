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

    const pipelines = await ghlService.getPipelines()
    return NextResponse.json(pipelines)
  } catch (error) {
    console.error('Error fetching GHL pipelines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GHL pipelines' },
      { status: 500 }
    )
  }
}