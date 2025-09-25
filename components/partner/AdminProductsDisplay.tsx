"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, AlertTriangle } from "lucide-react";
import AddToMyProductsButton from "@/components/partner/AddToMyProductsButton";
import SearchBar from "@/components/shared/SearchBar";

interface AdminProduct {
  product_id: string;
  name: string;
  image_url?: string;
  price?: number;
  description?: string;
  product_fields?: Record<string, any>;
  ServiceCategories?: {
    name: string;
  };
}

interface AdminProductsDisplayProps {
  products: AdminProduct[];
  addedProductIds: Set<string>;
  onAddProduct: (productId: string) => Promise<{ success?: boolean; error?: string }>;
}

export default function AdminProductsDisplay({ 
  products, 
  addedProductIds, 
  onAddProduct 
}: AdminProductsDisplayProps) {
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
          product.ServiceCategories?.name.toLowerCase().includes(term);
        
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

  if (!products || products.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No products available</h3>
        <p className="mt-1 text-sm text-gray-500">
          There are no products available in the selected category.
        </p>
      </div>
    );
  }

  return (
    <div>
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

      {filteredProducts.length === 0 && searchQuery ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search terms.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const isAlreadyAdded = addedProductIds.has(product.product_id);
            
            return (
              <div key={product.product_id} className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                <div className="h-48 w-full relative bg-gray-100">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
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
                    <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {product.product_fields?.boiler_type || 'N/A'}
                    </span>
                  </div>
                  
                  <p className="mt-2 text-sm text-gray-500 line-clamp-3">
                    {product.description}
                  </p>
                  
                  {/* Additional product information */}
                  <div className="mt-3 text-xs text-gray-400 space-y-1">
                    {product.product_fields?.supported_bedroom && product.product_fields.supported_bedroom.length > 0 && (
                      <div>
                        <span className="font-medium">Bedrooms:</span> {product.product_fields.supported_bedroom.length === 1 
                          ? `${product.product_fields.supported_bedroom[0]} bedroom`
                          : `${product.product_fields.supported_bedroom.join(', ')} bedrooms`
                        }
                      </div>
                    )}
                    {product.product_fields?.power_and_price && product.product_fields.power_and_price.length > 0 && (
                      <div>
                        <span className="font-medium">Power & Price:</span> {product.product_fields.power_and_price.map((item: any, index: number) => 
                          `${item.power}kW (${item.price ? `£${item.price}` : 'N/A'})${index < (product.product_fields?.power_and_price?.length || 0) - 1 ? ', ' : ''}`
                        ).join('')}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {product.price ? `£${product.price}` : ''}
                    </span>
                    
                    {isAlreadyAdded ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                        Added to your products
                      </span>
                    ) : (
                      <AddToMyProductsButton 
                        productId={product.product_id} 
                        onAdd={onAddProduct} 
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
