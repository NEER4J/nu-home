// app/api/category-fields/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/products';

// DELETE - Remove a field
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Await the params in Next.js 15
  const params = await context.params;
  const fieldId = params.id;
  
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
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Await the params in Next.js 15
  const params = await context.params;
  const fieldId = params.id;
  
  if (!fieldId) {
    return NextResponse.json({ error: 'Field ID is required' }, { status: 400 });
  }
  
  try {
    const body = await request.json();
    const supabase = await createServerSupabaseClient();
    
    // Fetch the existing field first to maintain some properties
    const { data: existingField, error: fetchError } = await supabase
      .from('CategoryFields')
      .select('*')
      .eq('field_id', fieldId)
      .single();
      
    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw fetchError;
    }
    
    // Prepare update data, only including fields that are actually being updated
    const updateData = {
      name: body.name !== undefined ? body.name : existingField.name,
      is_required: body.is_required !== undefined ? body.is_required : existingField.is_required,
      is_multi: body.is_multi !== undefined ? body.is_multi : existingField.is_multi,
      display_format: body.display_format || existingField.display_format,
      options: body.options !== undefined ? body.options : existingField.options,
      // Don't update key or field_type
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

// GET - Get a single field
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Await the params in Next.js 15
  const params = await context.params;
  const fieldId = params.id;
  
  if (!fieldId) {
    return NextResponse.json({ error: 'Field ID is required' }, { status: 400 });
  }
  
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('CategoryFields')
      .select('*')
      .eq('field_id', fieldId)
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching category field:', error);
    return NextResponse.json({ error: 'Failed to fetch field' }, { status: 500 });
  }
}