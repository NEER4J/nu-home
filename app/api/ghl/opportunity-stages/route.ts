import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getGHLService } from '@/lib/ghl-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const opportunityId = searchParams.get('opportunityId')

    if (!opportunityId) {
      return NextResponse.json({ error: 'Opportunity ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ghlService = await getGHLService(user.id)
    if (!ghlService) {
      return NextResponse.json({ error: 'GHL integration not found' }, { status: 404 })
    }

    const stages = await ghlService.getOpportunityStages(opportunityId)
    return NextResponse.json(stages)
  } catch (error) {
    console.error('Error fetching opportunity stages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunity stages' },
      { status: 500 }
    )
  }
}
