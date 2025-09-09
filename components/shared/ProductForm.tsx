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
import { Loader2, PlusCircle, X, Upload, Save, AlertTriangle, Settings } from 'lucide-react';
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
  const [categoryFields, setCategoryFields] = useState<CategoryField[]>([]);
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, any>>(
    product?.product_fields || {}
  );
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
        const response = await fetch(`/api/category-fields/simplified?categoryId=${selectedCategory}`);
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
              } else if (field.field_type === 'group') {
                // Initialize group with nested structure
                const groupData: Record<string, any> = {};
                if (field.field_structure?.children) {
                  field.field_structure.children.forEach(child => {
                    if (child.field_type === 'repeater') {
                      groupData[child.key] = [];
                    } else {
                      groupData[child.key] = '';
                    }
                  });
                }
                initialValues[field.key] = groupData;
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
  
  // Render a nested child field
  const renderChildField = (child: any, parentKey: string, childIndex?: number) => {
    const fieldKey = childIndex !== undefined ? `${parentKey}.${childIndex}.${child.key}` : `${parentKey}.${child.key}`;
    const value = childIndex !== undefined 
      ? dynamicFieldValues[parentKey]?.[childIndex]?.[child.key]
      : dynamicFieldValues[parentKey]?.[child.key];

    const handleChange = (newValue: any) => {
      if (childIndex !== undefined) {
        // Repeater child field
        const parentArray = dynamicFieldValues[parentKey] || [];
        const updatedArray = [...parentArray];
        if (!updatedArray[childIndex]) updatedArray[childIndex] = {};
        updatedArray[childIndex][child.key] = newValue;
        handleFieldChange(parentKey, updatedArray);
      } else {
        // Group child field
        const groupData = dynamicFieldValues[parentKey] || {};
        handleFieldChange(parentKey, { ...groupData, [child.key]: newValue });
      }
    };

    return renderFieldInput(child, fieldKey, value, handleChange);
  };

  // Render a nested child field within a group that's inside a repeater
  const renderNestedChildField = (nestedChild: any, repeaterKey: string, repeaterIndex: number, groupKey: string) => {
    const fieldKey = `${repeaterKey}.${repeaterIndex}.${groupKey}.${nestedChild.key}`;
    const value = dynamicFieldValues[repeaterKey]?.[repeaterIndex]?.[groupKey]?.[nestedChild.key];

    const handleChange = (newValue: any) => {
      const repeaterArray = dynamicFieldValues[repeaterKey] || [];
      const updatedArray = [...repeaterArray];
      if (!updatedArray[repeaterIndex]) updatedArray[repeaterIndex] = {};
      if (!updatedArray[repeaterIndex][groupKey]) updatedArray[repeaterIndex][groupKey] = {};
      updatedArray[repeaterIndex][groupKey][nestedChild.key] = newValue;
      handleFieldChange(repeaterKey, updatedArray);
    };

    return renderFieldInput(nestedChild, fieldKey, value, handleChange);
  };

  // Render the actual input element
  const renderFieldInput = (field: any, fieldKey: string, value: any, onChange: (value: any) => void) => {
    const baseInputClasses = "w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
    
    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            id={`field-${fieldKey}`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClasses}
            required={field.is_required}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            id={`field-${fieldKey}`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={baseInputClasses}
            required={field.is_required}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            id={`field-${fieldKey}`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClasses}
            required={field.is_required}
          />
        );
      
      case 'select':
        let optionsArray: string[] = [];
        
        if (field.options) {
          if (typeof field.options === 'string') {
            optionsArray = field.options.split(',').map((opt: string) => opt.trim());
          } else if (Array.isArray(field.options)) {
            optionsArray = field.options;
          } else if (field.options.values && Array.isArray(field.options.values)) {
            optionsArray = field.options.values;
          } else if (field.options.options && Array.isArray(field.options.options)) {
            optionsArray = field.options.options;
          }
        }
        
        if (field.is_multi) {
          const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
          
          return (
            <div className="space-y-2">
              <div className="bg-gray-50 p-3 rounded-md border border-gray-300 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {optionsArray.map((option: string) => {
                    const isSelected = selectedValues.includes(option);
                    
                    return (
                      <label key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`field-${fieldKey}-${option}`}
                          checked={isSelected}
                          onChange={() => {
                            let newSelectedValues;
                            if (isSelected) {
                              newSelectedValues = selectedValues.filter(val => val !== option);
                            } else {
                              newSelectedValues = [...selectedValues, option];
                            }
                            onChange(newSelectedValues);
                          }}
                          className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-xs text-gray-700 cursor-pointer">
                          {option}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <select
              id={`field-${fieldKey}`}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className={baseInputClasses}
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
          <label className="flex items-center">
            <input
              type="checkbox"
              id={`field-${fieldKey}`}
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Yes, enable this option
            </span>
          </label>
        );
      
      case 'date':
        return (
          <input
            type="date"
            id={`field-${fieldKey}`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClasses}
            required={field.is_required}
          />
        );
      
      case 'image':
        // Helper function to validate URL
        const isValidUrl = (urlString: string) => {
          try {
            const url = new URL(urlString);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        };

        return (
          <div className="flex items-center space-x-3">
            {/* Image Preview - Square shape to the left */}
            <div className="flex-shrink-0">
              {value && isValidUrl(value) ? (
                <div className="relative w-12 h-12 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                  <Image
                    src={value}
                    alt={field.name}
                    fill
                    className="object-contain"
                    onError={() => {
                      // Handle broken images gracefully
                      console.log('Image failed to load:', value);
                    }}
                  />
                </div>
              ) : value && !isValidUrl(value) ? (
                <div className="w-12 h-12 bg-red-50 rounded-md border-2 border-dashed border-red-300 flex items-center justify-center">
                  <span className="text-xs text-red-500">!</span>
                </div>
              ) : (
                <div className="w-12 h-12 bg-gray-50 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <span className="text-xs text-gray-400">?</span>
                </div>
              )}
            </div>
            
            {/* Input Field */}
            <div className="flex-1">
              <input
                type="url"
                id={`field-${fieldKey}`}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className={baseInputClasses}
                required={field.is_required}
              />
            </div>
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            id={`field-${fieldKey}`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClasses}
            required={field.is_required}
          />
        );
    }
  };

  // Render a field based on its type and structure
  const renderField = (field: CategoryField) => {
    const value = dynamicFieldValues[field.key];
    
    switch (field.field_type) {
      case 'group':
        return (
          <div className="space-y-3 p-3 bg-gray-50 rounded-md border border-gray-200">
            <h4 className="font-medium text-gray-800 text-sm border-b border-gray-300 pb-1">
              {field.name}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {field.field_structure?.children?.map((child, childIndex) => (
                <div key={child.key}>
                  <label htmlFor={`field-${field.key}.${child.key}`} className="block text-xs font-medium text-gray-600 mb-1">
                    {child.name} {child.is_required && <span className="text-red-500">*</span>}
                  </label>
                  {renderChildField(child, field.key)}
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'repeater':
        const repeaterValue = Array.isArray(value) ? value : [];
        
        return (
          <div className="space-y-4">
            {/* Headers - Show only once */}
            {repeaterValue.length > 0 && field.field_structure?.children && (
              <div className="grid grid-cols-8 gap-2 px-3 py-2 bg-gray-100 rounded-md text-xs font-medium text-gray-600">
                <div className="col-span-1">#</div>
                {field.field_structure.children.every(child => child.field_type !== 'group') ? (
                  // Simple fields header
                  field.field_structure.children.map((child) => (
                    <div key={child.key} className={
                      child.field_type === 'image' ? 'col-span-3' :
                      child.field_type === 'textarea' ? 'col-span-3' : 'col-span-2'
                    }>
                      {child.name} {child.is_required && <span className="text-red-500">*</span>}
                    </div>
                  ))
                ) : (
                  // Complex fields with groups
                  field.field_structure.children.map((child) => {
                    if (child.field_type === 'group' && child.children) {
                      return child.children.map((nestedChild) => (
                        <div key={nestedChild.key} className={
                          nestedChild.field_type === 'image' ? 'col-span-3' :
                          nestedChild.field_type === 'textarea' ? 'col-span-3' : 'col-span-2'
                        }>
                          {nestedChild.name} {nestedChild.is_required && <span className="text-red-500">*</span>}
                        </div>
                      ));
                    } else {
                      return (
                        <div key={child.key} className={
                          child.field_type === 'image' ? 'col-span-3' :
                          child.field_type === 'textarea' ? 'col-span-3' : 'col-span-2'
                        }>
                          {child.name} {child.is_required && <span className="text-red-500">*</span>}
                        </div>
                      );
                    }
                  })
                )}
                <div className="col-span-1">Action</div>
              </div>
            )}

            {/* Repeater Items */}
            {repeaterValue.map((item: any, index: number) => (
              <div key={index} className="grid grid-cols-8 gap-2 p-3 bg-white rounded-md border border-gray-200 items-start justify-center">
                <div className="col-span-1 flex items-center">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>
                
                {field.field_structure?.children ? (
                  <>
                    {/* Check if all children are regular fields (not groups) for grid layout */}
                    {field.field_structure.children.every(child => child.field_type !== 'group') ? (
                      field.field_structure.children.map((child) => (
                        <div key={child.key} className={
                          child.field_type === 'image' ? 'col-span-3' :
                          child.field_type === 'textarea' ? 'col-span-3' : 'col-span-2'
                        }>
                          {renderChildField(child, field.key, index)}
                        </div>
                      ))
                    ) : (
                      // Mixed content with groups
                      field.field_structure.children.map((child) => {
                        if (child.field_type === 'group' && child.children) {
                          return child.children.map((nestedChild) => (
                            <div key={nestedChild.key} className={
                              nestedChild.field_type === 'image' ? 'col-span-3' :
                              nestedChild.field_type === 'textarea' ? 'col-span-3' : 'col-span-2'
                            }>
                              {renderNestedChildField(nestedChild, field.key, index, child.key)}
                            </div>
                          ));
                        } else {
                          return (
                            <div key={child.key} className={
                              child.field_type === 'image' ? 'col-span-3' :
                              child.field_type === 'textarea' ? 'col-span-3' : 'col-span-2'
                            }>
                              {renderChildField(child, field.key, index)}
                            </div>
                          );
                        }
                      })
                    )}
                  </>
                ) : (
                  // Fallback for old-style simple repeater
                  <div className="col-span-10">
                    <input
                      type="text"
                      value={typeof item === 'string' ? item : ''}
                      onChange={(e) => handleUpdateRepeaterItem(field.key, index, e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Item ${index + 1}`}
                    />
                  </div>
                )}
                
                <div className="col-span-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveRepeaterItem(field.key, index)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={() => {
                if (field.field_structure?.children) {
                  // Add structured repeater item with proper nesting
                  const newItem: Record<string, any> = {};
                  field.field_structure.children.forEach(child => {
                    if (child.field_type === 'group' && child.children) {
                      // Initialize nested group
                      const groupData: Record<string, any> = {};
                      child.children.forEach(nestedChild => {
                        groupData[nestedChild.key] = '';
                      });
                      newItem[child.key] = groupData;
                    } else if (child.field_type === 'repeater') {
                      newItem[child.key] = [];
                    } else {
                      newItem[child.key] = '';
                    }
                  });
                  handleFieldChange(field.key, [...repeaterValue, newItem]);
                } else {
                  // Add simple repeater item
                  handleAddRepeaterItem(field.key);
                }
              }}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <PlusCircle className="h-3 w-3 mr-1" />
              Add {field.name}
            </button>
          </div>
        );
      
      default:
        // Regular field types
        return renderFieldInput(field, field.key, value, (newValue) => handleFieldChange(field.key, newValue));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      
      // Add dynamic fields to form data
      formData.append('product_fields', JSON.stringify(dynamicFieldValues));
      
      if (isPartner) {
        // Partner-specific form handling
        formData.append('categoryId', selectedCategory);
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
    <div className=" bg-gray-50">
      <form onSubmit={handleSubmit} className="flex">
        {/* Left Sidebar - Default Fields */}
        <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
            <p className="text-sm text-gray-600">Basic product information</p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Service Category */}
            <div>
              <label htmlFor="service_category_id" className="block text-sm font-medium text-gray-700 mb-2">
                Service Category <span className="text-red-500">*</span>
              </label>
              <select
                id="service_category_id"
                name="service_category_id"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

               {/* Main Image */}
               <div>
              <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-2">
                Main Image
              </label>
              <div className="space-y-3">
              {imagePreview && (
                  <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden">
                    <Image
                      src={imagePreview}
                      alt="Product preview"
                      fill
                      className="object-contain p-3"
                    />
                  </div>
                )}
                <input
                  type="url"
                  id="image_url"
                  name="image_url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImagePreview(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
                
              </div>
            </div>
            
            {/* Product Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                defaultValue={product?.name || ''}
                onChange={handleNameChange}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            {/* Slug */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Generate
                </button>
              </div>
            </div>
            
            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Price (£)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                defaultValue={product?.price || ''}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Leave empty for 'Price on request'"
              />
            </div>
            
         
            
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={product?.description || ''}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                required
              />
            </div>
            
            {/* Status Toggles */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              {!isPartner && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_featured"
                    name="is_featured"
                    defaultChecked={product?.is_featured === true}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Featured Product</span>
                </label>
              )}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  defaultChecked={product?.is_active !== false}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Panel - Custom Fields */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
              <p className="text-sm text-gray-600">Category-specific fields</p>
            </div>
          </div>
          
          <div className="p-6">
            {categoryFields.length > 0 ? (
              isFetchingFields ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-pulse text-gray-400 text-sm">Loading custom fields...</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {categoryFields.map((field) => (
                    <div key={field.field_id} className={`bg-white rounded-lg border border-gray-200 p-4 ${
                      field.field_type === 'repeater' ? 'lg:col-span-2 xl:col-span-3' : 
                      field.field_type === 'group' ? 'lg:col-span-2' : 
                      'lg:col-span-1'
                    }`}>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.name} {field.is_required && <span className="text-red-500">*</span>}
                        </label>
                      </div>
                      <div>
                        {renderField(field)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Settings className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No custom fields</h3>
                <p className="text-sm text-gray-500">This category doesn't have any custom fields configured.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" />
                Saving...
              </>
            ) : (
              isEditing ? 'Update Product' : 'Create Product'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 