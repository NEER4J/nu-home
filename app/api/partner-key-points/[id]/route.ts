import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch specific key point
    const { data, error } = await supabase
      .from('PartnerKeyPoints')
      .select('*')
      .eq('key_point_id', params.id)
      .eq('partner_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching key point:', error);
      return NextResponse.json({ error: 'Key point not found' }, { status: 404 });
    }

    return NextResponse.json({ keyPoint: data });
  } catch (error) {
    console.error('Error in GET /api/partner-key-points/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { title, icon, position, is_active } = body;

    // Validate position if provided (1-4)
    if (position && (position < 1 || position > 4)) {
      return NextResponse.json({ error: 'Position must be between 1 and 4' }, { status: 400 });
    }

    // Check if new position is already taken by another key point
    if (position) {
      const { data: existingKeyPoint } = await supabase
        .from('PartnerKeyPoints')
        .select('key_point_id')
        .eq('partner_id', user.id)
        .eq('position', position)
        .eq('is_active', true)
        .neq('key_point_id', params.id)
        .single();

      if (existingKeyPoint) {
        return NextResponse.json({ error: 'Position already taken' }, { status: 400 });
      }
    }

    // Update key point
    const { data, error } = await supabase
      .from('PartnerKeyPoints')
      .update({
        ...(title && { title }),
        ...(icon && { icon }),
        ...(position && { position }),
        ...(is_active !== undefined && { is_active })
      })
      .eq('key_point_id', params.id)
      .eq('partner_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating key point:', error);
      return NextResponse.json({ error: 'Failed to update key point' }, { status: 500 });
    }

    return NextResponse.json({ keyPoint: data });
  } catch (error) {
    console.error('Error in PUT /api/partner-key-points/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Delete key point
    const { error } = await supabase
      .from('PartnerKeyPoints')
      .delete()
      .eq('key_point_id', params.id)
      .eq('partner_id', user.id);

    if (error) {
      console.error('Error deleting key point:', error);
      return NextResponse.json({ error: 'Failed to delete key point' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/partner-key-points/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
