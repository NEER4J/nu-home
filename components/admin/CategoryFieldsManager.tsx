'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryField } from '@/types/product.types';
import FieldList from './FieldList';
import FieldForm from './FieldForm';

type CategoryFieldsManagerProps = {
  categoryId: string;
};

export default function CategoryFieldsManager({ categoryId }: CategoryFieldsManagerProps) {
  const router = useRouter();
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutType, setLayoutType] = useState<string>('default');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingFieldData, setEditingFieldData] = useState<Partial<CategoryField> | null>(null);
  
  // Fetch existing category fields and layout settings
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch fields
        const fieldsResponse = await fetch(`/api/category-fields?categoryId=${categoryId}`);
        if (!fieldsResponse.ok) throw new Error('Failed to fetch fields');
        
        const fieldsData = await fieldsResponse.json();
        setFields(fieldsData);
        
        // Fetch category layout type
        const categoryResponse = await fetch(`/api/service-categories/${categoryId}`);
        if (categoryResponse.ok) {
          const categoryData = await categoryResponse.json();
          setLayoutType(categoryData.fields_layout || 'default');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [categoryId]);
  
  // Start editing a field
  const handleEditField = (fieldId: string) => {
    const field = fields.find(f => f.field_id === fieldId);
    if (field) {
      setEditingField(fieldId);
      setEditingFieldData(field);
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingField(null);
    setEditingFieldData(null);
  };
  
  // Save a new field
  const handleSaveNewField = async (fieldData: Partial<CategoryField>) => {
    try {
      const response = await fetch('/api/category-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...fieldData,
          service_category_id: categoryId,
          display_order: fields.length + 1,
          display_format: 'default', // Default display format
        }),
      });
      
      if (!response.ok) throw new Error('Failed to add field');
      
      const newFieldData = await response.json();
      setFields([...fields, newFieldData]);
      
      router.refresh();
    } catch (error) {
      console.error('Error adding field:', error);
      alert('Failed to add field');
    }
  };
  
  // Save field edits
  const handleSaveFieldEdit = async (fieldData: Partial<CategoryField>) => {
    if (!editingField) return;
    
    try {
      const response = await fetch(`/api/category-fields/${editingField}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fieldData.name,
          is_required: fieldData.is_required,
          is_multi: fieldData.is_multi,
          options: fieldData.options,
          // Note: we don't update key or field_type
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update field');
      
      const updatedField = await response.json();
      
      // Update the fields array
      setFields(fields.map(field => 
        field.field_id === editingField ? updatedField : field
      ));
      
      // Reset editing state
      setEditingField(null);
      setEditingFieldData(null);
      
      router.refresh();
    } catch (error) {
      console.error('Error updating field:', error);
      alert('Failed to update field');
    }
  };
  
  // Delete a field
  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field? This may affect existing products.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/category-fields/${fieldId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete field');
      
      setFields(fields.filter(field => field.field_id !== fieldId));
      router.refresh();
    } catch (error) {
      console.error('Error deleting field:', error);
      alert('Failed to delete field');
    }
  };
  
  // Update layout type
  const updateLayoutType = async (newLayout: string) => {
    try {
      // Changed the endpoint from `/api/service-categories/${categoryId}` to `/api/service-categories/${categoryId}/layout`
      const response = await fetch(`/api/service-categories/${categoryId}/layout`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products_list_layout: newLayout,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update layout');
      
      setLayoutType(newLayout);
      router.refresh();
    } catch (error) {
      console.error('Error updating layout:', error);
      alert('Failed to update layout');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-8 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading fields...</div>
      </div>
    );
  }

  return (

    <div> <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
    <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-medium text-gray-800">Product Layout Settings</h3>
    </div>
    
    <div className="p-6">
        <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose Product Listing Layout
        </label>
        <select
            value={layoutType}
            onChange={(e) => updateLayoutType(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
            <option value="default">Default Grid Layout</option>
            <option value="card">Card Layout (Solar Panel Style)</option>
            <option value="feature">Feature Layout (Boiler Style)</option>
        </select>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4">
        <div className={`border p-2 rounded ${layoutType === 'default' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="mb-2">
            <h4 className="font-medium text-sm">Default Layout</h4>
            <p className="text-xs text-gray-500">Simple grid of product cards</p>
            </div>
            <div className="bg-gray-100 h-24 rounded flex items-center justify-center">
            <div className="text-xs text-gray-500">Grid Preview</div>
            </div>
        </div>
        
        <div className={`border p-2 rounded ${layoutType === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="mb-2">
            <h4 className="font-medium text-sm">Card Layout</h4>
            <p className="text-xs text-gray-500">Solar panel style cards</p>
            </div>
            <div className="bg-gray-100 h-24 rounded flex items-center justify-center">
            <div className="text-xs text-gray-500">Card Preview</div>
            </div>
        </div>
        
        <div className={`border p-2 rounded ${layoutType === 'feature' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="mb-2">
            <h4 className="font-medium text-sm">Feature Layout</h4>
            <p className="text-xs text-gray-500">Boiler style with details</p>
            </div>
            <div className="bg-gray-100 h-24 rounded flex items-center justify-center">
            <div className="text-xs text-gray-500">Feature Preview</div>
            </div>
        </div>
        </div>
    </div>
    </div>

    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b border-gray-100">
        <h3 className="text-lg font-medium text-gray-800">Product Custom Fields</h3>
      
      </div>
      
      <div className="p-6">
        {/* Field List */}
        <FieldList 
          fields={fields} 
          onEdit={handleEditField} 
          onDelete={handleDeleteField} 
        />
        
        {/* Edit Form (conditionally rendered) */}
        {editingField && editingFieldData && (
          <FieldForm 
            field={editingFieldData} 
            isEditing={true}
            onCancel={handleCancelEdit}
            onSave={handleSaveFieldEdit}
          />
        )}
        
        {/* Add New Field Form (hidden when editing) */}
        {!editingField && (
          <FieldForm 
            isEditing={false}
            onSave={handleSaveNewField}
          />
        )}
      </div>
    </div>
    </div>
  );
}