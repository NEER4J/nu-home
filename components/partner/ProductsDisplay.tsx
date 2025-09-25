"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, Edit } from "lucide-react";
import DeleteProductButton from "@/components/partner/DeleteProductButton";
import LayoutSwitcher from "@/components/partner/LayoutSwitcher";
import SearchBar from "@/components/shared/SearchBar";

interface Product {
  partner_product_id: string;
  name: string;
  image_url?: string;
  price?: number;
  slug: string;
  product_fields?: Record<string, any>;
  ServiceCategories?: {
    name: string;
  };
}

interface ProductsDisplayProps {
  products: Product[];
  approvedCategories: any[];
}

export default function ProductsDisplay({ products, approvedCategories }: ProductsDisplayProps) {
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

  if (products.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No products yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new product or customizing a template.
        </p>
        {approvedCategories && approvedCategories.length > 0 && (
          <div className="mt-6">
            <Link
              href="/partner/my-products/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Package className="mr-2 h-4 w-4" />
              Add New Product
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <div className="flex flex-col">
        <h2 className="text-lg font-medium text-gray-900">Your Products</h2>
             {/* Status text below search bar */}
             <div className="">
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
        
        <div className="">

<div className="flex flex-col sm:flex-row gap-4 sm:items-center">

          <div className="w-full sm:w-96 lg:w-[500px]">
            {/* Search Bar */}
            <SearchBar 
              placeholder="Search products (use commas for multiple terms)..." 
              onSearch={handleSearch}
            />
          </div>
          <LayoutSwitcher currentLayout={layout} onLayoutChange={setLayout} />
          </div>

       

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
        <>
          {layout === 'grid' && (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <div key={product.partner_product_id} className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
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
                    <Package className="h-12 w-12 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="px-4 py-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {product.product_fields?.boiler_type || 'N/A'}
                </p>
                <div className="text-xs text-gray-400 mt-2 space-y-1">
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
                      <span className="font-medium">Power & Price:</span>                       {product.product_fields.power_and_price.map((item: any, index: number) => 
                        `${item.power}kW (${item.price ? `£${item.price}` : 'N/A'})${index < (product.product_fields?.power_and_price?.length || 0) - 1 ? ', ' : ''}`
                      ).join('')}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex space-x-2">
                  <Link
                    href={`/partner/my-products/${product.partner_product_id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                  <DeleteProductButton productId={product.partner_product_id} />
                </div>
              </div>
            </div>
          ))}
        </div>
          )}
          
          {layout === 'table' && (
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
              {filteredProducts.map((product) => (
                <tr key={product.partner_product_id} className="hover:bg-gray-50">
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
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
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
                      (product as any).is_active !== false
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {(product as any).is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <Link
                        href={`/partner/my-products/${product.partner_product_id}`}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        Edit
                      </Link>
                      <span className="text-gray-300">|</span>
                      <DeleteProductButton productId={product.partner_product_id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </div>
  );
}
