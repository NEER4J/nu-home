'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct } from '@/lib/products-actions';
import { Product } from '@/types/product.types';
import { ServiceCategory } from '@/types/database.types';

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
  const [newSpecKey, setNewSpecKey] = useState<string>('');
  const [newSpecValue, setNewSpecValue] = useState<string>('');
  
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>
          
          {/* Service Category */}
          <div>
            <label htmlFor="service_category_id" className="block text-sm font-medium text-gray-700">
              Service Category <span className="text-red-500">*</span>
            </label>
            <select
              id="service_category_id"
              name="service_category_id"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={product?.name || ''}
              onChange={handleNameChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          
          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              Slug <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <input
                type="text"
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                className="ml-2 mt-1 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Generate
              </button>
            </div>
          </div>
          
          {/* Price */}
          <div>
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty for "Price on request"</p>
          </div>
          
          {/* Image URL */}
          <div>
            <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
              Image URL
            </label>
            <input
              type="url"
              id="image_url"
              name="image_url"
              defaultValue={product?.image_url || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {/* Status Toggles */}
          <div className="space-y-3">
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
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Description and Specifications</h3>
          
          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={product?.description || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={6}
              required
            ></textarea>
          </div>
          
          {/* Specifications */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Specifications</h3>
            
            {/* Existing specifications */}
            {Object.keys(specs).length > 0 && (
              <div className="mb-4 bg-gray-50 p-4 rounded-md">
                <ul className="space-y-2">
                  {Object.entries(specs).map(([key, value]) => (
                    <li key={key} className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSpec(key)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Add new specification */}
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Specification name"
                    value={newSpecKey}
                    onChange={(e) => setNewSpecKey(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Value"
                    value={newSpecValue}
                    onChange={(e) => setNewSpecValue(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={addSpec}
                    className="w-full bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700"
                  >
                    Add
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
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
        >
          {isLoading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}