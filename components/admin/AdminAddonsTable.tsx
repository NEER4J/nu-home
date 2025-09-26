"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { DeleteAddonButton } from "@/components/admin/DeleteAddonButton";
import SearchBar from "@/components/shared/SearchBar";

interface AdminAddon {
  admin_addon_id: string;
  title: string;
  slug: string;
  image_link?: string;
  price: number;
  description?: string;
  is_featured: boolean;
  is_active: boolean;
  addon_type_id: string;
  allow_multiple: boolean;
  max_count?: number;
  addon_fields?: Record<string, any>;
  ServiceCategory?: {
    name: string;
    slug: string;
    addon_types?: Array<{
      id: string;
      name: string;
    }>;
  };
}

interface AdminAddonsTableProps {
  addons: AdminAddon[];
}

export default function AdminAddonsTable({ addons }: AdminAddonsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Function to get addon type name from addon_type_id
  const getAddonTypeName = (addon: AdminAddon): string => {
    if (!addon.ServiceCategory?.addon_types) return addon.addon_type_id;
    
    const addonType = addon.ServiceCategory.addon_types.find(
      (type: any) => type.id === addon.addon_type_id
    );
    
    return addonType?.name || addon.addon_type_id;
  };

  // Recursive function to search through nested JSON data
  const searchInObject = (obj: any, query: string): boolean => {
    if (obj === null || obj === undefined) return false;
    
    if (typeof obj === 'string') {
      return obj.toLowerCase().includes(query);
    }
    
    if (typeof obj === 'number') {
      return String(obj).toLowerCase().includes(query);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(item => searchInObject(item, query));
    }
    
    if (typeof obj === 'object') {
      return Object.entries(obj).some(([key, value]) => {
        const keyMatch = key.toLowerCase().includes(query);
        const valueMatch = searchInObject(value, query);
        return keyMatch || valueMatch;
      });
    }
    
    return false;
  };

  const filteredAddons = useMemo(() => {
    if (!searchQuery.trim()) {
      return addons;
    }
    
    // Split search query by comma and trim each term
    const searchTerms = searchQuery.split(',').map(term => term.trim().toLowerCase()).filter(term => term.length > 0);
    
    if (searchTerms.length === 0) {
      return addons;
    }
    
    return addons.filter(addon => {
      // Check if ANY search terms match (OR logic)
      return searchTerms.some(term => {
        // Search in basic fields
        const basicMatch = 
          addon.title.toLowerCase().includes(term) ||
          addon.description?.toLowerCase().includes(term) ||
          addon.ServiceCategory?.name.toLowerCase().includes(term);
        
        // Search in addon_fields JSON data recursively
        const fieldsMatch = addon.addon_fields ? 
          searchInObject(addon.addon_fields, term) : false;
        
        return basicMatch || fieldsMatch;
      });
    });
  }, [addons, searchQuery]);

  // Handle search with loading state
  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
    
    // Simulate search delay for large datasets
    if (addons.length > 100) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    setIsSearching(false);
  };

  return (
    <div className="p-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="w-full sm:w-96 lg:w-[500px]">
          <SearchBar 
            placeholder="Search addons (use commas for multiple terms)..." 
            onSearch={handleSearch}
          />
        </div>
        
        {/* Status text below search bar */}
        <div className="mt-3">
          {isSearching && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Searching through {addons.length} addons...
            </div>
          )}
          {!isSearching && (
            <div className="text-sm text-gray-500">
              Showing {filteredAddons.length} of {addons.length} addons
              {searchQuery && (
                <span className="ml-1 text-blue-600">
                  (filtered by "{searchQuery}")
                  {searchQuery.includes(',') && (
                    <span className="ml-1 text-xs text-gray-500">
                      • Multi-term search (OR)
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Addon
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAddons.length === 0 && searchQuery ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No addons found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your search terms.
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredAddons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No addons found.
                </td>
              </tr>
            ) : (
              filteredAddons.map((addon) => (
                <tr key={addon.admin_addon_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-12 w-12 flex-shrink-0">
                        {addon.image_link ? (
                          <Image
                            src={addon.image_link}
                            alt={addon.title}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {addon.title}
                        </div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {addon.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {addon.ServiceCategory?.name || 'Uncategorized'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getAddonTypeName(addon)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    £{addon.price.toFixed(2)}
                    {addon.allow_multiple && (
                      <div className="text-xs text-gray-500">
                        Multiple allowed{addon.max_count ? ` (max: ${addon.max_count})` : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        addon.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {addon.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {addon.is_featured && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <Link
                        href={`/admin/addons/${addon.admin_addon_id}`}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        Edit
                      </Link>
                      <span className="text-gray-300">|</span>
                      <DeleteAddonButton addonId={addon.admin_addon_id} addonTitle={addon.title} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
