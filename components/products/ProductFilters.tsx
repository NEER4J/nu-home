'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type FilterOption = {
  value: string;
  count: number;
};

type Filter = {
  field_id: string;
  key: string;
  name: string;
  field_type: string;
  options?: {
    values: string[];
  };
  is_multi?: boolean;
  filterOptions?: FilterOption[];
};

type ProductFiltersProps = {
  filters: Filter[];
  activeFilters: Record<string, string | string[]>;
  categorySlug: string;
};

export default function ProductFilters({ filters, activeFilters, categorySlug }: ProductFiltersProps) {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    Object.fromEntries(filters.map(filter => [filter.key, true]))
  );
  
  // Toggle a filter section
  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Apply a filter
  const applyFilter = (key: string, value: string, isMulti = false) => {
    const currentValues = activeFilters[key];
    let newValues: string[];
    
    if (isMulti) {
      // For multi-select, toggle the value in the array
      if (Array.isArray(currentValues)) {
        if (currentValues.includes(value)) {
          newValues = currentValues.filter(v => v !== value);
        } else {
          newValues = [...currentValues, value];
        }
      } else if (typeof currentValues === 'string') {
        newValues = currentValues === value ? [] : [currentValues, value];
      } else {
        newValues = [value];
      }
    } else {
      // For single-select, set the single value or remove if already selected
      if (currentValues === value) {
        newValues = [];
      } else {
        newValues = [value];
      }
    }
    
    // Build new query params
    const params = new URLSearchParams();
    
    // Add all existing active filters except the one we're changing
    Object.entries(activeFilters).forEach(([k, v]) => {
      if (k !== key) {
        if (Array.isArray(v)) {
          v.forEach(val => params.append(k, val));
        } else {
          params.append(k, v);
        }
      }
    });
    
    // Add the updated filter values
    newValues.forEach(v => params.append(key, v));
    
    // Navigate to the new URL
    router.push(`/services/${categorySlug}/products?${params.toString()}`);
  };
  
  // Clear a specific filter
  const clearFilter = (key: string) => {
    const params = new URLSearchParams();
    
    // Add all existing active filters except the one we're clearing
    Object.entries(activeFilters).forEach(([k, v]) => {
      if (k !== key) {
        if (Array.isArray(v)) {
          v.forEach(val => params.append(k, val));
        } else {
          params.append(k, v);
        }
      }
    });
    
    // Navigate to the new URL
    router.push(`/services/${categorySlug}/products?${params.toString()}`);
  };
  
  if (filters.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Filters</h2>
        {Object.keys(activeFilters).length > 0 && (
          <Link 
            href={`/services/${categorySlug}/products`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all
          </Link>
        )}
      </div>
      
      <div className="space-y-4">
        {filters.map((filter) => (
          <div key={filter.field_id} className="border-t pt-3">
            <div 
              className="flex justify-between items-center cursor-pointer mb-2"
              onClick={() => toggleSection(filter.key)}
            >
              <h3 className="font-medium">{filter.name}</h3>
              <button className="text-gray-500">
                {expandedSections[filter.key] ? (
                  <span>−</span>
                ) : (
                  <span>+</span>
                )}
              </button>
            </div>
            
            {expandedSections[filter.key] && (
              <div className="pl-1">
                {filter.field_type === 'select' && filter.options?.values && (
                  <div className="space-y-2">
                    {filter.options.values.map((value) => {
                      const isActive = Array.isArray(activeFilters[filter.key])
                        ? activeFilters[filter.key].includes(value)
                        : activeFilters[filter.key] === value;
                      
                      const count = filter.filterOptions?.find(opt => opt.value === value)?.count;
                      
                      return (
                        <div key={value} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`filter-${filter.key}-${value}`}
                            checked={isActive}
                            onChange={() => applyFilter(filter.key, value, filter.is_multi)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label 
                            htmlFor={`filter-${filter.key}-${value}`}
                            className="ml-2 text-sm text-gray-700 cursor-pointer flex-grow"
                          >
                            {value}
                          </label>
                          {count !== undefined && (
                            <span className="text-xs text-gray-500">({count})</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {filter.field_type === 'checkbox' && (
                  <div className="space-y-2">
                    {['Yes', 'No'].map((value) => {
                      const isActive = Array.isArray(activeFilters[filter.key])
                        ? activeFilters[filter.key].includes(value)
                        : activeFilters[filter.key] === value;
                      
                      return (
                        <div key={value} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`filter-${filter.key}-${value}`}
                            checked={isActive}
                            onChange={() => applyFilter(filter.key, value, filter.is_multi)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label 
                            htmlFor={`filter-${filter.key}-${value}`}
                            className="ml-2 text-sm text-gray-700 cursor-pointer"
                          >
                            {value}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Active filter indicators with clear option */}
                {activeFilters[filter.key] && (
                  <div className="mt-2">
                    <button
                      onClick={() => clearFilter(filter.key)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Clear {filter.name} filter
                      {Array.isArray(activeFilters[filter.key]) && activeFilters[filter.key].length > 0 && (
                        <span className="ml-1">
                          ({Array.isArray(activeFilters[filter.key]) 
                            ? (activeFilters[filter.key] as string[]).join(', ') 
                            : activeFilters[filter.key]})
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}