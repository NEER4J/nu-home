"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ServiceCategory } from '@/types/database.types';

interface EditSubmissionFormProps {
  submission: any;
  categories: ServiceCategory[];
}

export default function EditSubmissionForm({ submission, categories }: EditSubmissionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      first_name: submission.first_name,
      last_name: submission.last_name,
      email: submission.email,
      phone: submission.phone || '',
      city: submission.city || '',
      postcode: submission.postcode,
      service_category_id: submission.service_category_id,
      status: submission.status,
      notes: submission.notes || ''
    }
  });
  
  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const supabase = await createClient();
      const { error } = await supabase
        .from('QuoteSubmissions')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone || null,
          city: data.city || null,
          postcode: data.postcode,
          service_category_id: data.service_category_id,
          status: data.status,
          notes: data.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('submission_id', submission.submission_id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Redirect back to view page
      router.push(`/admin/quote-submissions/${submission.submission_id}`);
      router.refresh();
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the submission');
      console.error('Error updating submission:', err);
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
      
      <div className="space-y-8 divide-y divide-gray-200">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Contact Information</h3>
            <p className="mt-1 text-sm text-gray-500">
              Update the customer's contact details.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="first_name"
                  {...register('first_name', { required: 'First name is required' })}
                  className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              {errors.first_name && (
                <p className="mt-2 text-sm text-red-600">{errors.first_name.message as string}</p>
              )}
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="last_name"
                  {...register('last_name', { required: 'Last name is required' })}
                  className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              {errors.last_name && (
                <p className="mt-2 text-sm text-red-600">{errors.last_name.message as string}</p>
              )}
            </div>
            
            <div className="sm:col-span-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  id="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email.message as string}</p>
              )}
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  type="tel"
                  id="phone"
                  {...register('phone')}
                  className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="city"
                  {...register('city')}
                  className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="postcode" className="block text-sm font-medium text-gray-700">
                Postcode
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="postcode"
                  {...register('postcode', { required: 'Postcode is required' })}
                  className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              {errors.postcode && (
                <p className="mt-2 text-sm text-red-600">{errors.postcode.message as string}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Submission Details</h3>
            <p className="mt-1 text-sm text-gray-500">
              Update service category and status.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="service_category_id" className="block text-sm font-medium text-gray-700">
                Service Category
              </label>
              <div className="mt-1">
                <select
                  id="service_category_id"
                  {...register('service_category_id', { required: 'Service category is required' })}
                  className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  {categories.map((category) => (
                    <option key={category.service_category_id} value={category.service_category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.service_category_id && (
                <p className="mt-2 text-sm text-red-600">{errors.service_category_id.message as string}</p>
              )}
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <div className="mt-1">
                <select
                  id="status"
                  {...register('status', { required: 'Status is required' })}
                  className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="new">New</option>
                  <option value="processed">Processed</option>
                  <option value="qualified">Qualified</option>
                  <option value="disqualified">Disqualified</option>
                </select>
              </div>
              {errors.status && (
                <p className="mt-2 text-sm text-red-600">{errors.status.message as string}</p>
              )}
            </div>
            
            <div className="sm:col-span-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <div className="mt-1">
                <textarea
                  id="notes"
                  rows={4}
                  {...register('notes')}
                  className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Add admin notes about this submission"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push(`/admin/quote-submissions/${submission.submission_id}`)}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md -sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent -sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}