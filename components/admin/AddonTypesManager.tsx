"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface AddonType {
  id: string;
  name: string;
  allow_multiple_selection?: boolean;
}

interface AddonTypesManagerProps {
  categoryId: string;
}

export default function AddonTypesManager({ categoryId }: AddonTypesManagerProps) {
  const [addonTypes, setAddonTypes] = useState<AddonType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch existing addon types
  useEffect(() => {
    async function fetchAddonTypes() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('ServiceCategories')
          .select('addon_types')
          .eq('service_category_id', categoryId)
          .single();

        if (error) throw error;

        // Convert JSONB array to AddonType[] format
        let typesArray: AddonType[] = [];
        if (data.addon_types && Array.isArray(data.addon_types)) {
          typesArray = data.addon_types.map((type: any, index: number) => ({
            id: type.id || `type-${index}`,
            name: type.name || type,
            allow_multiple_selection: type.allow_multiple_selection || false
          }));
        }

        setAddonTypes(typesArray);
      } catch (err: any) {
        console.error('Error fetching addon types:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAddonTypes();
  }, [categoryId]);

  // Add a new empty addon type
  const addAddonType = () => {
    setAddonTypes([...addonTypes, { 
      id: `type-${Date.now()}`, 
      name: '',
      allow_multiple_selection: false 
    }]);
  };

  // Remove an addon type
  const removeAddonType = (index: number) => {
    const updatedTypes = [...addonTypes];
    updatedTypes.splice(index, 1);
    setAddonTypes(updatedTypes);
  };

  // Update an addon type name
  const updateAddonTypeName = (index: number, name: string) => {
    const updatedTypes = [...addonTypes];
    updatedTypes[index].name = name;
    setAddonTypes(updatedTypes);
  };

  // Update an addon type's allow_multiple_selection setting
  const updateAddonTypeMultipleSelection = (index: number, allow: boolean) => {
    const updatedTypes = [...addonTypes];
    updatedTypes[index].allow_multiple_selection = allow;
    setAddonTypes(updatedTypes);
  };

  // Save all addon types
  const saveAddonTypes = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      // Filter out empty types
      const typesToSave = addonTypes.filter(type => type.name.trim() !== '');

      const { error } = await supabase
        .from('ServiceCategories')
        .update({
          addon_types: typesToSave,
          updated_at: new Date().toISOString()
        })
        .eq('service_category_id', categoryId);

      if (error) throw error;

      setSuccess('Addon types saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving addon types');
      console.error('Error saving addon types:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white sm:rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-3"></div>
          <div className="h-10 bg-gray-200 rounded mb-3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Addon Types</h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage the available addon types for this service category. These will be used when creating addons.
        </p>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
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

        {success && (
          <div className="mt-4 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <div className="text-sm text-green-700">
                  <p>{success}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {addonTypes.map((type, index) => (
            <div key={type.id} className="flex items-center space-x-4">
              <input
                type="text"
                value={type.name}
                onChange={(e) => updateAddonTypeName(index, e.target.value)}
                placeholder="Enter addon type"
                className="flex-1 focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md"
              />
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`allow-multiple-${type.id}`}
                  checked={type.allow_multiple_selection || false}
                  onChange={(e) => updateAddonTypeMultipleSelection(index, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`allow-multiple-${type.id}`} className="text-sm text-gray-700">
                  Allow multiple addons within this type
                </label>
              </div>
              
              <button
                type="button"
                onClick={() => removeAddonType(index)}
                className="inline-flex items-center p-1.5 border border-transparent rounded-full text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addAddonType}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Add Addon Type
          </button>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={saveAddonTypes}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isSaving ? 'Saving...' : 'Save Addon Types'}
          </button>
        </div>
      </div>
    </div>
  );
} 