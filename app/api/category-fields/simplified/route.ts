// app/api/category-fields/simplified/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/products';

// GET - Fetch simplified fields for a category
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryId = searchParams.get('categoryId');
  
  if (!categoryId) {
    return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
  }
  
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('CategoryFields')
      .select('*')
      .eq('service_category_id', categoryId)
      .order('display_order');
    
    if (error) throw error;
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching category fields:', error);
    return NextResponse.json({ error: 'Failed to fetch fields' }, { status: 500 });
  }
}

// POST - Create a new simplified field
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.service_category_id || !body.name || !body.key || !body.field_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const supabase = await createServerSupabaseClient();
    
    // Check if key already exists for this category
    const { data: existingField } = await supabase
      .from('CategoryFields')
      .select('field_id')
      .eq('service_category_id', body.service_category_id)
      .eq('key', body.key)
      .maybeSingle();
    
    if (existingField) {
      return NextResponse.json(
        { error: 'A field with this key already exists for this category' }, 
        { status: 400 }
      );
    }
    
    // Prepare the data for insertion
    const fieldData = {
      service_category_id: body.service_category_id,
      name: body.name,
      key: body.key,
      field_type: body.field_type,
      is_required: body.is_required || false,
      is_multi: body.is_multi || false,
      display_order: body.display_order || 0,
      display_format: body.display_format || 'default',
      options: body.options || null,
      field_structure: body.field_structure || null,
    };
    
    // Insert the new field
    const { data, error } = await supabase
      .from('CategoryFields')
      .insert(fieldData)
      .select()
      .single();
    
    if (error) {
      console.error('Database error creating field:', error);
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating category field:', error);
    return NextResponse.json({ 
      error: `Failed to create field: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}

// DELETE - Remove a field
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fieldId = searchParams.get('fieldId');
  
  if (!fieldId) {
    return NextResponse.json({ error: 'Field ID is required' }, { status: 400 });
  }
  
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase
      .from('CategoryFields')
      .delete()
      .eq('field_id', fieldId);
    
    if (error) {
      console.error('Delete error:', error);
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category field:', error);
    return NextResponse.json({ error: 'Failed to delete field' }, { status: 500 });
  }
}

// PATCH - Update a field
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const fieldId = body.fieldId;
    
    if (!fieldId) {
      return NextResponse.json({ error: 'Field ID is required' }, { status: 400 });
    }
    
    const supabase = await createServerSupabaseClient();
    
    // Prepare update data
    const updateData = {
      name: body.name,
      is_required: body.is_required || false,
      is_multi: body.is_multi || false,
      display_format: body.display_format || 'default',
      options: body.options || null,
      field_structure: body.field_structure || null,
    };
    
    // Update the field
    const { data, error } = await supabase
      .from('CategoryFields')
      .update(updateData)
      .eq('field_id', fieldId)
      .select()
      .single();
    
    if (error) {
      console.error('Update error:', error);
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating category field:', error);
    return NextResponse.json({ error: 'Failed to update field' }, { status: 500 });
  }
}