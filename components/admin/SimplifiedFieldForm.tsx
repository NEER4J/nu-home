'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CategoryField, FieldChild } from '@/types/product.types';

type SimplifiedFieldFormProps = {
  field?: CategoryField | null;
  isEditing: boolean;
  onSave: (field: Partial<CategoryField>) => void;
  onCancel: () => void;
};

export default function SimplifiedFieldForm({ 
  field, 
  isEditing, 
  onSave, 
  onCancel 
}: SimplifiedFieldFormProps) {
  const [formData, setFormData] = useState<Partial<CategoryField>>({
    name: '',
    key: '',
    field_type: 'text',
    is_required: false,
    is_multi: false,
    options: null,
    field_structure: null,
  });

  const [childFields, setChildFields] = useState<FieldChild[]>([]);

  useEffect(() => {
    if (field) {
      setFormData(field);
      setChildFields(field.field_structure?.children || []);
    }
  }, [field]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Auto-generate key from name if not editing
      if (name === 'name' && !isEditing) {
        const key = value.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        setFormData(prev => ({ ...prev, key }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.key) {
      alert('Name and key are required');
      return;
    }

    // Prepare data with nested structure if applicable
    const dataToSave = {
      ...formData,
      field_structure: (formData.field_type === 'group' || formData.field_type === 'repeater') && childFields.length > 0
        ? { children: childFields }
        : null
    };

    onSave(dataToSave);
  };

  const addChildField = () => {
    setChildFields([...childFields, {
      name: '',
      key: '',
      field_type: 'text',
      is_required: false,
      is_multi: false,
    }]);
  };

  const updateChildField = (index: number, fieldData: Partial<FieldChild>) => {
    const updated = [...childFields];
    updated[index] = { ...updated[index], ...fieldData };
    setChildFields(updated);
  };

  const removeChildField = (index: number) => {
    setChildFields(childFields.filter((_, i) => i !== index));
  };

  // Add nested child to a child field (for 2-level nesting)
  const addNestedChild = (parentIndex: number) => {
    const updated = [...childFields];
    if (!updated[parentIndex].children) {
      updated[parentIndex].children = [];
    }
    updated[parentIndex].children!.push({
      name: '',
      key: '',
      field_type: 'text',
      is_required: false,
    });
    setChildFields(updated);
  };

  const updateNestedChild = (parentIndex: number, childIndex: number, fieldData: Partial<FieldChild>) => {
    const updated = [...childFields];
    if (updated[parentIndex].children) {
      updated[parentIndex].children![childIndex] = { ...updated[parentIndex].children![childIndex], ...fieldData };
      setChildFields(updated);
    }
  };

  const removeNestedChild = (parentIndex: number, childIndex: number) => {
    const updated = [...childFields];
    if (updated[parentIndex].children) {
      updated[parentIndex].children = updated[parentIndex].children!.filter((_, i) => i !== childIndex);
      setChildFields(updated);
    }
  };

  const isContainerField = formData.field_type === 'group' || formData.field_type === 'repeater';
  const needsOptions = formData.field_type === 'select';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Edit Field' : 'Add New Field'}
        </h3>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            {isEditing ? 'Update' : 'Create'} Field
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., What's included"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Key *
            </label>
            <input
              type="text"
              name="key"
              value={formData.key || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="e.g., whats_included"
              required
              disabled={isEditing}
            />
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">Key cannot be changed when editing</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Type *
            </label>
            <select
              name="field_type"
              value={formData.field_type || 'text'}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isEditing}
            >
              <optgroup label="Regular Fields">
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="textarea">Textarea</option>
                <option value="select">Select Dropdown</option>
                <option value="checkbox">Checkbox</option>
                <option value="date">Date</option>
                <option value="image">Image</option>
              </optgroup>
              <optgroup label="Container Fields">
                <option value="group">Group</option>
                <option value="repeater">Repeater</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Field Options */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_required"
                checked={formData.is_required || false}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Required field</span>
            </label>

            {formData.field_type === 'select' && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_multi"
                  checked={formData.is_multi || false}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Multiple selection</span>
              </label>
            )}
          </div>

          {needsOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Options (JSON)
              </label>
              <textarea
                name="options"
                value={formData.options ? JSON.stringify(formData.options, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const options = e.target.value ? JSON.parse(e.target.value) : null;
                    setFormData(prev => ({ ...prev, options }));
                  } catch (error) {
                    // Invalid JSON, keep the raw text for now
                  }
                }}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder='{"options": ["Option 1", "Option 2"]}'
              />
            </div>
          )}
        </div>
      </div>

      {/* Child Fields Management */}
      {isContainerField && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {formData.field_type === 'group' ? 'Group Fields' : 'Repeater Fields'}
              </h3>
              <p className="text-sm text-gray-600">
                Fields will be stored as JSON structure within this single database entry
              </p>
            </div>
            <button
              type="button"
              onClick={addChildField}
              className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              <Plus size={16} />
              <span>Add Child Field</span>
            </button>
          </div>

          {childFields.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">No child fields defined</p>
              <p className="text-sm text-gray-400 mt-1">Add child fields to create nested structure</p>
            </div>
          ) : (
            <div className="space-y-4">
              {childFields.map((child, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-gray-900">Child Field #{index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeChildField(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <input
                        type="text"
                        value={child.name || ''}
                        onChange={(e) => {
                          const name = e.target.value;
                          const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
                          updateChildField(index, { ...child, name, key });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Child field name"
                      />
                    </div>
                    
                    <div>
                      <select
                        value={child.field_type || 'text'}
                        onChange={(e) => updateChildField(index, { ...child, field_type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="textarea">Textarea</option>
                        <option value="select">Select</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="date">Date</option>
                        <option value="image">Image</option>
                        <option value="group">Group</option>
                        <option value="repeater">Repeater</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={child.is_required || false}
                        onChange={(e) => updateChildField(index, { ...child, is_required: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">Required</span>
                    </label>

                    {(child.field_type === 'group' || child.field_type === 'repeater') && (
                      <button
                        type="button"
                        onClick={() => addNestedChild(index)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Add Nested Field
                      </button>
                    )}
                  </div>

                  {/* Nested children */}
                  {child.children && child.children.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <h5 className="text-sm font-medium text-gray-800 mb-3">Nested Fields:</h5>
                      <div className="space-y-2">
                        {child.children.map((nestedChild, nestedIndex) => (
                          <div key={nestedIndex} className="bg-white border border-gray-200 rounded p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-medium">Nested #{nestedIndex + 1}</span>
                              <button
                                type="button"
                                onClick={() => removeNestedChild(index, nestedIndex)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={nestedChild.name || ''}
                                onChange={(e) => {
                                  const name = e.target.value;
                                  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
                                  updateNestedChild(index, nestedIndex, { ...nestedChild, name, key });
                                }}
                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="Name"
                              />
                              <select
                                value={nestedChild.field_type || 'text'}
                                onChange={(e) => updateNestedChild(index, nestedIndex, { ...nestedChild, field_type: e.target.value as any })}
                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                              >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="textarea">Textarea</option>
                                <option value="select">Select</option>
                                <option value="checkbox">Checkbox</option>
                                <option value="date">Date</option>
                                <option value="image">Image</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500 font-mono">
                    Key: {child.key || 'auto-generated'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}