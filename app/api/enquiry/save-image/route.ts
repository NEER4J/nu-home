import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { 
      submission_id,
      category,
      area_index,
      area_title,
      file_path,
      file_url,
      file_name,
      file_size,
      mime_type
    } = body || {}

    // Validate required fields
    if (!submission_id || !category || area_index === undefined || !area_title || !file_path || !file_url || !file_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('enquiry_images')
      .insert({
        submission_id,
        category,
        area_index,
        area_title,
        file_path,
        file_url,
        file_name,
        file_size: file_size || null,
        mime_type: mime_type || null
      })
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Save image record error:', error)
    return NextResponse.json({ 
      error: 'Failed to save image record', 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}