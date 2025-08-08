'use client';

import { useState, useEffect } from 'react';
import { CategoryField } from '@/types/product.types';

type AdvancedFieldFormProps = {
  field?: Partial<CategoryField> | null;
  parentFields: CategoryField[];
  isEditing: boolean;
  onSave: (field: Partial<CategoryField>) => void;
  onCancel: () => void;
};

export default function AdvancedFieldForm({ 
  field, 
  parentFields, 
  isEditing, 
  onSave, 
  onCancel 
}: AdvancedFieldFormProps) {
  const [formData, setFormData] = useState<Partial<CategoryField>>({
    name: '',
    key: '',
    field_type: 'text',
    is_required: false,
    is_multi: false,
    parent_field_id: null,
    field_group_type: 'none',
    options: null,
  });

  const [childFields, setChildFields] = useState<Partial<CategoryField & { childFields?: Partial<CategoryField>[] }>[]>([]);

  useEffect(() => {
    if (field) {
      setFormData(field);
      
      // If editing a container field with children, populate childFields
      if (field.children && field.children.length > 0) {
        setChildFields(field.children);
      } else {
        setChildFields([]);
      }
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

  const handleFieldTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fieldType = e.target.value;
    let newData: Partial<CategoryField> = {
      ...formData,
      field_type: fieldType as CategoryField['field_type'],
    };

    // Set field_group_type based on field_type
    if (fieldType === 'group') {
      newData.field_group_type = 'group';
      newData.parent_field_id = null; // Groups are always top-level
    } else if (fieldType === 'repeater') {
      newData.field_group_type = 'repeater';
      newData.parent_field_id = null; // Repeaters are always top-level
    } else {
      // Regular field - determine if it's a child or top-level
      newData.field_group_type = formData.parent_field_id ? 
        (parentFields.find(p => p.field_id === formData.parent_field_id)?.field_type === 'repeater' ? 'repeater_child' : 'group_child') : 
        'none';
    }

    setFormData(newData);
  };

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parentId = e.target.value || null;
    const parentField = parentFields.find(p => p.field_id === parentId);
    
    let field_group_type: CategoryField['field_group_type'] = 'none';
    if (parentId && parentField) {
      field_group_type = parentField.field_type === 'repeater' ? 'repeater_child' : 'group_child';
    }

    setFormData(prev => ({
      ...prev,
      parent_field_id: parentId,
      field_group_type,
    }));
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const options = e.target.value ? JSON.parse(e.target.value) : null;
      setFormData(prev => ({ ...prev, options }));
    } catch (error) {
      // Invalid JSON, keep the raw text for now
      console.log('Invalid JSON in options');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.key) {
      alert('Name and key are required');
      return;
    }

    // If it's a group or repeater, pass child fields as well
    const dataToSave = {
      ...formData,
      ...(isContainerField && { childFields })
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
      childFields: [],
    }]);
  };

  const updateChildField = (index: number, fieldData: Partial<CategoryField>) => {
    const updated = [...childFields];
    updated[index] = { ...updated[index], ...fieldData };
    setChildFields(updated);
  };

  const removeChildField = (index: number) => {
    setChildFields(childFields.filter((_, i) => i !== index));
  };

  // Grandchild management (for nested containers)
  const addGrandchildField = (parentIndex: number) => {
    const updated = [...childFields];
    if (!updated[parentIndex].childFields) {
      updated[parentIndex].childFields = [];
    }
    updated[parentIndex].childFields!.push({
      name: '',
      key: '',
      field_type: 'text',
      is_required: false,
      is_multi: false,
    });
    setChildFields(updated);
  };

  const updateGrandchildField = (parentIndex: number, childIndex: number, fieldData: Partial<CategoryField>) => {
    const updated = [...childFields];
    if (updated[parentIndex].childFields) {
      updated[parentIndex].childFields![childIndex] = { ...updated[parentIndex].childFields![childIndex], ...fieldData };
      setChildFields(updated);
    }
  };

  const removeGrandchildField = (parentIndex: number, childIndex: number) => {
    const updated = [...childFields];
    if (updated[parentIndex].childFields) {
      updated[parentIndex].childFields = updated[parentIndex].childFields!.filter((_, i) => i !== childIndex);
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
              placeholder="e.g., Product Specifications"
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
              placeholder="e.g., product_specifications"
              required
              disabled={isEditing} // Can't change key when editing
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
              onChange={handleFieldTypeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isEditing} // Can't change type when editing
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
                <option value="group">Group (organize fields)</option>
                <option value="repeater">Repeater (multiple instances)</option>
              </optgroup>
            </select>
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">Field type cannot be changed when editing</p>
            )}
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
        </div>
      </div>

      {/* Field-specific options */}
      {needsOptions && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Options (JSON)
          </label>
          <textarea
            name="options"
            value={formData.options ? JSON.stringify(formData.options, null, 2) : ''}
            onChange={handleOptionsChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder={`{
  "options": ["Option 1", "Option 2", "Option 3"]
}`}
          />
          <p className="text-xs text-gray-500 mt-1">
            For select fields, provide options as JSON. Example: {"{"}"options": ["Option 1", "Option 2"]{"}"}
          </p>
        </div>
      )}

      {/* Child Fields Management */}
      {isContainerField && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {formData.field_type === 'group' ? 'Group Fields' : 'Repeater Fields'}
              </h3>
              <p className="text-sm text-gray-600">
                {formData.field_type === 'group' 
                  ? 'Add fields that will be organized together in this group'
                  : 'Add fields that users can repeat multiple times'
                }
              </p>
            </div>
            <button
              type="button"
              onClick={addChildField}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Add Field
            </button>
          </div>

          {childFields.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">No fields added yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Field" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {childFields.map((child, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-gray-900">Field #{index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeChildField(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field Name *
                      </label>
                      <input
                        type="text"
                        value={child.name || ''}
                        onChange={(e) => {
                          const name = e.target.value;
                          const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
                          updateChildField(index, { ...child, name, key });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Feature Name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field Type *
                      </label>
                      <select
                        value={child.field_type || 'text'}
                        onChange={(e) => updateChildField(index, { ...child, field_type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          <option value="group">Group (organize fields)</option>
                          <option value="repeater">Repeater (multiple instances)</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={child.is_required || false}
                        onChange={(e) => updateChildField(index, { ...child, is_required: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Required</span>
                    </label>

                    {child.field_type === 'select' && (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={child.is_multi || false}
                          onChange={(e) => updateChildField(index, { ...child, is_multi: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Multiple selection</span>
                      </label>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-500 font-mono">
                    Key: {child.key || 'auto-generated'}
                  </div>

                  {/* Nested fields for container children */}
                  {(child.field_type === 'group' || child.field_type === 'repeater') && (
                    <div className="mt-4 border-t pt-4 bg-gray-100 -mx-4 px-4 -mb-4 pb-4">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-sm font-medium text-gray-800">
                          {child.field_type === 'group' ? 'Group' : 'Repeater'} Fields
                        </h5>
                        <button
                          type="button"
                          onClick={() => addGrandchildField(index)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200"
                        >
                          Add Field
                        </button>
                      </div>

                      {(!child.childFields || child.childFields.length === 0) ? (
                        <div className="text-center py-4 bg-white rounded border-2 border-dashed border-gray-300">
                          <p className="text-xs text-gray-500">No nested fields</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {child.childFields!.map((grandchild, grandchildIndex) => (
                            <div key={grandchildIndex} className="bg-white border border-gray-200 rounded p-3">
                              <div className="flex justify-between items-start mb-2">
                                <h6 className="text-xs font-medium text-gray-700">Nested Field #{grandchildIndex + 1}</h6>
                                <button
                                  type="button"
                                  onClick={() => removeGrandchildField(index, grandchildIndex)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                  <input
                                    type="text"
                                    value={grandchild.name || ''}
                                    onChange={(e) => {
                                      const name = e.target.value;
                                      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
                                      updateGrandchildField(index, grandchildIndex, { ...grandchild, name, key });
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Field name"
                                  />
                                </div>
                                <div>
                                  <select
                                    value={grandchild.field_type || 'text'}
                                    onChange={(e) => updateGrandchildField(index, grandchildIndex, { ...grandchild, field_type: e.target.value as any })}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                              
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={grandchild.is_required || false}
                                  onChange={(e) => updateGrandchildField(index, grandchildIndex, { ...grandchild, is_required: e.target.checked })}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-1 text-xs text-gray-700">Required</span>
                              </label>
                              
                              <div className="mt-1 text-xs text-gray-400 font-mono">
                                Key: {grandchild.key || 'auto-generated'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}