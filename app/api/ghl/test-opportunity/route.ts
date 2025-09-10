import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getGHLService } from '@/lib/ghl-api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contactId, pipelineId, stageId, title } = body

    if (!contactId || !pipelineId) {
      return NextResponse.json({ 
        error: 'Missing required fields: contactId, pipelineId' 
      }, { status: 400 })
    }

    const ghlService = await getGHLService(user.id)
    if (!ghlService) {
      return NextResponse.json({ error: 'GHL integration not found' }, { status: 404 })
    }

    console.log('🧪 Testing opportunity creation with:', {
      contactId,
      pipelineId,
      stageId,
      title: title || 'Test Opportunity'
    })

    try {
      const opportunity = await ghlService.createOpportunityForContact(
        contactId,
        pipelineId,
        stageId,
        title || 'Test Opportunity'
      )

      return NextResponse.json({
        success: true,
        opportunity,
        message: 'Opportunity created successfully'
      })
    } catch (oppError: any) {
      console.error('Opportunity creation failed:', oppError)
      return NextResponse.json({
        success: false,
        error: oppError.message || 'Unknown error',
        errorData: oppError.errorData || null,
        status: oppError.status || 500
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in test opportunity:', error)
    return NextResponse.json(
      { error: 'Failed to test opportunity creation' },
      { status: 500 }
    )
  }
}