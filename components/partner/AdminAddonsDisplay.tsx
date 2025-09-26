"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import AddToMyAddonsButton from "@/components/partner/AddToMyAddonsButton";
import SearchBar from "@/components/shared/SearchBar";

interface AdminAddon {
  admin_addon_id: string;
  title: string;
  image_link?: string;
  price: number;
  description?: string;
  addon_type_id: string;
  allow_multiple: boolean;
  max_count?: number;
  addon_fields?: Record<string, any>;
  ServiceCategories?: {
    name: string;
    addon_types?: Array<{
      id: string;
      name: string;
    }>;
  };
}

interface AdminAddonsDisplayProps {
  addons: AdminAddon[];
  addedAddonIds: Set<string>;
  onAddAddon: (adminAddonId: string) => Promise<{ success: boolean }>;
}

export default function AdminAddonsDisplay({ 
  addons, 
  addedAddonIds, 
  onAddAddon 
}: AdminAddonsDisplayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Function to get addon type name from addon_type_id
  const getAddonTypeName = (addon: AdminAddon): string => {
    if (!addon.ServiceCategories?.addon_types) return addon.addon_type_id;
    
    const addonType = addon.ServiceCategories.addon_types.find(
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
          addon.ServiceCategories?.name.toLowerCase().includes(term);
        
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
    <div>
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

      {filteredAddons.length === 0 && searchQuery ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No addons found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search terms.
          </p>
        </div>
      ) : addons.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No addons found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No addons available in this category.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredAddons.map((addon) => {
            const isAlreadyAdded = addedAddonIds.has(addon.admin_addon_id);
            
            return (
              <div key={addon.admin_addon_id} className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                <div className="h-48 w-full relative bg-gray-100">
                  {addon.image_link ? (
                    <Image
                      src={addon.image_link}
                      alt={addon.title}
                      fill
                      className="object-contain p-5"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{addon.title}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getAddonTypeName(addon)}
                    </span>
                  </div>
                  
                  <p className="mt-2 text-sm text-gray-500 line-clamp-3">
                    {addon.description}
                  </p>
                  
                  {/* Additional addon information */}
                  <div className="mt-3 text-xs text-gray-400 space-y-1">
                    <div>
                      <span className="font-medium">Category:</span> {addon.ServiceCategories?.name || 'Uncategorized'}
                    </div>
                    {addon.allow_multiple && (
                      <div>
                        <span className="font-medium">Multiple allowed:</span> {addon.max_count ? `Max ${addon.max_count}` : 'Unlimited'}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      £{addon.price.toFixed(2)}
                    </span>
                    
                    {isAlreadyAdded ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                        Added to your addons
                      </span>
                    ) : (
                      <AddToMyAddonsButton 
                        adminAddonId={addon.admin_addon_id}
                        onAddAddon={onAddAddon}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
