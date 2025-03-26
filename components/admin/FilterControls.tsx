"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ServiceCategory } from '@/types/database.types';

interface AdminFilterControlsProps {
  categories: ServiceCategory[];
  selectedCategory: string;
  selectedStatus: string;
}

export function AdminFilterControls({
  categories,
  selectedCategory,
  selectedStatus
}: AdminFilterControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [category, setCategory] = useState(selectedCategory);
  const [status, setStatus] = useState(selectedStatus);
  
  // Apply filters when category or status changes
  useEffect(() => {
    if (!searchParams) return;
    
    const params = new URLSearchParams(searchParams.toString());
    
    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    
    // Only update the URL if the filters have actually changed
    const newQueryString = params.toString();
    const currentQueryString = searchParams.toString();
    
    if (newQueryString !== currentQueryString) {
      router.push(`/admin/form-questions${newQueryString ? `?${newQueryString}` : ''}`);
    }
  }, [category, status, router, searchParams]);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
          Service Category
        </label>
        <select
          id="category-filter"
          name="category"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.service_category_id} value={category.service_category_id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          id="status-filter"
          name="status"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
}

