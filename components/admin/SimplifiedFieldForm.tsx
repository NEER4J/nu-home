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
  });

  const [childFields, setChildFields] = useState<Partial<FieldChild>[]>([]);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [childDropdownOptions, setChildDropdownOptions] = useState<{ [key: number]: string[] }>({});
  const [nestedDropdownOptions, setNestedDropdownOptions] = useState<{ [parentIndex: number]: { [childIndex: number]: string[] } }>({});

  useEffect(() => {
    if (field) {
      setFormData(field);
      
      // Initialize dropdown options
      if (field.options && typeof field.options === 'object' && 'options' in field.options) {
        setDropdownOptions(field.options.options || []);
      } else {
        setDropdownOptions([]);
      }

      // Initialize child dropdown options
      if (field.field_structure?.children) {
        const childOptions: { [key: number]: string[] } = {};
        const nestedOptions: { [parentIndex: number]: { [childIndex: number]: string[] } } = {};
        
        field.field_structure.children.forEach((child, index) => {
          if (child.options && typeof child.options === 'object' && 'options' in child.options) {
            childOptions[index] = child.options.options || [];
          } else {
            childOptions[index] = [];
          }

          // Initialize nested child options
          if (child.children) {
            nestedOptions[index] = {};
            child.children.forEach((nestedChild, nestedIndex) => {
              if (nestedChild.options && typeof nestedChild.options === 'object' && 'options' in nestedChild.options) {
                nestedOptions[index][nestedIndex] = nestedChild.options.options || [];
              } else {
                nestedOptions[index][nestedIndex] = [];
              }
            });
          }
        });
        
        setChildDropdownOptions(childOptions);
        setNestedDropdownOptions(nestedOptions);
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

      // Initialize dropdown options if changing to select type
      if (name === 'field_type' && value === 'select' && !formData.options) {
        setFormData(prev => ({ ...prev, options: { options: [] } }));
        setDropdownOptions([]);
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
        ? { children: childFields as FieldChild[] }
        : undefined
    };

    onSave(dataToSave);
  };

  const addDropdownOption = () => {
    setDropdownOptions([...dropdownOptions, '']);
  };

  const updateDropdownOption = (index: number, value: string) => {
    const updated = [...dropdownOptions];
    updated[index] = value;
    setDropdownOptions(updated);
    
    // Update formData with the new options
    setFormData(prev => ({
      ...prev,
      options: { options: updated.filter(opt => opt.trim() !== '') }
    }));
  };

  const removeDropdownOption = (index: number) => {
    const updated = dropdownOptions.filter((_, i) => i !== index);
    setDropdownOptions(updated);
    
    // Update formData with the new options
    setFormData(prev => ({
      ...prev,
      options: { options: updated.filter(opt => opt.trim() !== '') }
    }));
  };

  const addChildDropdownOption = (childIndex: number) => {
    const currentOptions = childDropdownOptions[childIndex] || [];
    setChildDropdownOptions({
      ...childDropdownOptions,
      [childIndex]: [...currentOptions, '']
    });
  };

  const updateChildDropdownOption = (childIndex: number, optionIndex: number, value: string) => {
    const currentOptions = childDropdownOptions[childIndex] || [];
    const updated = [...currentOptions];
    updated[optionIndex] = value;
    
    setChildDropdownOptions({
      ...childDropdownOptions,
      [childIndex]: updated
    });
    
    // Update the child field with the new options
    const updatedChild = { ...childFields[childIndex] };
    updatedChild.options = { options: updated.filter(opt => opt.trim() !== '') };
    updateChildField(childIndex, updatedChild);
  };

  const removeChildDropdownOption = (childIndex: number, optionIndex: number) => {
    const currentOptions = childDropdownOptions[childIndex] || [];
    const updated = currentOptions.filter((_, i) => i !== optionIndex);
    
    setChildDropdownOptions({
      ...childDropdownOptions,
      [childIndex]: updated
    });
    
    // Update the child field with the new options
    const updatedChild = { ...childFields[childIndex] };
    updatedChild.options = { options: updated.filter(opt => opt.trim() !== '') };
    updateChildField(childIndex, updatedChild);
  };

  const addNestedDropdownOption = (parentIndex: number, childIndex: number) => {
    const currentOptions = nestedDropdownOptions[parentIndex]?.[childIndex] || [];
    setNestedDropdownOptions({
      ...nestedDropdownOptions,
      [parentIndex]: {
        ...nestedDropdownOptions[parentIndex],
        [childIndex]: [...currentOptions, '']
      }
    });
  };

  const updateNestedDropdownOption = (parentIndex: number, childIndex: number, optionIndex: number, value: string) => {
    const currentOptions = nestedDropdownOptions[parentIndex]?.[childIndex] || [];
    const updated = [...currentOptions];
    updated[optionIndex] = value;
    
    setNestedDropdownOptions({
      ...nestedDropdownOptions,
      [parentIndex]: {
        ...nestedDropdownOptions[parentIndex],
        [childIndex]: updated
      }
    });
    
    // Update the nested child field with the new options
    const updatedChild = { ...childFields[parentIndex] };
    if (updatedChild.children) {
      updatedChild.children[childIndex] = {
        ...updatedChild.children[childIndex],
        options: { options: updated.filter(opt => opt.trim() !== '') }
      };
      updateChildField(parentIndex, updatedChild);
    }
  };

  const removeNestedDropdownOption = (parentIndex: number, childIndex: number, optionIndex: number) => {
    const currentOptions = nestedDropdownOptions[parentIndex]?.[childIndex] || [];
    const updated = currentOptions.filter((_, i) => i !== optionIndex);
    
    setNestedDropdownOptions({
      ...nestedDropdownOptions,
      [parentIndex]: {
        ...nestedDropdownOptions[parentIndex],
        [childIndex]: updated
      }
    });
    
    // Update the nested child field with the new options
    const updatedChild = { ...childFields[parentIndex] };
    if (updatedChild.children) {
      updatedChild.children[childIndex] = {
        ...updatedChild.children[childIndex],
        options: { options: updated.filter(opt => opt.trim() !== '') }
      };
      updateChildField(parentIndex, updatedChild);
    }
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

    // Initialize dropdown options if changing to select type
    if (fieldData.field_type === 'select' && !childDropdownOptions[index]) {
      setChildDropdownOptions({
        ...childDropdownOptions,
        [index]: []
      });
    }
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

    // Initialize nested dropdown options state for the new child
    const newChildIndex = updated[parentIndex].children!.length - 1;
    setNestedDropdownOptions({
      ...nestedDropdownOptions,
      [parentIndex]: {
        ...nestedDropdownOptions[parentIndex],
        [newChildIndex]: []
      }
    });
  };

  const updateNestedChild = (parentIndex: number, childIndex: number, fieldData: Partial<FieldChild>) => {
    const updated = [...childFields];
    if (updated[parentIndex].children) {
      updated[parentIndex].children![childIndex] = { ...updated[parentIndex].children![childIndex], ...fieldData };
      setChildFields(updated);

      // Initialize dropdown options if changing to select type
      if (fieldData.field_type === 'select' && !nestedDropdownOptions[parentIndex]?.[childIndex]) {
        setNestedDropdownOptions({
          ...nestedDropdownOptions,
          [parentIndex]: {
            ...nestedDropdownOptions[parentIndex],
            [childIndex]: []
          }
        });
      }
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
                Dropdown Options
              </label>
              <div className="space-y-3">
                {dropdownOptions.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500">No options added yet</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Add Option" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dropdownOptions.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateDropdownOption(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Option ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeDropdownOption(index)}
                          className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={addDropdownOption}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Add Option
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Add the options that will appear in the dropdown menu
              </p>
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

                  {/* Child Dropdown Options */}
                  {child.field_type === 'select' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dropdown Options
                      </label>
                      <div className="space-y-2">
                        {(childDropdownOptions[index] || []).length === 0 ? (
                          <div className="text-center py-3 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                            <p className="text-xs text-gray-500">No options added yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(childDropdownOptions[index] || []).map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateChildDropdownOption(index, optionIndex, e.target.value)}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeChildDropdownOption(index, optionIndex)}
                                  className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => addChildDropdownOption(index)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                        >
                          Add Option
                        </button>
                      </div>
                    </div>
                  )}

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

                            {/* Nested Child Dropdown Options */}
                            {nestedChild.field_type === 'select' && (
                              <div className="mt-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Dropdown Options
                                </label>
                                <div className="space-y-1">
                                  {(nestedDropdownOptions[index]?.[nestedIndex] || []).length === 0 ? (
                                    <div className="text-center py-2 bg-gray-50 rounded border border-dashed border-gray-300">
                                      <p className="text-xs text-gray-500">No options</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {(nestedDropdownOptions[index]?.[nestedIndex] || []).map((option, optionIndex) => (
                                        <div key={optionIndex} className="flex items-center space-x-1">
                                          <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => updateNestedDropdownOption(index, nestedIndex, optionIndex, e.target.value)}
                                            className="flex-1 px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder={`Option ${optionIndex + 1}`}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => removeNestedDropdownOption(index, nestedIndex, optionIndex)}
                                            className="px-1 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => addNestedDropdownOption(index, nestedIndex)}
                                    className="px-1 py-1 text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                                  >
                                    Add Option
                                  </button>
                                </div>
                              </div>
                            )}
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