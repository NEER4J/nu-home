'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { Loader2, PlusCircle, X, Upload, Save, AlertTriangle } from 'lucide-react';
import { SubmitButton } from '@/components/submit-button';
import { Product } from '@/types/product.types';
import React from 'react';

type Category = {
  id: string;
  name: string;
  service_category_id?: string; // For compatibility with admin component
};

type PartnerProductFormProps = {
  product?: Product;
  template?: Product | null;
  categories: Category[];
  isEditing?: boolean;
};

export default function PartnerProductForm({
  product,
  template,
  categories,
  isEditing = false
}: PartnerProductFormProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url || template?.image_url || null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || template?.image_url || null);
  const [slug, setSlug] = useState(product?.slug || '');
  const [categoryFields, setCategoryFields] = useState<any[]>([]);
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);
  
  // Initialize dynamic field values from product or template
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, any>>(() => {
    // Start with product fields if available, or template fields if not
    const initialValues = product?.product_fields || template?.product_fields || {};
    
    // Ensure all values are in the expected format
    const normalizedValues: Record<string, any> = {};
    
    // Return normalized values
    return initialValues;
  });
  
  const [selectedCategory, setSelectedCategory] = useState<string>(
    (template ? template.service_category_id : (categories.length > 0 ? categories[0].id || categories[0].service_category_id : '')) || ''
  );
  
  const [isFetchingFields, setIsFetchingFields] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      name: product?.name || (template ? `${template.name} (Custom)` : ''),
      description: product?.description || template?.description || '',
      price: product?.price || template?.price || '',
      is_active: product?.is_active ?? true,
    }
  });

  const watchedName = watch('name');
  
  // Check session validity on component mount
  useEffect(() => {
    async function checkSession() {
      try {
        // Simple test query to check if RLS allows access
        const { error } = await supabase
          .from('ServiceCategories')
          .select('name')
          .limit(1);
        
        if (error && (error.message.includes('auth') || error.message.includes('permission'))) {
          setIsSessionValid(false);
          setError('Your session appears to be invalid. Please refresh the page or log in again.');
        } else {
          setIsSessionValid(true);
        }
      } catch (e) {
        console.error('Error checking session:', e);
        setIsSessionValid(false);
      }
    }
    
    checkSession();
  }, []);
  
  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  };
  
  // Auto-generate slug when name changes (only for new products)
  useEffect(() => {
    if (!isEditing && watchedName) {
      setSlug(generateSlug(watchedName));
    }
  }, [watchedName, isEditing]);
  
  // Reference for dynamic field values to prevent dependency cycle
  const dynamicFieldValuesRef = React.useRef(dynamicFieldValues);
  useEffect(() => {
    dynamicFieldValuesRef.current = dynamicFieldValues;
  }, [dynamicFieldValues]);
  
  // Fetch category fields when category changes
  useEffect(() => {
    async function fetchCategoryFields() {
      if (!selectedCategory) return;
      
      setIsFetchingFields(true);
      try {
        // Get fields for this category
        const { data, error } = await supabase
          .from('CategoryFields')
          .select('*')
          .eq('service_category_id', selectedCategory)
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        
        console.log('Raw CategoryFields data:', data);
        
        // Transform data to match the format expected by renderField
        const transformedData = (data || []).map(field => {
          // Handle options parsing safely
          let parsedOptions = field.options;
          
          if (typeof field.options === 'string') {
            try {
              // Try to parse as JSON first
              parsedOptions = JSON.parse(field.options);
            } catch (e) {
              // If parsing fails, keep as string (it might be a comma-separated list)
              console.log(`Failed to parse options as JSON for field ${field.key}:`, e);
              parsedOptions = field.options;
            }
          }
          
          // If this is a select field but options isn't in the expected format,
          // try to normalize it
          if (field.field_type === 'select' && parsedOptions) {
            if (typeof parsedOptions === 'string') {
              // It's a string, assume comma-separated
              parsedOptions = parsedOptions.split(',').map((opt: string) => opt.trim());
            } else if (!Array.isArray(parsedOptions) && !parsedOptions.values) {
              // If it's an object but not in the {values: [...]} format,
              // try to convert it to an array of strings
              try {
                parsedOptions = Object.values(parsedOptions).map(String);
              } catch (e) {
                console.log(`Failed to normalize options for field ${field.key}:`, e);
              }
            }
          }
          
          return {
            ...field,
            // Ensure name property exists (some may only have label)
            name: field.name || field.label || field.key,
            // Use safely parsed options
            options: parsedOptions
          };
        });
        
        console.log('Transformed CategoryFields data:', transformedData);
        setCategoryFields(transformedData || []);
        
        // Initialize any missing field values
        const initialValues: Record<string, any> = {};
        transformedData.forEach((field: any) => {
          // Use the ref value to check current values
          const currentValues = dynamicFieldValuesRef.current;
          if (!(field.key in currentValues)) {
            if (field.field_type === 'repeater') {
              initialValues[field.key] = [];
            } else if (field.field_type === 'checkbox') {
              initialValues[field.key] = false;
            } else if (field.field_type === 'select') {
              initialValues[field.key] = field.is_multi ? [] : '';
            } else {
              initialValues[field.key] = '';
            }
          }
        });
        
        if (Object.keys(initialValues).length > 0) {
          console.log('Initializing field values:', initialValues);
          setDynamicFieldValues(prev => ({
            ...prev,
            ...initialValues
          }));
        }
      } catch (error: any) {
        console.error('Error fetching category fields:', error.message);
        setError('Failed to load category fields. Please try again.');
      } finally {
        setIsFetchingFields(false);
      }
    }
    
    fetchCategoryFields();
    // Only run when category changes
  }, [selectedCategory]);
  
  // Handle dynamic field changes
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
  
  // Handle form submission
  const onSubmit = async (formData: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First get the current user's ID
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      if (authError || !authData.session) {
        console.error("Authentication error:", authError);
        setError("Authentication error: Your session may have expired. Please refresh the page and try again.");
        setIsSessionValid(false);
        return;
      }
      
      const user = authData.session.user;
      
      if (!user) {
        throw new Error('Authentication error: You need to be logged in to create a product.');
      }
      
      // Create partner product data matching the schema of PartnerProducts table
      const partnerProductData = {
        name: formData.name,
        slug: slug,
        description: formData.description,
        price: parseFloat(formData.price) || null,
        service_category_id: selectedCategory,
        product_fields: dynamicFieldValues,
        image_url: imageUrl,
        is_active: !!formData.is_active,
        partner_id: user.id, // Important: Set this for RLS policies to work
        base_product_id: template?.product_id || null // Link to original product if this is from a template
      };
      
      // Check if partner has access to this category
      const { data: categoryAccess, error: categoryError } = await supabase
        .from("UserCategoryAccess")
        .select("*")
        .eq("user_id", user.id)
        .eq("service_category_id", selectedCategory)
        .eq("status", "approved")
        .single();
      
      if (categoryError && !categoryError.message.includes("No rows found")) {
        console.error("Error checking category access:", categoryError);
      }
      
      if (!categoryAccess) {
        throw new Error('You don\'t have access to this category. Please request access first.');
      }
      
      if (isEditing && product) {
        // Update existing partner product
        const { error: updateError } = await supabase
          .from('PartnerProducts')
          .update(partnerProductData)
          .eq('partner_product_id', product.product_id); // Note: product_id here is actually partner_product_id
        
        if (updateError) {
          if (updateError.message.includes('auth') || 
              updateError.message.includes('permission') || 
              updateError.message.includes('policy') ||
              updateError.message.includes('login') ||
              updateError.message.includes('row level security')) {
            throw new Error('Session error: You need to be logged in to update this product. Please refresh the page and try again.');
          }
          
          // Show more detailed error
          console.error('Update error details:', updateError);
          throw new Error(`Error updating product: ${updateError.message}`);
        }
      } else {
        // Create new partner product
        const { error: insertError } = await supabase
          .from('PartnerProducts')
          .insert(partnerProductData);
        
        if (insertError) {
          // Check if it's an auth error
          if (insertError.message.includes('auth') || 
              insertError.message.includes('permission') || 
              insertError.message.includes('policy') ||
              insertError.message.includes('login') ||
              insertError.message.includes('row level security')) {
            throw new Error('Session error: You need to be logged in to create a product. Please refresh the page and try again.');
          }
          
          // Check for duplicate slug
          if (insertError.message.includes('duplicate key') && insertError.message.includes('slug')) {
            throw new Error('A product with this slug already exists. Please modify the slug and try again.');
          }
          
          // Show more detailed error
          console.error('Insert error details:', insertError);
          throw new Error(`Error creating product: ${insertError.message}`);
        }
      }
      
      // Redirect to products page after successful creation/update
      router.push('/partner/my-products');
      router.refresh();
      
    } catch (error: any) {
      console.error('Error saving product:', error);
      setError(`${error.message}`);
      
      // If it's a session error, update the session validity state
      if (error.message.includes('session') || 
          error.message.includes('logged in') || 
          error.message.includes('authentication')) {
        setIsSessionValid(false);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render dynamic fields based on their type
  const renderField = (field: any) => {
    const value = dynamicFieldValues[field.key];
    
    switch (field.field_type) {
      case 'text':
        // If key is 'brand_logo' or contains 'image', treat as simple URL field
        if (field.key === 'brand_logo' || field.key.includes('image')) {
          return (
            <input
              type="url"
              id={`field-${field.key}`}
              value={value || ''}
              onChange={e => handleFieldChange(field.key, e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.is_required}
            />
          );
        }
        
        return (
          <input
            type="text"
            id={`field-${field.key}`}
            value={value || ''}
            onChange={e => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            id={`field-${field.key}`}
            value={value || ''}
            onChange={e => handleFieldChange(field.key, e.target.value)}
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
            onChange={e => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`field-${field.key}`}
              checked={!!value}
              onChange={e => handleFieldChange(field.key, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`field-${field.key}`} className="ml-2 text-sm text-gray-700">
              {field.name}
            </label>
          </div>
        );
      
      case 'select':
        // Convert all select fields to use checkboxes instead
        let options: string[] = [];
        
        if (field.options) {
          if (typeof field.options === 'string') {
            options = field.options.split(',').map((opt: string) => opt.trim());
          } else if (Array.isArray(field.options)) {
            options = field.options;
          } else if (field.options.values && Array.isArray(field.options.values)) {
            options = field.options.values;
          } else {
            try {
              const optString = JSON.stringify(field.options);
              options = optString.replace(/[{}"[\]]/g, '').split(',').map((s: string) => s.trim());
            } catch (e) {
              console.error('Error parsing options:', e);
              options = [];
            }
          }
        }
        
        // Convert value to array for consistency
        const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
        
        return (
          <div className="space-y-2">
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
              {options.length > 0 ? (
                options.map((option: string) => {
                  const isSelected = selectedValues.includes(option);
                  
                  return (
                    <div key={option} className="flex items-center mb-2 last:mb-0">
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
                })
              ) : (
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
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'date':
        return (
          <input
            type="date"
            id={`field-${field.key}`}
            value={value || ''}
            onChange={e => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );
      
      case 'repeater':
        const items = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {items.map((item: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={item}
                  onChange={e => handleUpdateRepeaterItem(field.key, index, e.target.value)}
                  className="flex-grow px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRepeaterItem(field.key, index)}
                  className="p-2 text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleAddRepeaterItem(field.key)}
              className="inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
            >
              <PlusCircle className="mr-1 h-3 w-3" />
              Add Item
            </button>
          </div>
        );
      
      default:
        return <p>Unsupported field type: {field.field_type}</p>;
    }
  };
  
  if (categories.length === 0) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              You need to request category access before you can add products.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              {error.includes('logged in') && (
                <p className="text-sm text-red-700 mt-2">
                  Your session may have expired. Please try refreshing the page or logging out and back in.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-base font-medium text-gray-900">Basic Information</h3>
        
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Product Name
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="name"
                {...register('name', { required: 'Product name is required' })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>
          
          <div className="sm:col-span-2">
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              Slug
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          
          <div className="sm:col-span-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <div className="mt-1">
              <textarea
                id="description"
                {...register('description', { required: 'Description is required' })}
                rows={4}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>
          </div>
          
          <div className="sm:col-span-3">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <div className="mt-1">
              <select
                id="category"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {categories.map(category => (
                  <option key={category.id || category.service_category_id} value={category.id || category.service_category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="sm:col-span-3">
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Price (£)
            </label>
            <div className="mt-1">
              <input
                type="number"
                id="price"
                step="0.01"
                min="0"
                {...register('price')}
                placeholder="Enter price (optional)"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="sm:col-span-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="is_active"
                  type="checkbox"
                  {...register('is_active')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_active" className="font-medium text-gray-700">
                  Active
                </label>
                <p className="text-gray-500">Make this product visible to customers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Product Image */}
      <div className="space-y-4">
        <h3 className="text-base font-medium text-gray-900">Product Image</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="product-image-url" className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              id="product-image-url"
              value={imageUrl || ''}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImagePreview(e.target.value);
              }}
              placeholder="https://example.com/image.jpg"
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
      
      {/* Dynamic Fields */}
      {isFetchingFields ? (
        <div className="py-4 flex justify-center">
          <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
        </div>
      ) : categoryFields.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900">Category Fields</h3>
          <div className="space-y-6">
            {categoryFields.map(field => (
              <div key={field.field_id} className="bg-white border border-gray-100 rounded-md p-4">
                {field.field_type !== 'checkbox' ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor={`field-${field.key}`} className="block text-sm font-medium text-gray-700">
                        {field.name || field.label || field.key} {field.is_required && <span className="text-red-500">*</span>}
                      </label>
                      {field.help_text && (
                        <span className="text-xs text-gray-500">{field.help_text}</span>
                      )}
                    </div>
                    <div className="mt-1">
                      {renderField(field)}
                    </div>
                  </>
                ) : (
                  <div className="mt-1">
                    {renderField(field)}
                  </div>
                )}
                {field.help_text && field.field_type !== 'checkbox' && (
                  <p className="text-xs text-gray-500 mt-1">{field.help_text}</p>
                )}
                
                {field.field_type === 'select' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Select all options that apply
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-gray-500 text-sm">No custom fields available for this category.</p>
        </div>
      )}
      
      {/* Submit */}
      <div className="pt-4 flex justify-end">
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
        <SubmitButton className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
          <Save className="mr-2 h-4 w-4" />
          {isEditing ? 'Update Product' : 'Create Product'}
        </SubmitButton>
      </div>
    </form>
  );
} 