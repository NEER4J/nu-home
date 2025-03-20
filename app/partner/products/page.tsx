'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useSearchParams } from 'next/navigation';

export default function PartnerProductsPage() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get('category') || '';
  const successMsg = searchParams.get('success');
  const errorMsg = searchParams.get('error');
  
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [message, setMessage] = useState<{type?: string, message?: string}>({});
  
  useEffect(() => {
    // Parse message from URL params
    if (successMsg) {
      setMessage({ type: 'success', message: successMsg });
    } else if (errorMsg) {
      setMessage({ type: 'error', message: errorMsg });
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return;
        }
        
        // Get partner's approved categories
        const { data: categoriesData } = await supabase
          .from('UserCategoryAccess')
          .select(`
            *,
            ServiceCategory:service_category_id (
              service_category_id, 
              name,
              slug
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'approved');
        
        if (categoriesData) {
          setCategories(categoriesData);
        }
        
        // Build products query
        let productsQuery = supabase
          .from('Products')
          .select('*, ServiceCategory:service_category_id(name, slug)')
          .eq('partner_id', user.id);
        
        // Apply category filter if present
        if (categoryFilter) {
          productsQuery = productsQuery.eq('service_category_id', categoryFilter);
        }
        
        // Get products
        const { data: productsData } = await productsQuery.order('created_at', { ascending: false });
        
        if (productsData) {
          setProducts(productsData);
        }
      } catch (error) {
        console.error('Error fetching products data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [categoryFilter, successMsg, errorMsg]);
  
  const renderMessage = () => {
    if (!message.message) return null;
    
    return (
      <div className={`p-4 mb-6 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            {message.type === 'success' ? (
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{message.message}</p>
          </div>
        </div>
      </div>
    );
  };
  
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('Products')
        .delete()
        .eq('product_id', productId);

      if (error) {
        throw error;
      }

      // Update local state to remove the deleted product
      setProducts(products.filter(product => product.product_id !== productId));
      setMessage({ type: 'success', message: `Product "${productName}" was successfully deleted.` });
    } catch (error) {
      console.error('Error deleting product:', error);
      setMessage({ type: 'error', message: 'Failed to delete product. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  const hasCategories = categories && categories.length > 0;
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
          <p className="mt-2 text-gray-600">
            Manage your product listings
          </p>
        </div>
        {hasCategories ? (
          <Link
            href="/partner/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Product
          </Link>
        ) : (
          <Link
            href="/partner/categories/request"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Request Category Access
          </Link>
        )}
      </div>
      
      {renderMessage()}
      
      {/* Category Tabs */}
      {hasCategories && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto mb-6">
          <div className="px-2 whitespace-nowrap">
            <div className="flex">
              <Link
                href="/partner/products"
                className={`px-4 py-3 text-sm font-medium ${
                  !categoryFilter 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                All Products
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.service_category_id}
                  href={`/partner/products?category=${category.service_category_id}`}
                  className={`px-4 py-3 text-sm font-medium ${
                    categoryFilter === category.service_category_id 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                  }`}
                >
                  {category.ServiceCategory.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {products && products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
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
                {products.map((product) => (
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
                      {product.ServiceCategory?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.price ? `£${product.price.toFixed(2)}` : 'On request'}
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
                          href={`/partner/products/${product.product_id}`}
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
                        <button
                          onClick={() => handleDeleteProduct(product.product_id, product.name)}
                          className="text-red-600 hover:text-red-900"
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
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {hasCategories 
                ? "You haven't created any products yet." 
                : "You need to request access to service categories before adding products."}
            </p>
            {hasCategories ? (
              <Link
                href="/partner/products/new"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Your First Product
              </Link>
            ) : (
              <Link
                href="/partner/categories/request"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Request Category Access
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}