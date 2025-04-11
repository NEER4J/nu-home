"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Category {
  service_category_id: string;
  name: string;
}

interface LeadFiltersProps {
  statusFilter?: string;
  categoryFilter?: string;
  categories?: Category[];
}

export default function LeadFilters({
  statusFilter,
  categoryFilter,
  categories = []
}: LeadFiltersProps) {
  const router = useRouter();
  const [status, setStatus] = useState(statusFilter || '');
  const [category, setCategory] = useState(categoryFilter || '');

  // Apply filters when they change
  const applyFilters = () => {
    let url = '/partner/leads?';
    let params = [];
    
    if (status) {
      params.push(`status=${status}`);
    }
    
    if (category) {
      params.push(`category=${category}`);
    }
    
    // Set page to 1 when applying new filters
    params.push('page=1');
    
    router.push(url + params.join('&'));
  };

  // Clear all filters
  const clearFilters = () => {
    setStatus('');
    setCategory('');
    router.push('/partner/leads');
  };

  // Handle status change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
  };

  // Handle category change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
  };

  // Apply filters when status or category changes
  useEffect(() => {
    // Only apply filters when values change from default
    if (status !== statusFilter || category !== categoryFilter) {
      applyFilters();
    }
  }, [status, category, statusFilter, categoryFilter]);

  return (
    <div className="mb-6 bg-white p-4 rounded-md shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            name="status"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={status}
            onChange={handleStatusChange}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Service Category
          </label>
          <select
            id="category-filter"
            name="category"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={category}
            onChange={handleCategoryChange}
          >
            <option value="">All Categories</option>
            {categories?.map((category) => (
              <option key={category.service_category_id} value={category.service_category_id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-end">
          <button
            type="button"
            onClick={clearFilters}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
} 