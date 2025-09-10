import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all field mappings for this partner
    const { data: mappings, error: mappingError } = await supabase
      .from('ghl_field_mappings')
      .select('*')
      .eq('partner_id', user.id)
      .eq('is_active', true)
      .order('email_type, recipient_type')

    if (mappingError) {
      console.error('Error fetching mappings:', mappingError)
      return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 })
    }

    // Get service categories for context
    const { data: categories } = await supabase
      .from('ServiceCategories')
      .select('service_category_id, category_name')

    const categoryMap = categories?.reduce((acc, cat) => {
      acc[cat.service_category_id] = cat.category_name
      return acc
    }, {} as Record<string, string>) || {}

    // Format the response with category names
    const formattedMappings = mappings?.map(mapping => ({
      ...mapping,
      category_name: categoryMap[mapping.service_category_id] || 'Unknown Category',
      has_pipeline: !!mapping.pipeline_id,
      has_stage: !!mapping.opportunity_stage,
      field_count: Object.keys(mapping.field_mappings || {}).length
    }))

    return NextResponse.json({
      partner_id: user.id,
      total_mappings: mappings?.length || 0,
      mappings: formattedMappings || []
    })
  } catch (error) {
    console.error('Error in debug mappings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug mappings' },
      { status: 500 }
    )
  }
}