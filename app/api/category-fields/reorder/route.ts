// app/api/category-fields/reorder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/products';

// PATCH - Reorder fields
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.updates || !Array.isArray(body.updates)) {
      return NextResponse.json({ error: 'Updates array is required' }, { status: 400 });
    }
    
    const supabase = await createServerSupabaseClient();
    
    // Update each field's display_order
    const updatePromises = body.updates.map(async (update: { field_id: string, display_order: number }) => {
      const { error } = await supabase
        .from('CategoryFields')
        .update({ display_order: update.display_order })
        .eq('field_id', update.field_id);
      
      if (error) throw error;
    });
    
    await Promise.all(updatePromises);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering fields:', error);
    return NextResponse.json({ error: 'Failed to reorder fields' }, { status: 500 });
  }
}