// app/api/category-fields/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/products';

// GET - Fetch fields for a category
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryId = searchParams.get('categoryId');
  
  if (!categoryId) {
    return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
  }
  
  try {
    const supabase = createServerSupabaseClient();
    
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

// POST - Create a new field
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.service_category_id || !body.name || !body.key || !body.field_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // Check if key already exists for this category
    const { data: existingField, error: checkError } = await supabase
      .from('CategoryFields')
      .select('field_id')
      .eq('service_category_id', body.service_category_id)
      .eq('key', body.key)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking existing field:', checkError);
      throw checkError;
    }
    
    if (existingField) {
      return NextResponse.json(
        { error: 'A field with this key already exists for this category' }, 
        { status: 400 }
      );
    }
    
    // Prepare the data for insertion, ensuring all required fields are present
    const fieldData = {
      service_category_id: body.service_category_id,
      name: body.name,
      key: body.key,
      field_type: body.field_type,
      is_required: body.is_required === undefined ? false : body.is_required,
      is_multi: body.is_multi === undefined ? false : body.is_multi,
      display_order: body.display_order || 0,
      display_format: body.display_format || 'default',
      options: body.options || null,
    };
    
    // Insert the new field
    const { data, error } = await supabase
      .from('CategoryFields')
      .insert(fieldData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating field:', error);
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating category field:', error);
    return NextResponse.json({ error: 'Failed to create field' }, { status: 500 });
  }
}