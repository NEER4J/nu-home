"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, X, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { exportLeadsToCSV } from '@/app/partner/actions';
import { convertLeadsToCSV, downloadCSV } from '@/lib/csv-utils';

interface Category {
  service_category_id: string;
  name: string;
}

interface LeadFiltersProps {
  statusFilter?: string;
  categoryFilter?: string;
  searchQuery?: string;
  categories?: Category[];
}

export default function LeadFilters({
  statusFilter,
  categoryFilter,
  searchQuery,
  categories = []
}: LeadFiltersProps) {
  const router = useRouter();
  const [status, setStatus] = useState(statusFilter || '');
  const [category, setCategory] = useState(categoryFilter || '');
  const [search, setSearch] = useState(searchQuery || '');
  const [isExporting, setIsExporting] = useState(false);

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
    
    if (search.trim()) {
      params.push(`search=${encodeURIComponent(search.trim())}`);
    }
    
    // Set page to 1 when applying new filters
    params.push('page=1');
    
    router.push(url + params.join('&'));
  };

  // Clear all filters
  const clearFilters = () => {
    setStatus('');
    setCategory('');
    setSearch('');
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

  // Handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearch('');
  };

  // Export leads to CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      
      const leads = await exportLeadsToCSV({
        statusFilter: status,
        categoryFilter: category,
        searchQuery: search.trim()
      });
      
      const csvContent = convertLeadsToCSV(leads);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `leads-export-${timestamp}.csv`;
      
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error('Error exporting leads:', error);
      alert('Failed to export leads. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Apply filters when status or category changes
  useEffect(() => {
    // Only apply filters when values change from default
    if (status !== statusFilter || category !== categoryFilter) {
      applyFilters();
    }
  }, [status, category, statusFilter, categoryFilter]);

  // Apply search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search !== searchQuery) {
        applyFilters();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [search, searchQuery]);

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              id="search-filter"
              placeholder="Search leads..."
              value={search}
              onChange={handleSearchChange}
              className="pl-10 pr-10"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="hidden">
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            name="status"
            className="mt-1 block w-full pl-3 pr-10 py-4 bg-gray-100 rounded-full  text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
        
        {/* Category Filter */}
        <div>
          <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Service Category
          </label>
          <select
            id="category-filter"
            name="category"
            className="mt-1 block w-full pl-3 pr-10 py-4 bg-gray-100 rounded-full  text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
        
        {/* Export CSV Button */}
        <div className="flex items-end">
          <Button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="bg-blue-600 hover:bg-blue-700 text-white py-4 px-4 rounded-full shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={clearFilters}
            className="bg-white py-4 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
} 