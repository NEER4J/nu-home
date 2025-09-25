"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import SearchBar from "@/components/shared/SearchBar";

interface AdminProduct {
  product_id: string;
  name: string;
  slug: string;
  image_url?: string;
  price?: number;
  description?: string;
  is_featured: boolean;
  is_active: boolean;
  product_fields?: Record<string, any>;
  ServiceCategory?: {
    name: string;
    slug: string;
  };
}

interface AdminProductsTableProps {
  products: AdminProduct[];
}

export default function AdminProductsTable({ products }: AdminProductsTableProps) {
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

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return products;
    }
    
    // Split search query by comma and trim each term
    const searchTerms = searchQuery.split(',').map(term => term.trim().toLowerCase()).filter(term => term.length > 0);
    
    if (searchTerms.length === 0) {
      return products;
    }
    
    return products.filter(product => {
      // Check if ANY search terms match (OR logic)
      return searchTerms.some(term => {
        // Search in basic fields
        const basicMatch = 
          product.name.toLowerCase().includes(term) ||
          product.description?.toLowerCase().includes(term) ||
          product.ServiceCategory?.name.toLowerCase().includes(term);
        
        // Search in product_fields JSON data recursively
        const fieldsMatch = product.product_fields ? 
          searchInObject(product.product_fields, term) : false;
        
        return basicMatch || fieldsMatch;
      });
    });
  }, [products, searchQuery]);

  // Handle search with loading state
  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
    
    // Simulate search delay for large datasets
    if (products.length > 100) {
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
            placeholder="Search products (use commas for multiple terms)..." 
            onSearch={handleSearch}
          />
        </div>
        
        {/* Status text below search bar */}
        <div className="mt-3">
          {isSearching && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Searching through {products.length} products...
            </div>
          )}
          {!isSearching && (
            <div className="text-sm text-gray-500">
              Showing {filteredProducts.length} of {products.length} products
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

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Information
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.length === 0 && searchQuery ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your search terms.
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No products found
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.product_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 relative">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover rounded-md"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-100 rounded-md flex items-center justify-center">
                            <span className="text-xs text-gray-400">No img</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {product.is_featured && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Featured
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div className="font-medium">{product.product_fields?.boiler_type || 'N/A'}</div>
                      {product.product_fields?.supported_bedroom && product.product_fields.supported_bedroom.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {product.product_fields.supported_bedroom.length === 1 
                            ? `${product.product_fields.supported_bedroom[0]} bedroom`
                            : `${product.product_fields.supported_bedroom.join(', ')} bedrooms`
                          }
                        </div>
                      )}
                      {product.product_fields?.power_and_price && product.product_fields.power_and_price.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {product.product_fields.power_and_price.map((item: any, index: number) => 
                            `${item.power}kW (${item.price ? `£${item.price}` : 'N/A'})${index < (product.product_fields?.power_and_price?.length || 0) - 1 ? ', ' : ''}`
                          ).join('')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <Link
                        href={`/admin/products/${product.product_id}`}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        Edit
                      </Link>
                      <span className="text-gray-300">|</span>
                      <Link
                        href={`/services/${product.ServiceCategory?.slug}/products/${product.slug}`}
                        className="text-green-600 hover:text-green-900 transition-colors"
                        target="_blank"
                      >
                        View
                      </Link>
                      <span className="text-gray-300">|</span>
                      <DeleteProductButton productId={product.product_id} productName={product.name} />
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
