import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch key points for the partner
    const { data, error } = await supabase
      .from('PartnerKeyPoints')
      .select('*')
      .eq('partner_id', user.id)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching key points:', error);
      return NextResponse.json({ error: 'Failed to fetch key points' }, { status: 500 });
    }

    return NextResponse.json({ keyPoints: data || [] });
  } catch (error) {
    console.error('Error in GET /api/partner-key-points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { title, icon, position } = body;

    // Validate required fields
    if (!title || !icon || !position) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate position (1-4)
    if (position < 1 || position > 4) {
      return NextResponse.json({ error: 'Position must be between 1 and 4' }, { status: 400 });
    }

    // Check if position is already taken
    const { data: existingKeyPoint } = await supabase
      .from('PartnerKeyPoints')
      .select('key_point_id')
      .eq('partner_id', user.id)
      .eq('position', position)
      .eq('is_active', true)
      .single();

    if (existingKeyPoint) {
      return NextResponse.json({ error: 'Position already taken' }, { status: 400 });
    }

    // Create new key point
    const { data, error } = await supabase
      .from('PartnerKeyPoints')
      .insert({
        partner_id: user.id,
        title,
        icon,
        position
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating key point:', error);
      return NextResponse.json({ error: 'Failed to create key point' }, { status: 500 });
    }

    return NextResponse.json({ keyPoint: data });
  } catch (error) {
    console.error('Error in POST /api/partner-key-points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
