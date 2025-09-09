// app/api/category-fields/update-with-children/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/products';

// PATCH - Update a parent field with its children
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { fieldId, parent, children } = body;
    
    if (!fieldId || !parent) {
      return NextResponse.json({ error: 'Field ID and parent data are required' }, { status: 400 });
    }
    
    const supabase = await createServerSupabaseClient();
    
    // Update the parent field
    const { data: updatedParent, error: parentError } = await supabase
      .from('CategoryFields')
      .update({
        name: parent.name,
        is_required: parent.is_required || false,
        is_multi: parent.is_multi || false,
        options: parent.options || null,
      })
      .eq('field_id', fieldId)
      .select()
      .single();
    
    if (parentError) {
      console.error('Error updating parent field:', parentError);
      throw parentError;
    }
    
    // Get existing children and grandchildren
    const { data: existingChildren, error: fetchError } = await supabase
      .from('CategoryFields')
      .select('*')
      .eq('parent_field_id', fieldId);
    
    if (fetchError) {
      console.error('Error fetching existing children:', fetchError);
      throw fetchError;
    }
    
    // Get all grandchildren
    const childrenIds = existingChildren.map(c => c.field_id);
    const { data: existingGrandchildren } = await supabase
      .from('CategoryFields')
      .select('*')
      .in('parent_field_id', childrenIds);
    
    // Delete all existing children and grandchildren (cascade delete)
    if (existingChildren.length > 0) {
      const { error: deleteError } = await supabase
        .from('CategoryFields')
        .delete()
        .eq('parent_field_id', fieldId);
      
      if (deleteError) {
        console.error('Error deleting existing children:', deleteError);
        throw deleteError;
      }
    }
    
    // Create new children if provided
    let newChildren: any[] = [];
    let newGrandchildren: any[] = [];
    
    if (children && children.length > 0) {
      // First pass: create direct children
      const childFieldsData = children.map((child: any, index: number) => {
        const childKey = child.key || child.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        
        return {
          service_category_id: parent.service_category_id,
          name: child.name,
          key: `${parent.key}_${childKey}`,
          field_type: child.field_type,
          is_required: child.is_required || false,
          is_multi: child.is_multi || false,
          display_order: index + 1,
          display_format: 'default',
          options: child.options || null,
          parent_field_id: fieldId,
          field_group_type: parent.field_type === 'group' ? 'group_child' : 'repeater_child',
          help_text: child.help_text || null,
        };
      });
      
      const { data: createdChildren, error: childrenError } = await supabase
        .from('CategoryFields')
        .insert(childFieldsData)
        .select();
      
      if (childrenError) {
        console.error('Error creating children:', childrenError);
        throw childrenError;
      }
      
      newChildren = createdChildren;
      
      // Second pass: create grandchildren for container children
      const grandchildrenData: any[] = [];
      
      children.forEach((child: any, childIndex: number) => {
        if (child.childFields && child.childFields.length > 0) {
          const parentChildId = createdChildren[childIndex].field_id;
          const childKey = child.key || child.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
          
          child.childFields.forEach((grandchild: any, grandchildIndex: number) => {
            const grandchildKey = grandchild.key || grandchild.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
            
            grandchildrenData.push({
              service_category_id: parent.service_category_id,
              name: grandchild.name,
              key: `${parent.key}_${childKey}_${grandchildKey}`,
              field_type: grandchild.field_type,
              is_required: grandchild.is_required || false,
              is_multi: grandchild.is_multi || false,
              display_order: grandchildIndex + 1,
              display_format: 'default',
              options: grandchild.options || null,
              parent_field_id: parentChildId,
              field_group_type: child.field_type === 'group' ? 'group_child' : 'repeater_child',
              help_text: grandchild.help_text || null,
            });
          });
        }
      });
      
      if (grandchildrenData.length > 0) {
        const { data: createdGrandchildren, error: grandchildrenError } = await supabase
          .from('CategoryFields')
          .insert(grandchildrenData)
          .select();
        
        if (grandchildrenError) {
          console.error('Error creating grandchildren:', grandchildrenError);
          throw grandchildrenError;
        }
        
        newGrandchildren = createdGrandchildren;
      }
    }
    
    return NextResponse.json({
      parent: updatedParent,
      children: newChildren,
      grandchildren: newGrandchildren,
      message: `Updated ${parent.field_type} with ${newChildren.length} child fields and ${newGrandchildren.length} nested fields`
    });
    
  } catch (error) {
    console.error('Error updating field with children:', error);
    return NextResponse.json({ 
      error: `Failed to update field with children: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}