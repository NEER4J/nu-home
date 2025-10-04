import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch a specific highlight
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: highlight, error } = await supabase
      .from('PartnerHighlights')
      .select('*')
      .eq('highlight_id', id)
      .single();

    if (error) {
      console.error('Error fetching highlight:', error);
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
    }

    return NextResponse.json({ highlight });
  } catch (error) {
    console.error('Error in GET /api/partner-highlights/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a highlight
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const {
      title,
      message,
      highlight_type,
      is_active,
      priority,
      start_date,
      end_date,
      link_url,
      link_text
    } = body;

    // Validate highlight_type if provided
    if (highlight_type) {
      const validTypes = ['info', 'success', 'warning', 'offer', 'announcement'];
      if (!validTypes.includes(highlight_type)) {
        return NextResponse.json({ 
          error: 'Invalid highlight type' 
        }, { status: 400 });
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title;
    if (message !== undefined) updateData.message = message;
    if (highlight_type !== undefined) updateData.highlight_type = highlight_type;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (priority !== undefined) updateData.priority = priority;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (link_url !== undefined) updateData.link_url = link_url;
    if (link_text !== undefined) updateData.link_text = link_text;

    const { data: highlight, error } = await supabase
      .from('PartnerHighlights')
      .update(updateData)
      .eq('highlight_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating highlight:', error);
      return NextResponse.json({ error: 'Failed to update highlight' }, { status: 500 });
    }

    return NextResponse.json({ highlight });
  } catch (error) {
    console.error('Error in PUT /api/partner-highlights/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a highlight
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('PartnerHighlights')
      .delete()
      .eq('highlight_id', id);

    if (error) {
      console.error('Error deleting highlight:', error);
      return NextResponse.json({ error: 'Failed to delete highlight' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Highlight deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/partner-highlights/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
