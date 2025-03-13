"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/utils/supabase/client';

// Define validation schema
const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  icon_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  is_active: z.boolean().optional(),
  show_thank_you: z.boolean().optional(),
  redirect_to_products: z.boolean().optional()
});

type FormValues = z.infer<typeof categorySchema>;

export default function NewCategoryForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<FormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      icon_url: '',
      is_active: true,
      show_thank_you: true,
      redirect_to_products: false
    }
  });
  
  const redirectToProducts = watch('redirect_to_products');
  
  // Auto-generate slug from name
  const name = watch('name');
  const autoGenerateSlug = () => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')       // Replace spaces with hyphens
      .replace(/[^\w\-]+/g, '')   // Remove non-word chars
      .replace(/\-\-+/g, '-')     // Replace multiple hyphens with a single hyphen
      .replace(/^-+/, '')         // Trim hyphens from start
      .replace(/-+$/, '');        // Trim hyphens from end
  };
  
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const supabase = await createClient();
      const { error } = await supabase
        .from('ServiceCategories')
        .insert({
          name: data.name,
          slug: data.slug || autoGenerateSlug(),
          description: data.description || null,
          icon_url: data.icon_url || null,
          is_active: data.is_active,
          show_thank_you: data.show_thank_you,
          redirect_to_products: data.redirect_to_products
        });
      
      if (error) {
        // Check for unique constraint error
        if (error.code === '23505') {
          throw new Error('A category with this slug already exists. Please use a different slug.');
        }
        throw new Error(error.message);
      }
      
      router.push('/admin/service-categories');
      router.refresh();
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the category');
      console.error('Error creating category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Category Name *
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="name"
            {...register('name')}
            onChange={(e) => {
              register('name').onChange(e);
              // Auto-fill slug if user hasn't manually entered one
              if (!watch('slug')) {
                register('slug').onChange({
                  target: { 
                    value: autoGenerateSlug(),
                    name: 'slug'
                  }
                });
              }
            }}
            className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
        </div>
        {errors.name && (
          <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
          URL Slug *
        </label>
        <div className="mt-1">
          <div className="flex rounded-md -sm">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
              /services/
            </span>
            <input
              type="text"
              id="slug"
              {...register('slug')}
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
            />
          </div>
        </div>
        {errors.slug && (
          <p className="mt-2 text-sm text-red-600">{errors.slug.message}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          This will be used in the URL: /services/your-slug
        </p>
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <div className="mt-1">
          <textarea
            id="description"
            rows={3}
            {...register('description')}
            className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Brief description of the service category.
        </p>
      </div>
      
      <div>
        <label htmlFor="icon_url" className="block text-sm font-medium text-gray-700">
          Icon URL
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="icon_url"
            {...register('icon_url')}
            className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
        </div>
        {errors.icon_url && (
          <p className="mt-2 text-sm text-red-600">{errors.icon_url.message}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          URL to an icon image for this category.
        </p>
      </div>
      
      {/* Form Submission Behavior Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900">Form Submission Behavior</h3>
        <p className="mt-1 text-sm text-gray-500">
          Control what happens after a user submits a quote form for this category.
        </p>
        
        <div className="mt-4 space-y-4">
          <div className="relative flex items-start">
            <div className="flex items-center h-5">
              <input
                id="show_thank_you"
                type="checkbox"
                {...register('show_thank_you')}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="show_thank_you" className="font-medium text-gray-700">Show thank you message</label>
              <p className="text-gray-500">When enabled, users will see a thank you message after submitting the form.</p>
            </div>
          </div>
          
          <div className="relative flex items-start">
            <div className="flex items-center h-5">
              <input
                id="redirect_to_products"
                type="checkbox"
                {...register('redirect_to_products')}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="redirect_to_products" className="font-medium text-gray-700">Redirect to products page</label>
              <p className="text-gray-500">
                {redirectToProducts
                  ? "Users will be redirected to the products page after form submission."
                  : "Users will stay on the thank you page after form submission."}
              </p>
            </div>
          </div>
        </div>
        
        {watch('show_thank_you') === false && watch('redirect_to_products') === false && (
          <div className="mt-4 rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Both options are disabled. Users will see a simple success message after form submission.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="relative flex items-start">
        <div className="flex items-center h-5">
          <input
            id="is_active"
            type="checkbox"
            {...register('is_active')}
            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="is_active" className="font-medium text-gray-700">Active</label>
          <p className="text-gray-500">When active, this category will be visible on the site.</p>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.push('/admin/service-categories')}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md -sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent -sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Category'}
        </button>
      </div>
    </form>
  );
}