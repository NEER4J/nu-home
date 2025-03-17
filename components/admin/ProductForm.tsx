'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct } from '@/lib/products-actions';
import { Product } from '@/types/product.types';
import { ServiceCategory } from '@/types/database.types';
import { CategoryField } from '@/types/product.types';

type ProductFormProps = {
  product?: Product;
  categories: ServiceCategory[];
  isEditing?: boolean;
};

export function ProductForm({ product, categories, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [slug, setSlug] = useState<string>(product?.slug || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    product?.service_category_id || categories[0]?.service_category_id || ''
  );
  const [specs, setSpecs] = useState<Record<string, string>>(product?.specifications || {});
  const [categoryFields, setCategoryFields] = useState<CategoryField[]>([]);
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, any>>(
    product?.product_fields || {}
  );
  const [newSpecKey, setNewSpecKey] = useState<string>('');
  const [newSpecValue, setNewSpecValue] = useState<string>('');
  const [isFetchingFields, setIsFetchingFields] = useState<boolean>(false);
  
  // Fetch category fields when category changes
  useEffect(() => {
    async function fetchCategoryFields() {
      if (!selectedCategory) return;
      
      setIsFetchingFields(true);
      try {
        const response = await fetch(`/api/category-fields?categoryId=${selectedCategory}`);
        if (!response.ok) throw new Error('Failed to fetch category fields');
        
        const data = await response.json();
        setCategoryFields(data);
        
        // Initialize fields that don't have values yet
        if (!isEditing || selectedCategory !== product?.service_category_id) {
          const initialValues: Record<string, any> = {};
          data.forEach((field: CategoryField) => {
            // Only set default values for fields that don't already have a value
            if (!(field.key in dynamicFieldValues)) {
              if (field.field_type === 'repeater') {
                initialValues[field.key] = []; // Initialize repeater as empty array
              } else {
                initialValues[field.key] = '';
              }
            }
          });
          
          setDynamicFieldValues(prev => ({
            ...prev,
            ...initialValues
          }));
        }
      } catch (error) {
        console.error('Error fetching category fields:', error);
      } finally {
        setIsFetchingFields(false);
      }
    }
    
    fetchCategoryFields();
  }, [selectedCategory, isEditing, product]);
  
  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  };
  
  // Handle name change to auto-generate slug
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!isEditing || !product?.slug) {
      setSlug(generateSlug(name));
    }
  };
  
  // Handle dynamic field value changes
  const handleFieldChange = (key: string, value: any) => {
    setDynamicFieldValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Handle adding a repeater item
  const handleAddRepeaterItem = (key: string) => {
    setDynamicFieldValues(prev => {
      const currentValues = Array.isArray(prev[key]) ? prev[key] : [];
      return {
        ...prev,
        [key]: [...currentValues, '']
      };
    });
  };
  
  // Handle updating a repeater item
  const handleUpdateRepeaterItem = (key: string, index: number, value: string) => {
    setDynamicFieldValues(prev => {
      const currentValues = [...prev[key]];
      currentValues[index] = value;
      return {
        ...prev,
        [key]: currentValues
      };
    });
  };
  
  // Handle removing a repeater item
  const handleRemoveRepeaterItem = (key: string, index: number) => {
    setDynamicFieldValues(prev => {
      const currentValues = [...prev[key]];
      currentValues.splice(index, 1);
      return {
        ...prev,
        [key]: currentValues
      };
    });
  };
  
  // Add a new specification
  const addSpec = () => {
    if (!newSpecKey || !newSpecValue) return;
    
    setSpecs(prev => ({
      ...prev,
      [newSpecKey]: newSpecValue
    }));
    
    setNewSpecKey('');
    setNewSpecValue('');
  };
  
  // Remove a specification
  const removeSpec = (key: string) => {
    setSpecs(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };
  
  // Render a field based on its type
  const renderField = (field: CategoryField) => {
    const value = dynamicFieldValues[field.key];
    
    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            id={`field-${field.key}`}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            id={`field-${field.key}`}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            id={`field-${field.key}`}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );
      
        case 'select':
          if (field.is_multi) {
            // Convert value to array if it's not already
            const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
            
            return (
              <div className="space-y-2 mt-1">
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 max-h-60 overflow-y-auto flex flex-wrap justify-start gap-2 items-center">
                  {field.options?.values?.map((option: string) => {
                    const isSelected = selectedValues.includes(option);
                    
                    return (
                      <div key={option} className="flex items-center last:mb-0">
                        <input
                          type="checkbox"
                          id={`field-${field.key}-${option}`}
                          checked={isSelected}
                          onChange={() => {
                            let newSelectedValues;
                            if (isSelected) {
                              // Remove if already selected
                              newSelectedValues = selectedValues.filter(val => val !== option);
                            } else {
                              // Add if not selected
                              newSelectedValues = [...selectedValues, option];
                            }
                            handleFieldChange(field.key, newSelectedValues);
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label 
                          htmlFor={`field-${field.key}-${option}`} 
                          className="ml-2 text-sm text-gray-700 cursor-pointer"
                        >
                          {option}
                        </label>
                      </div>
                    );
                  })}
                  
                  {/* Show message if no options */}
                  {(!field.options?.values || field.options.values.length === 0) && (
                    <p className="text-sm text-gray-500 italic">No options available</p>
                  )}
                </div>
                
                {/* Selected values summary */}
                {selectedValues.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedValues.map((selectedValue) => (
                      <span 
                        key={selectedValue}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {selectedValue}
                        <button
                          type="button"
                          onClick={() => {
                            const newSelectedValues = selectedValues.filter(val => val !== selectedValue);
                            handleFieldChange(field.key, newSelectedValues);
                          }}
                          className="ml-1 text-blue-500 hover:text-blue-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <select
                id={`field-${field.key}`}
                value={value || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={field.is_required}
              >
                <option value="">Select an option</option>
                {field.options?.values?.map((option: string) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            );
          }
      
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`field-${field.key}`}
              checked={value === true}
              onChange={(e) => handleFieldChange(field.key, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`field-${field.key}`} className="ml-2 text-sm text-gray-700">
              {field.name}
            </label>
          </div>
        );
      
      case 'date':
        return (
          <input
            type="date"
            id={`field-${field.key}`}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );
      
      case 'image':
        return (
          <input
            type="url"
            id={`field-${field.key}`}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );
      
      case 'repeater':
        // Simple implementation of a repeater field that repeats the same text field
        const repeaterValues = Array.isArray(value) ? value : [];
        
        return (
          <div className="border border-gray-200 rounded-md bg-gray-50 overflow-hidden">
            {repeaterValues.length > 0 ? (
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full">
                  <tbody>
                    {repeaterValues.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 last:border-b-0">
                      
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => handleUpdateRepeaterItem(field.key, index, e.target.value)}
                            className="w-full py-1 px-2 text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
                            placeholder={`${field.name} item`}
                          />
                        </td>
                        <td className="py-1 px-2 w-10 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRepeaterItem(field.key, index)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">No items added yet.</div>
            )}
            
            <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-t border-gray-200">
              <span className="text-xs text-gray-500">{repeaterValues.length} items</span>
              <button
                type="button"
                onClick={() => handleAddRepeaterItem(field.key)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Item
              </button>
            </div>
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            id={`field-${field.key}`}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );
    }
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      
      // Add specifications to form data
      Object.entries(specs).forEach(([key, value]) => {
        formData.append(`spec_${key}`, value);
      });
      
      // Add dynamic fields to form data
      formData.append('product_fields', JSON.stringify(dynamicFieldValues));
      
      if (isEditing && product) {
        await updateProduct(product.product_id, formData);
      } else {
        await createProduct(formData);
      }
      
      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to save product');
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-medium text-gray-800">
          {isEditing ? 'Edit Product' : 'Create New Product'}
        </h2>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Information */}
          <div className="space-y-5">
            <h3 className="text-base font-medium text-gray-800 pb-2 border-b border-gray-100">Basic Information</h3>
            
            {/* Service Category */}
            <div className="space-y-1">
              <label htmlFor="service_category_id" className="block text-sm font-medium text-gray-700">
                Service Category <span className="text-red-500">*</span>
              </label>
              <select
                id="service_category_id"
                name="service_category_id"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                defaultValue={product?.service_category_id || ''}
                onChange={(e) => setSelectedCategory(e.target.value)}
                required
              >
                <option value="" disabled>Select a category</option>
                {categories.map((category) => (
                  <option key={category.service_category_id} value={category.service_category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Product Name */}
            <div className="space-y-1">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                defaultValue={product?.name || ''}
                onChange={handleNameChange}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            {/* Slug */}
            <div className="space-y-1">
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-grow px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    const nameInput = document.getElementById('name') as HTMLInputElement;
                    if (nameInput) {
                      setSlug(generateSlug(nameInput.value));
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Generate
                </button>
              </div>
            </div>
            
            {/* Price */}
            <div className="space-y-1">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price (£)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                defaultValue={product?.price || ''}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500">Leave empty for "Price on request"</p>
            </div>
            
            {/* Image URL */}
            <div className="space-y-1">
              <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
                Image URL
              </label>
              <input
                type="url"
                id="image_url"
                name="image_url"
                defaultValue={product?.image_url || ''}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Status Toggles */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_featured"
                  name="is_featured"
                  defaultChecked={product?.is_featured === true}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_featured" className="ml-2 block text-sm text-gray-700">
                  Featured Product
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  defaultChecked={product?.is_active !== false}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>
          </div>
          
          {/* Description and Specifications */}
          <div className="space-y-5">
            <h3 className="text-base font-medium text-gray-800 pb-2 border-b border-gray-100">Description and Specifications</h3>
            
            {/* Description */}
            <div className="space-y-1">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={product?.description || ''}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={6}
                required
              ></textarea>
            </div>
            
            {/* Specifications */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Specifications</h4>
              
              {/* Existing specifications */}
              {Object.keys(specs).length > 0 && (
                <div className="bg-gray-50 rounded-md border border-gray-200">
                  <ul className="divide-y divide-gray-200">
                    {Object.entries(specs).map(([key, value]) => (
                      <li key={key} className="py-2 px-2 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-gray-900">{key}:</span>{' '}
                          <span className="text-gray-600">{value}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSpec(key)}
                          className="text-gray-500 hover:text-red-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Add new specification */}
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-2">
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Specification name"
                      value={newSpecKey}
                      onChange={(e) => setNewSpecKey(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Value"
                      value={newSpecValue}
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={addSpec}
                      className="w-full h-full bg-blue-50 text-blue-600 px-3 py-2 rounded-md hover:bg-blue-100 transition-colors"
                      aria-label="Add specification"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Add specifications like power, size, capacity, etc. to help customers compare products
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Custom Fields */}
        {categoryFields.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-base font-medium text-gray-800 mb-4">Category Custom Fields</h3>
            
            {isFetchingFields ? (
              <div className="flex justify-center py-8">
                <div className="animate-pulse text-gray-400">Loading custom fields...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {categoryFields.map((field) => (
                  <div key={field.field_id} className={`space-y-1 ${field.field_type === 'repeater' || field.field_type === 'textarea' ? 'col-span-1 lg:col-span-2' : ''}`}>
                    <label htmlFor={`field-${field.key}`} className="block text-sm font-medium text-gray-700">
                      {field.name} {field.is_required && <span className="text-red-500">*</span>}
                    </label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}