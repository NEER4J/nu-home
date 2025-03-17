'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, X, Filter as FilterIcon, Check, Loader2 } from 'lucide-react';

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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  // Count total active filters
  const activeFilterCount = Object.values(activeFilters).reduce(
    (count, value) => count + (Array.isArray(value) ? value.length : (value ? 1 : 0)),
    0
  );

  // Toggle a filter dropdown
  const toggleDropdown = useCallback((key: string) => {
    setActiveDropdown(prev => prev === key ? null : key);
  }, []);
  
  // Apply a filter with loading state
  const applyFilter = useCallback((key: string, value: string, isMulti = false) => {
    startTransition(() => {
      const currentValues = activeFilters[key];
      const values = Array.isArray(currentValues) 
        ? currentValues 
        : currentValues ? [currentValues] : [];
      
      let newValues: string[];
      
      if (isMulti) {
        // For multi-select, toggle the value
        newValues = values.includes(value)
          ? values.filter(v => v !== value)
          : [...values, value];
      } else {
        // For single-select, toggle the value
        newValues = values.includes(value) ? [] : [value];
      }
      
      // Build new query params
      const params = new URLSearchParams();
      
      // Add all existing active filters except the one we're changing
      Object.entries(activeFilters).forEach(([k, v]) => {
        if (k !== key && v) {
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
    });
  }, [activeFilters, categorySlug, router]);
  
  // Clear all filters with loading state
  const clearAllFilters = useCallback(() => {
    startTransition(() => {
      router.push(`/services/${categorySlug}/products`);
    });
  }, [categorySlug, router]);

  // Check if a value is selected for a filter
  const isValueSelected = useCallback((key: string, value: string) => {
    const currentValues = activeFilters[key];
    if (!currentValues) return false;
    
    return Array.isArray(currentValues)
      ? currentValues.includes(value)
      : currentValues === value;
  }, [activeFilters]);

  // Count selected values for a filter
  const countSelectedValues = useCallback((key: string) => {
    const currentValues = activeFilters[key];
    if (!currentValues) return 0;
    
    return Array.isArray(currentValues) ? currentValues.length : 1;
  }, [activeFilters]);
  
  if (filters.length === 0) return null;
  
  return (
    <div className="relative">
      {/* Loading overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20 rounded-md">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
        </div>
      )}
      
      {/* Mobile filter button */}
      <div className="sm:hidden">
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md border ${
            activeFilterCount > 0 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-gray-200 text-gray-700'
          }`}
          disabled={isPending}
        >
          <div className="flex items-center gap-2">
            <FilterIcon size={16} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium rounded-full px-2 py-0.5">
                {activeFilterCount}
              </span>
            )}
          </div>
          <ChevronDown size={16} className={mobileFiltersOpen ? 'rotate-180' : ''} />
        </button>
        
        {/* Mobile filters panel */}
        {mobileFiltersOpen && (
          <div className="mt-2 border border-gray-200 rounded-md bg-white shadow-sm p-3">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-medium">Filters</h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  disabled={isPending}
                >
                  Clear all
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {filters.map((filter) => (
                <div key={filter.field_id} className="border-t pt-2">
                  <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => toggleDropdown(filter.key)}
                  >
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium">{filter.name}</h3>
                      {countSelectedValues(filter.key) > 0 && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 rounded-full px-1.5 py-0.5">
                          {countSelectedValues(filter.key)}
                        </span>
                      )}
                    </div>
                    <ChevronDown size={16} className={activeDropdown === filter.key ? 'rotate-180' : ''} />
                  </div>
                  
                  {activeDropdown === filter.key && (
                    <div className="mt-1 space-y-1 mb-2 pl-1">
                      {filter.field_type === 'select' && filter.options?.values && (
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {filter.options.values.map((value) => {
                            const isActive = isValueSelected(filter.key, value);
                            const count = filter.filterOptions?.find(opt => opt.value === value)?.count;
                            
                            return (
                              <label key={value} className="flex items-center py-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  onChange={() => applyFilter(filter.key, value, filter.is_multi)}
                                  className="h-4 w-4 rounded text-blue-600"
                                  disabled={isPending}
                                />
                                <span className="ml-2 text-sm text-gray-700 flex-grow">
                                  {value}
                                </span>
                                {count !== undefined && (
                                  <span className="text-xs text-gray-500">({count})</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                      
                      {filter.field_type === 'checkbox' && (
                        <div className="space-y-1">
                          {['Yes', 'No'].map((value) => (
                            <label key={value} className="flex items-center py-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isValueSelected(filter.key, value)}
                                onChange={() => applyFilter(filter.key, value, filter.is_multi)}
                                className="h-4 w-4 rounded text-blue-600"
                                disabled={isPending}
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                {value}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Desktop horizontal filter bar */}
      <div className="hidden sm:flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <div key={filter.field_id} className="relative">
            <button
              onClick={() => toggleDropdown(filter.key)}
              className={`px-3 py-1.5 text-sm rounded-md border flex items-center gap-1.5 ${
                activeDropdown === filter.key ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50'
              } ${countSelectedValues(filter.key) > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
              disabled={isPending}
            >
              {filter.name}
              <ChevronDown size={14} className={activeDropdown === filter.key ? 'rotate-180' : ''} />
              {countSelectedValues(filter.key) > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {countSelectedValues(filter.key)}
                </span>
              )}
            </button>
            
            {/* Filter dropdown */}
            {activeDropdown === filter.key && (
              <div className="absolute z-10 mt-1 w-52 bg-white rounded-md shadow-lg border border-gray-200">
                <div className="p-2">
                  {filter.field_type === 'select' && filter.options?.values && (
                    <div className="max-h-40 overflow-y-auto pr-1">
                      {filter.options.values.map((value) => {
                        const isActive = isValueSelected(filter.key, value);
                        const count = filter.filterOptions?.find(opt => opt.value === value)?.count;
                        
                        return (
                          <label key={value} className="flex items-center p-1 hover:bg-gray-50 cursor-pointer rounded-sm">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => applyFilter(filter.key, value, filter.is_multi)}
                              className="h-4 w-4 rounded text-blue-600"
                              disabled={isPending}
                            />
                            <span className="ml-2 text-sm text-gray-700 flex-grow">
                              {value}
                            </span>
                            {count !== undefined && (
                              <span className="text-xs text-gray-500">({count})</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  
                  {filter.field_type === 'checkbox' && (
                    <div className="space-y-1">
                      {['Yes', 'No'].map((value) => (
                        <label key={value} className="flex items-center p-1 hover:bg-gray-50 cursor-pointer rounded-sm">
                          <input
                            type="checkbox"
                            checked={isValueSelected(filter.key, value)}
                            onChange={() => applyFilter(filter.key, value, filter.is_multi)}
                            className="h-4 w-4 rounded text-blue-600"
                            disabled={isPending}
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {value}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Clear all filters button */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center px-2 py-1.5"
            disabled={isPending}
          >
            <X size={14} className="mr-1" />
            Clear all
          </button>
        )}
      </div>
      
      {/* Active filters tags (simplified) */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {Object.entries(activeFilters).map(([key, values]) => {
            if (!values) return null;
            const filter = filters.find(f => f.key === key);
            if (!filter) return null;
            
            const valueArray = Array.isArray(values) ? values : [values];
            if (valueArray.length === 0) return null;
            
            return valueArray.map(value => (
              <button
                key={`${key}-${value}`}
                onClick={() => applyFilter(key, value, filter.is_multi)}
                disabled={isPending}
                className="inline-flex items-center py-0.5 px-2 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100"
              >
                {filter.name}: {value}
                <X size={12} className="ml-1" />
              </button>
            ));
          })}
        </div>
      )}
    </div>
  );
}