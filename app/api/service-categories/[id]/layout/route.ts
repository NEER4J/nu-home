// app/api/service-categories/[id]/layout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/products';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Await the params in Next.js 15
  const params = await context.params;
  const categoryId = params.id;
  
  if (!categoryId) {
    return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
  }
  
  try {
    const body = await request.json();
    const { products_list_layout } = body;
    
    const supabase = createServerSupabaseClient();
    
    // Update the category's layout setting
    const { data, error } = await supabase
      .from('ServiceCategories')
      .update({ products_list_layout })
      .eq('service_category_id', categoryId)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating layout setting:', error);
    return NextResponse.json({ error: 'Failed to update layout' }, { status: 500 });
  }
}