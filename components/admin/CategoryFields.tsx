'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryField } from '@/types/product.types';

type CategoryFieldsProps = {
  categoryId: string;
};

export default function CategoryFields({ categoryId }: CategoryFieldsProps) {
  const router = useRouter();
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutType, setLayoutType] = useState<string>('default');
  const [newField, setNewField] = useState<Partial<CategoryField>>({
    name: '',
    key: '',
    field_type: 'text',
    is_required: false,
    display_order: 0,
    options: {},
  });
  
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
  
  // Generate key from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const key = name.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_');
    
    setNewField({
      ...newField,
      name,
      key,
    });
  };
  
  // Add a new field
  const handleAddField = async () => {
    if (!newField.name || !newField.key || !newField.field_type) {
      alert('Please fill out all required fields');
      return;
    }
    
    try {
      const response = await fetch('/api/category-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newField,
          service_category_id: categoryId,
          display_order: fields.length + 1,
          display_format: 'default', // Default display format
        }),
      });
      
      if (!response.ok) throw new Error('Failed to add field');
      
      const newFieldData = await response.json();
      setFields([...fields, newFieldData]);
      
      // Reset form
      setNewField({
        name: '',
        key: '',
        field_type: 'text',
        is_required: false,
        display_order: 0,
        options: {},
      });
      
      router.refresh();
    } catch (error) {
      console.error('Error adding field:', error);
      alert('Failed to add field');
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
  
  if (isLoading) {
    return <div className="text-center py-4">Loading fields...</div>;
  }
  
  // Update layout type
  const updateLayoutType = async (newLayout: string) => {
    try {
      const response = await fetch(`/api/service-categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields_layout: newLayout,
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Product Custom Fields</h3>
        
        {/* Layout Selector */}
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-700 mr-2">Display Layout:</span>
          <select
            value={layoutType}
            onChange={(e) => updateLayoutType(e.target.value)}
            className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="default">Default (List)</option>
            <option value="tabbed">Tabbed</option>
            <option value="grid">Grid</option>
            <option value="gallery">Gallery</option>
          </select>
        </div>
      </div>
      
      {/* Existing Fields */}
      {fields.length > 0 ? (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Custom Fields</h4>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Key</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field) => (
                <tr key={field.field_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{field.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.key}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.field_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.is_required ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeleteField(field.field_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 mb-6 rounded-md">
          <p className="text-gray-600 text-sm">No custom fields defined for this category. Add fields below.</p>
        </div>
      )}
      
      {/* Add New Field Form */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Field</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Field Name */}
          <div>
            <label htmlFor="field-name" className="block text-sm font-medium text-gray-700">
              Field Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="field-name"
              value={newField.name}
              onChange={handleNameChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g. Brand Name"
            />
          </div>
          
          {/* Field Key */}
          <div>
            <label htmlFor="field-key" className="block text-sm font-medium text-gray-700">
              Field Key <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="field-key"
              value={newField.key}
              onChange={(e) => setNewField({ ...newField, key: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g. brand_name"
            />
            <p className="mt-1 text-xs text-gray-500">Must be unique, no spaces, use underscores</p>
          </div>
          
          {/* Field Type */}
          <div>
            <label htmlFor="field-type" className="block text-sm font-medium text-gray-700">
              Field Type <span className="text-red-500">*</span>
            </label>
            <select
              id="field-type"
              value={newField.field_type}
              onChange={(e) => setNewField({ ...newField, field_type: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="text">Text</option>
              <option value="textarea">Text Area</option>
              <option value="number">Number</option>
              <option value="select">Select (Dropdown)</option>
              <option value="checkbox">Checkbox</option>
              <option value="date">Date</option>
              <option value="image">Image URL</option>
            </select>
          </div>
          
          {/* Required Field */}
          <div className="flex items-center h-full pt-6">
            <input
              type="checkbox"
              id="is-required"
              checked={newField.is_required}
              onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is-required" className="ml-2 block text-sm text-gray-700">
              Required Field
            </label>
          </div>
        </div>
        
        {/* Field Options - Only show for select type */}
        {newField.field_type === 'select' && (
          <div className="mt-4">
            <label htmlFor="field-options" className="block text-sm font-medium text-gray-700">
              Options (one per line)
            </label>
            <textarea
              id="field-options"
              value={newField.options?.values?.join('\n') || ''}
              onChange={(e) => {
                const values = e.target.value.split('\n').filter(v => v.trim() !== '');
                setNewField({
                  ...newField,
                  options: { ...newField.options, values }
                });
              }}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
          </div>
        )}
        
        <div className="mt-4">
          <button
            type="button"
            onClick={handleAddField}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Field
          </button>
        </div>
      </div>
    </div>
  );
}