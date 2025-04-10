'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct } from '@/lib/products-actions';
import { createPartnerProduct, updatePartnerProduct } from '@/app/partner/actions';
import { Product } from '@/types/product.types';
import { ServiceCategory } from '@/types/database.types';
import { CategoryField } from '@/types/product.types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { Loader2, PlusCircle, X, Upload, Save, AlertTriangle } from 'lucide-react';
import { SubmitButton } from '@/components/submit-button';

type ProductFormProps = {
  product?: Product;
  categories: ServiceCategory[];
  isEditing?: boolean;
  isPartner?: boolean;
  template?: Product | null;
  onSuccess?: () => void;
};

export function ProductForm({ 
  product, 
  categories, 
  isEditing = false,
  isPartner = false,
  template,
  onSuccess
}: ProductFormProps) {
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
  const [imageUrl, setImageUrl] = useState<string>(product?.image_url || '');
  const [imagePreview, setImagePreview] = useState<string>(product?.image_url || '');
  const [isSessionValid, setIsSessionValid] = useState<boolean>(true);
  
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

  // Check session validity
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClientComponentClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsSessionValid(!!session);
    };
    checkSession();
  }, []);
  
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
      const currentValues = Array.isArray(prev[key]) ? [...prev[key]] : [];
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
      const currentValues = Array.isArray(prev[key]) ? [...prev[key]] : [];
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
                {field.options?.values ? field.options.values.map((option: string) => {
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
                }) : null}
              </div>
            </div>
          );
        } else {
          // Handle all possible option formats (string, array, or object with values)
          let optionsArray: string[] = [];
          
          if (field.options) {
            if (typeof field.options === 'string') {
              // Handle comma-separated string
              optionsArray = field.options.split(',').map((opt: string) => opt.trim());
            } else if (Array.isArray(field.options)) {
              // Handle array
              optionsArray = field.options;
            } else if (field.options.values && Array.isArray(field.options.values)) {
              // Handle object with values array
              optionsArray = field.options.values;
            }
          }
          
          return (
            <select
              id={`field-${field.key}`}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.is_required}
            >
              <option value="">Select an option</option>
              {optionsArray.map((option: string) => (
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
        return (
          <div className="space-y-2">
            {Array.isArray(value) ? value.map((item: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleUpdateRepeaterItem(field.key, index, e.target.value)}
                  className="flex-grow px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Item ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRepeaterItem(field.key, index)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )) : null}
            <button
              type="button"
              onClick={() => handleAddRepeaterItem(field.key)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Item
            </button>
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
      
      if (isPartner) {
        // Partner-specific form handling
        formData.append('categoryId', selectedCategory);
        formData.append('specifications', JSON.stringify(specs));
        formData.append('imageUrl', imageUrl);
        formData.append('isActive', formData.get('is_active') === 'on' ? 'true' : 'false');
        
        if (template) {
          formData.append('fromTemplateId', template.product_id);
        }
        
        if (isEditing && product) {
          formData.append('productId', product.product_id);
          await updatePartnerProduct(formData);
        } else {
          await createPartnerProduct(formData);
        }
        
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/partner/my-products');
          router.refresh();
        }
      } else {
        // Admin form handling
        if (isEditing && product) {
          await updateProduct(product.product_id, formData);
        } else {
          await createProduct(formData);
        }
        
        router.push('/admin/products');
        router.refresh();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to save product');
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button 
              type="button"
              className="border-b-2 border-blue-500 py-4 px-4 text-sm font-medium text-blue-600"
            >
              Basic Information
            </button>
            <button 
              type="button"
              className="border-b-2 border-transparent py-4 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Description and Specifications
            </button>
          </nav>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-8">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input
                    type="url"
                    id="image_url"
                    name="image_url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-center items-center">
                  <div className="w-32 h-32 bg-gray-100 rounded-md overflow-hidden relative">
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Product"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-100">
                        <p className="text-sm text-gray-500">No image</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Toggles */}
            <div className="space-y-3 pt-2">
              {!isPartner && (
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
              )}
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Specifications</h4>
                <button
                  type="button"
                  onClick={addSpec}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Specification
                </button>
              </div>
              
              {/* Existing Specifications */}
              <div className="space-y-2">
                {Object.entries(specs).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => {
                        const newSpecs = { ...specs };
                        delete newSpecs[key];
                        newSpecs[e.target.value] = value;
                        setSpecs(newSpecs);
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Specification name"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => {
                        setSpecs(prev => ({
                          ...prev,
                          [key]: e.target.value
                        }));
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Specification value"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpec(key)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* New Specification Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSpecKey}
                  onChange={(e) => setNewSpecKey(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Specification name"
                />
                <input
                  type="text"
                  value={newSpecValue}
                  onChange={(e) => setNewSpecValue(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Specification value"
                />
                <button
                  type="button"
                  onClick={addSpec}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Add
                </button>
              </div>
              
              <p className="text-xs text-gray-500">
                Add specifications like power, size, capacity, etc. to help customers compare products
              </p>
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
                  <div key={field.field_id} className={`space-y-2 ${field.field_type === 'repeater' || field.field_type === 'textarea' ? 'col-span-1 lg:col-span-2' : ''}`}>
                    <div className="flex justify-between items-center">
                      <label htmlFor={`field-${field.key}`} className="block text-sm font-medium text-gray-700">
                        {field.name} {field.is_required && <span className="text-red-500">*</span>}
                      </label>
                      {field.help_text && (
                        <span className="text-xs text-gray-500">{field.help_text}</span>
                      )}
                    </div>
                    <div className="mt-1">
                      {renderField(field)}
                    </div>
                    {field.help_text && <p className="text-xs text-gray-500">{field.help_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
        {isSessionValid === false && (
          <div className="mr-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 flex-1">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Your session may have expired. Please refresh the page before saving.
                </p>
              </div>
            </div>
          </div>
        )}
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
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            isEditing ? 'Update Product' : 'Create Product'
          )}
        </button>
      </div>
    </form>
  );
} 