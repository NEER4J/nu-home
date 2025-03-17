'use client';

import { useState, useEffect } from 'react';
import { CategoryField } from '@/types/product.types';

type FieldFormProps = {
  field?: Partial<CategoryField>;
  isEditing: boolean;
  onCancel?: () => void;
  onSave: (fieldData: Partial<CategoryField>) => void;
};

export default function FieldForm({ field, isEditing, onCancel, onSave }: FieldFormProps) {
  const [fieldData, setFieldData] = useState<Partial<CategoryField>>(
    field || {
      name: '',
      key: '',
      field_type: 'text',
      is_required: false,
      display_order: 0,
      options: {},
    }
  );

  useEffect(() => {
    if (field) {
      setFieldData(field);
    }
  }, [field]);

  // Generate key from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    let key = fieldData.key;

    // Only auto-generate key when creating a new field (not editing) and key is empty or was auto-generated
    if (!isEditing) {
      key = name.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_');
    }

    setFieldData({
      ...fieldData,
      name,
      key,
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(fieldData);
  };

  // Generate a unique ID for form elements
  const idPrefix = isEditing ? 'edit-' : '';

  return (
    <form onSubmit={handleSubmit} className={isEditing ? "border-t pt-4 mb-8" : "border-t pt-4"}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium text-gray-700">{isEditing ? 'Edit Field' : 'Add New Field'}</h4>
        {isEditing && onCancel && (
          <button 
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Field Name */}
        <div>
          <label htmlFor={`${idPrefix}field-name`} className="block text-sm font-medium text-gray-700">
            Field Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id={`${idPrefix}field-name`}
            value={fieldData.name}
            onChange={handleNameChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g. Brand Name"
            required
          />
        </div>

        {/* Field Key and Type (conditionally editable) */}
        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${idPrefix}field-key`} className="block text-sm font-medium text-gray-700">
                Field Key (cannot be changed)
              </label>
              <input
                type="text"
                id={`${idPrefix}field-key`}
                value={fieldData.key}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm text-gray-500"
              />
            </div>
            
            <div>
              <label htmlFor={`${idPrefix}field-type`} className="block text-sm font-medium text-gray-700">
                Field Type (cannot be changed)
              </label>
              <input
                type="text"
                id={`${idPrefix}field-type`}
                value={fieldData.field_type}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm text-gray-500"
              />
            </div>
          </div>
        ) : (
          <>
            {/* Field Key */}
            <div>
              <label htmlFor={`${idPrefix}field-key`} className="block text-sm font-medium text-gray-700">
                Field Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id={`${idPrefix}field-key`}
                value={fieldData.key}
                onChange={(e) => setFieldData({ ...fieldData, key: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g. brand_name"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Must be unique, no spaces, use underscores</p>
            </div>
            
            {/* Field Type */}
            <div>
              <label htmlFor={`${idPrefix}field-type`} className="block text-sm font-medium text-gray-700">
                Field Type <span className="text-red-500">*</span>
              </label>
              <select
                id={`${idPrefix}field-type`}
                value={fieldData.field_type}
                onChange={(e) => setFieldData({ ...fieldData, field_type: e.target.value as any })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="text">Text</option>
                <option value="textarea">Text Area</option>
                <option value="number">Number</option>
                <option value="select">Select (Dropdown)</option>
                <option value="checkbox">Checkbox</option>
                <option value="date">Date</option>
                <option value="image">Image URL</option>
                <option value="repeater">Repeater</option>
              </select>
            </div>
          </>
        )}

        {/* Field options */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`${idPrefix}is-required`}
              checked={fieldData.is_required}
              onChange={(e) => setFieldData({ ...fieldData, is_required: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`${idPrefix}is-required`} className="ml-2 block text-sm text-gray-700">
              Required Field
            </label>
          </div>
          
          {fieldData.field_type === 'select' && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`${idPrefix}is-multi`}
                checked={fieldData.is_multi}
                onChange={(e) => setFieldData({ ...fieldData, is_multi: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={`${idPrefix}is-multi`} className="ml-2 block text-sm text-gray-700">
                Allow Multiple Selections
              </label>
            </div>
          )}
        </div>

        {/* Field-specific options */}
        {fieldData.field_type === 'select' && (
          <div>
            <label htmlFor={`${idPrefix}field-options`} className="block text-sm font-medium text-gray-700">
              Options (one per line)
            </label>
            <textarea
              id={`${idPrefix}field-options`}
              value={fieldData.options?.values?.join('\n') || ''}
              onChange={(e) => {
                const values = e.target.value.split('\n').filter(v => v.trim() !== '');
                setFieldData({
                  ...fieldData,
                  options: { ...fieldData.options, values }
                });
              }}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
          </div>
        )}

        {fieldData.field_type === 'repeater' && (
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Repeater Field:</strong> This will allow users to add multiple items with the same field type.
            </p>
            <p className="text-sm text-blue-700 mt-2">
              For example, a "Features" repeater field will let users add as many product features as they need.
            </p>
          </div>
        )}

        <div className="mt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isEditing ? 'Save Changes' : 'Add Field'}
          </button>
        </div>
      </div>
    </form>
  );
}