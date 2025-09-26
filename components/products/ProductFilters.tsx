'use client';

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface FilterOption {
  key: string
  name: string
  options: string[]
  isMulti: boolean
}

interface ProductFiltersProps {
  categoryId?: string
  onFilterChange?: (filters: Record<string, string[]>) => void
  filters?: any[]
  activeFilters?: Record<string, string | string[]>
  categorySlug?: string
}

export default function ProductFilters({ 
  categoryId, 
  onFilterChange,
  filters,
  activeFilters,
  categorySlug
}: ProductFiltersProps) {
  const [filterFields, setFilterFields] = useState<FilterOption[]>([])
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const supabase = createClientComponentClient()

  useEffect(() => {
    // If filters are provided directly, use them
    if (filters && filters.length > 0) {
      const filterOptions = filters.map(field => ({
        key: field.key,
        name: field.name,
        options: field.options?.values || [],
        isMulti: field.is_multi
      }))
      setFilterFields(filterOptions)
      
      // Initialize selected filters from activeFilters if provided
      const initialFilters: Record<string, string[]> = {}
      filterOptions.forEach(field => {
        if (activeFilters && activeFilters[field.key]) {
          initialFilters[field.key] = Array.isArray(activeFilters[field.key]) 
            ? activeFilters[field.key] as string[] 
            : [activeFilters[field.key] as string]
        } else {
          initialFilters[field.key] = []
        }
      })
      setSelectedFilters(initialFilters)
      return
    }

    // Otherwise fetch filters from the database
    async function fetchFilters() {
      if (!categoryId) return
      
      const { data: fields } = await supabase
        .from('CategoryFields')
        .select('*')
        .eq('service_category_id', categoryId)
        .eq('field_type', 'select')
        .order('display_order', { ascending: true })

      if (fields) {
        const filterOptions = fields.map(field => ({
          key: field.key,
          name: field.name,
          options: field.options?.values || [],
          isMulti: field.is_multi
        }))
        setFilterFields(filterOptions)
        
        // Initialize selected filters
        const initialFilters: Record<string, string[]> = {}
        filterOptions.forEach(field => {
          initialFilters[field.key] = []
        })
        setSelectedFilters(initialFilters)
      }
    }

    fetchFilters()
  }, [categoryId, filters, activeFilters])

  const handleFilterChange = (key: string, value: string, isChecked: boolean) => {
    setSelectedFilters(prev => {
      const updatedFilters = { ...prev }
      
      if (filterFields.find(f => f.key === key)?.isMulti) {
        // Multi-select handling
        if (isChecked) {
          updatedFilters[key] = [...(prev[key] || []), value]
        } else {
          updatedFilters[key] = prev[key].filter(v => v !== value)
        }
      } else {
        // Single-select handling
        updatedFilters[key] = isChecked ? [value] : []
      }
      
      if (onFilterChange) {
        onFilterChange(updatedFilters)
      }
      return updatedFilters
    })
  }

  if (filterFields.length === 0) return null

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Filters</h2>
      
      <div className="space-y-6">
        {filterFields.map(field => (
          <div key={field.key} className="border-b pb-4 last:border-b-0">
            <h3 className="font-medium mb-2 capitalize">{field.name}</h3>
            <div className="space-y-2">
              {field.options.map(option => (
                <label key={option} className="flex items-center space-x-2">
                  <input
                    type={field.isMulti ? "checkbox" : "radio"}
                    name={field.key}
                    value={option}
                    checked={selectedFilters[field.key]?.includes(option)}
                    onChange={(e) => handleFilterChange(field.key, option, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm capitalize">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}