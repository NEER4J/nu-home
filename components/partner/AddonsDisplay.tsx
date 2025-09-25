"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Edit2, Trash2, Package } from "lucide-react";
import LayoutSwitcher from "@/components/partner/LayoutSwitcher";
import SearchBar from "@/components/shared/SearchBar";

interface Addon {
  addon_id: string;
  title: string;
  price: number;
  image_link?: string;
  ServiceCategories?: {
    name: string;
  };
}

interface AddonsDisplayProps {
  addons: Addon[];
  onDelete: (addonId: string) => void;
}

export default function AddonsDisplay({ addons, onDelete }: AddonsDisplayProps) {
  const router = useRouter();
  const [layout, setLayout] = useState<'grid' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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
          addon.ServiceCategories?.name.toLowerCase().includes(term) ||
          String(addon.price).includes(term);
        
        return basicMatch;
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

  if (addons.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">No addons found. Click "Add New Addon" to create one.</div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <div className="flex flex-col">
        <h2 className="text-xl font-semibold text-gray-900">Your Addons</h2>
           {/* Status text below search bar */}
           <div className="">
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
        <div className="">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">

          <div className="w-full sm:w-96 lg:w-[500px]">
            {/* Search Bar */}
            <SearchBar 
              placeholder="Search addons (use commas for multiple terms)..." 
              onSearch={handleSearch}
            />
          </div>
          <LayoutSwitcher currentLayout={layout} onLayoutChange={setLayout} />
          </div>
        
          
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
      ) : layout === 'table' ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Addon
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAddons.map((addon) => (
                <tr key={addon.addon_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 relative">
                        {addon.image_link ? (
                          <Image
                            src={addon.image_link}
                            alt={addon.title}
                            fill
                            className="object-cover rounded-md"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-100 rounded-md flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{addon.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {addon.ServiceCategories?.name || "Uncategorized"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    £{addon.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => router.push(`/partner/addons/${addon.addon_id}`)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        Edit
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => onDelete(addon.addon_id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAddons.map((addon) => (
            <div key={addon.addon_id} className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
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
                    <span className="text-gray-400 text-sm">No image</span>
                  </div>
                )}
              </div>
              <div className="px-4 py-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">{addon.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {addon.ServiceCategories?.name || "Uncategorized"}
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  £{addon.price.toFixed(2)}
                </p>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => router.push(`/partner/addons/${addon.addon_id}`)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(addon.addon_id)}
                    className="px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:text-red-800 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
