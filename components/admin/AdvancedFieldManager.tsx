'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryField, NestedFieldStructure } from '@/types/product.types';
import AdvancedFieldList from './AdvancedFieldList';
import AdvancedFieldForm from './AdvancedFieldForm';

type AdvancedFieldManagerProps = {
  categoryId: string;
};

export default function AdvancedFieldManager({ categoryId }: AdvancedFieldManagerProps) {
  const router = useRouter();
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [nestedStructure, setNestedStructure] = useState<NestedFieldStructure>({
    topLevel: [],
    grouped: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingFieldData, setEditingFieldData] = useState<Partial<CategoryField> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Fetch existing category fields
  useEffect(() => {
    async function fetchFields() {
      try {
        const response = await fetch(`/api/category-fields?categoryId=${categoryId}&nested=true`);
        if (!response.ok) throw new Error('Failed to fetch fields');
        
        const fieldsData = await response.json();
        setFields(fieldsData);
        
        // Organize fields into nested structure
        const topLevel: CategoryField[] = [];
        const grouped: { [parentId: string]: CategoryField[] } = {};
        
        fieldsData.forEach((field: CategoryField) => {
          if (!field.parent_field_id) {
            topLevel.push(field);
          } else {
            if (!grouped[field.parent_field_id]) {
              grouped[field.parent_field_id] = [];
            }
            grouped[field.parent_field_id].push(field);
          }
        });
        
        setNestedStructure({ topLevel, grouped });
      } catch (error) {
        console.error('Error fetching fields:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchFields();
  }, [categoryId]);
  
  // Start editing a field
  const handleEditField = async (fieldId: string) => {
    const field = fields.find(f => f.field_id === fieldId);
    if (field) {
      let fieldWithChildren = { ...field };
      
      // If it's a container field, fetch its children
      if (field.field_type === 'group' || field.field_type === 'repeater') {
        const children = fields.filter(f => f.parent_field_id === fieldId);
        
        // For each child that is also a container, get its children
        const childrenWithGrandchildren = await Promise.all(
          children.map(async (child) => {
            if (child.field_type === 'group' || child.field_type === 'repeater') {
              const grandchildren = fields.filter(f => f.parent_field_id === child.field_id);
              return { ...child, childFields: grandchildren };
            }
            return child;
          })
        );
        
        (fieldWithChildren as any).children = childrenWithGrandchildren;
      }
      
      setEditingField(fieldId);
      setEditingFieldData(fieldWithChildren);
      setShowAddForm(false);
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingField(null);
    setEditingFieldData(null);
    setShowAddForm(false);
  };
  
  // Save a new field
  const handleSaveNewField = async (fieldData: Partial<CategoryField> & { childFields?: Partial<CategoryField>[] }) => {
    try {
      // If it's a container field with child fields, create them all together
      if ((fieldData.field_type === 'group' || fieldData.field_type === 'repeater') && fieldData.childFields) {
        const response = await fetch('/api/category-fields/create-with-children', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parent: {
              ...fieldData,
              service_category_id: categoryId,
              display_order: fields.length + 1,
              display_format: 'default',
              field_group_type: fieldData.field_type === 'group' ? 'group' : 'repeater',
            },
            children: fieldData.childFields,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add field with children');
        }
        
        setShowAddForm(false);
        window.location.reload();
      } else {
        // Regular single field creation
        const response = await fetch('/api/category-fields', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...fieldData,
            service_category_id: categoryId,
            display_order: fields.length + 1,
            display_format: 'default',
            field_group_type: fieldData.field_group_type || 'none',
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add field');
        }
        
        const newField = await response.json();
        setFields([...fields, newField]);
        setShowAddForm(false);
        
        // Refresh nested structure
        window.location.reload();
      }
    } catch (error) {
      console.error('Error adding field:', error);
      alert(`Failed to add field: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Save field edits
  const handleSaveFieldEdit = async (fieldData: Partial<CategoryField> & { childFields?: Partial<CategoryField>[] }) => {
    if (!editingField) return;
    
    try {
      const originalField = fields.find(f => f.field_id === editingField);
      const isContainerField = originalField && (originalField.field_type === 'group' || originalField.field_type === 'repeater');
      
      if (isContainerField && fieldData.childFields !== undefined) {
        // Use the special update endpoint for container fields with children
        const response = await fetch('/api/category-fields/update-with-children', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fieldId: editingField,
            parent: {
              ...fieldData,
              service_category_id: categoryId,
              key: originalField.key, // Keep original key
              field_type: originalField.field_type, // Keep original field type
            },
            children: fieldData.childFields,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update field with children');
        }
        
        setEditingField(null);
        setEditingFieldData(null);
        window.location.reload();
      } else {
        // Regular field update
        const response = await fetch(`/api/category-fields/${editingField}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fieldData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update field');
        }
        
        const updatedField = await response.json();
        
        setFields(fields.map(field => 
          field.field_id === editingField ? updatedField : field
        ));
        
        setEditingField(null);
        setEditingFieldData(null);
        
        // Refresh nested structure
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating field:', error);
      alert(`Failed to update field: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Delete a field
  const handleDeleteField = async (fieldId: string) => {
    const field = fields.find(f => f.field_id === fieldId);
    const isParent = field && (field.field_type === 'group' || field.field_type === 'repeater');
    
    const confirmMessage = isParent 
      ? 'This will delete the field and all its children. Are you sure?' 
      : 'Are you sure you want to delete this field?';
    
    if (!confirm(confirmMessage)) return;
    
    try {
      const response = await fetch(`/api/category-fields/${fieldId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete field');
      
      setFields(fields.filter(field => field.field_id !== fieldId));
      
      // Refresh page to update nested structure
      window.location.reload();
    } catch (error) {
      console.error('Error deleting field:', error);
      alert('Failed to delete field');
    }
  };
  
  // Reorder fields
  const handleReorderFields = async (newOrder: CategoryField[]) => {
    try {
      const updates = newOrder.map((field, index) => ({
        field_id: field.field_id,
        display_order: index + 1,
      }));
      
      const response = await fetch('/api/category-fields/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });
      
      if (!response.ok) throw new Error('Failed to reorder fields');
      
      setFields(newOrder);
    } catch (error) {
      console.error('Error reordering fields:', error);
      alert('Failed to reorder fields');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-gray-400">Loading advanced field builder...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Advanced Field Builder</h3>
          <p className="text-sm text-gray-600 mt-1">
            Create complex field structures with groups and repeaters. Drag and drop to reorder.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingField(null);
            setEditingFieldData(null);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add New Field
        </button>
      </div>

      {/* Field List */}
      <AdvancedFieldList 
        nestedStructure={nestedStructure}
        onEdit={handleEditField} 
        onDelete={handleDeleteField}
        onReorder={handleReorderFields}
      />
      
      {/* Edit/Add Form */}
      {(editingField || showAddForm) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <AdvancedFieldForm 
            field={editingFieldData}
            parentFields={nestedStructure.topLevel.filter((f: CategoryField) => f.field_type === 'group' || f.field_type === 'repeater')}
            isEditing={!!editingField}
            onCancel={handleCancelEdit}
            onSave={editingField ? handleSaveFieldEdit : handleSaveNewField}
          />
        </div>
      )}
      
      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Field Types Guide</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Group:</strong> Container that organizes related fields together</li>
                <li><strong>Repeater:</strong> Allows users to add multiple instances of child fields</li>
                <li><strong>Regular fields:</strong> Can be placed inside groups or repeaters</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}