// app/api/category-fields/create-with-children/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/products';

// POST - Create a parent field with its children
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parent, children } = body;
    
    if (!parent || !parent.service_category_id || !parent.name || !parent.key || !parent.field_type) {
      return NextResponse.json({ error: 'Missing required parent field data' }, { status: 400 });
    }

    if (!children || !Array.isArray(children) || children.length === 0) {
      return NextResponse.json({ error: 'At least one child field is required' }, { status: 400 });
    }
    
    const supabase = await createServerSupabaseClient();
    
    // Check if parent key already exists for this category
    const { data: existingField, error: checkError } = await supabase
      .from('CategoryFields')
      .select('field_id')
      .eq('service_category_id', parent.service_category_id)
      .eq('key', parent.key)
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
    
    // Prepare the parent field data
    const parentFieldData = {
      service_category_id: parent.service_category_id,
      name: parent.name,
      key: parent.key,
      field_type: parent.field_type,
      is_required: parent.is_required || false,
      is_multi: false, // Groups/repeaters don't use is_multi
      display_order: parent.display_order || 0,
      display_format: parent.display_format || 'default',
      options: null, // Groups/repeaters don't have options
      parent_field_id: null, // Parent fields are always top-level
      field_group_type: parent.field_group_type || (parent.field_type === 'group' ? 'group' : 'repeater'),
      help_text: null,
    };
    
    // Create the parent field first
    const { data: parentField, error: parentError } = await supabase
      .from('CategoryFields')
      .insert(parentFieldData)
      .select()
      .single();
    
    if (parentError) {
      console.error('Error creating parent field:', parentError);
      throw parentError;
    }
    
    // Process child fields and their nested children
    const allFieldsToCreate: any[] = [];
    const childFieldsMap: { [tempId: string]: string } = {}; // temp ID -> real field_id mapping
    
    // First pass: prepare direct children
    children.forEach((child: any, index: number) => {
      // Validate child field
      if (!child.name || !child.field_type) {
        throw new Error(`Child field ${index + 1} is missing required data`);
      }
      
      // Generate key if not provided
      const childKey = child.key || child.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      const tempId = `temp_child_${index}`;
      
      const childFieldData = {
        service_category_id: parent.service_category_id,
        name: child.name,
        key: `${parent.key}_${childKey}`,
        field_type: child.field_type,
        is_required: child.is_required || false,
        is_multi: child.is_multi || false,
        display_order: index + 1,
        display_format: 'default',
        options: child.options || null,
        parent_field_id: parentField.field_id,
        field_group_type: parent.field_type === 'group' ? 'group_child' : 'repeater_child',
        help_text: child.help_text || null,
        _tempId: tempId, // temporary ID for reference
      };
      
      allFieldsToCreate.push(childFieldData);
      
      // Store nested children to create after parent child is created
      if (child.childFields && child.childFields.length > 0) {
        child.childFields.forEach((grandchild: any, grandchildIndex: number) => {
          if (!grandchild.name || !grandchild.field_type) {
            throw new Error(`Nested field ${grandchildIndex + 1} in child ${index + 1} is missing required data`);
          }
          
          const grandchildKey = grandchild.key || grandchild.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
          
          const grandchildFieldData = {
            service_category_id: parent.service_category_id,
            name: grandchild.name,
            key: `${parent.key}_${childKey}_${grandchildKey}`,
            field_type: grandchild.field_type,
            is_required: grandchild.is_required || false,
            is_multi: grandchild.is_multi || false,
            display_order: grandchildIndex + 1,
            display_format: 'default',
            options: grandchild.options || null,
            parent_field_id: null, // Will be set after child is created
            field_group_type: child.field_type === 'group' ? 'group_child' : 'repeater_child',
            help_text: grandchild.help_text || null,
            _parentTempId: tempId, // Reference to parent temp ID
          };
          
          allFieldsToCreate.push(grandchildFieldData);
        });
      }
    });
    
    // Create direct children first
    const directChildren = allFieldsToCreate.filter(f => !f._parentTempId);
    const { data: childFields, error: childrenError } = await supabase
      .from('CategoryFields')
      .insert(directChildren.map(({ _tempId, ...field }) => field))
      .select();
    
    if (childrenError) {
      console.error('Error creating child fields:', childrenError);
      // If child creation fails, delete the parent field to maintain consistency
      await supabase
        .from('CategoryFields')
        .delete()
        .eq('field_id', parentField.field_id);
      
      throw childrenError;
    }
    
    // Map temp IDs to real field IDs
    directChildren.forEach((child, index) => {
      if (child._tempId && childFields[index]) {
        childFieldsMap[child._tempId] = childFields[index].field_id;
      }
    });
    
    // Create grandchildren (nested fields)
    const grandchildren = allFieldsToCreate.filter(f => f._parentTempId);
    let grandchildFields: any[] = [];
    
    if (grandchildren.length > 0) {
      const grandchildrenData = grandchildren.map(({ _parentTempId, ...field }) => ({
        ...field,
        parent_field_id: childFieldsMap[_parentTempId],
      }));
      
      const { data: createdGrandchildren, error: grandchildrenError } = await supabase
        .from('CategoryFields')
        .insert(grandchildrenData)
        .select();
      
      if (grandchildrenError) {
        console.error('Error creating grandchild fields:', grandchildrenError);
        // Rollback: delete parent and children
        await supabase
          .from('CategoryFields')
          .delete()
          .eq('field_id', parentField.field_id);
        
        throw grandchildrenError;
      }
      
      grandchildFields = createdGrandchildren;
    }
    
    return NextResponse.json({
      parent: parentField,
      children: childFields,
      grandchildren: grandchildFields,
      message: `Created ${parent.field_type} with ${childFields.length} child fields and ${grandchildFields.length} nested fields`
    });
    
  } catch (error) {
    console.error('Error creating field with children:', error);
    return NextResponse.json({ 
      error: `Failed to create field with children: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}