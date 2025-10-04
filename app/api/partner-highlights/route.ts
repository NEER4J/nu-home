import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { PartnerHighlight } from '@/types/database.types';

// GET - Fetch highlights for a partner
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partner_id');
    const activeOnly = searchParams.get('active_only') === 'true';

    if (!partnerId) {
      return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 });
    }

    let query = supabase
      .from('PartnerHighlights')
      .select('*')
      .eq('partner_id', partnerId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: highlights, error } = await query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching highlights:', error);
      return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: 500 });
    }

    return NextResponse.json({ highlights });
  } catch (error) {
    console.error('Error in GET /api/partner-highlights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new highlight
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      partner_id,
      title,
      message,
      highlight_type = 'info',
      is_active = true,
      priority = 0,
      start_date,
      end_date,
      link_url,
      link_text
    } = body;

    // Validate required fields
    if (!partner_id || !title || !message) {
      return NextResponse.json({ 
        error: 'Partner ID, title, and message are required' 
      }, { status: 400 });
    }

    // Validate highlight_type
    const validTypes = ['info', 'success', 'warning', 'offer', 'announcement'];
    if (!validTypes.includes(highlight_type)) {
      return NextResponse.json({ 
        error: 'Invalid highlight type' 
      }, { status: 400 });
    }

    const { data: highlight, error } = await supabase
      .from('PartnerHighlights')
      .insert({
        partner_id,
        title,
        message,
        highlight_type,
        is_active,
        priority,
        start_date,
        end_date,
        link_url,
        link_text
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating highlight:', error);
      return NextResponse.json({ error: 'Failed to create highlight' }, { status: 500 });
    }

    return NextResponse.json({ highlight }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/partner-highlights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
