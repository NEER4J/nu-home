'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useSearchParams } from 'next/navigation';

export default function PartnerCategoriesPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [approvedCategories, setApprovedCategories] = useState<any[]>([]);
  const [pendingCategories, setPendingCategories] = useState<any[]>([]);
  const [rejectedCategories, setRejectedCategories] = useState<any[]>([]);
  const [productCountsByCategory, setProductCountsByCategory] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<{type?: string, message?: string}>({});
  
  useEffect(() => {
    // Parse message from URL params
    const successMsg = searchParams.get('success');
    const errorMsg = searchParams.get('error');
    
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
        
        // Get partner's categories with service category details
        const { data: categoriesData } = await supabase
          .from('UserCategoryAccess')
          .select(`
            *,
            ServiceCategory:service_category_id (
              name,
              slug,
              icon_url,
              description
            )
          `)
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
          .order('created_at');
        
        if (categoriesData) {
          setCategories(categoriesData);
          
          // Split categories by status
          setApprovedCategories(categoriesData.filter(c => c.status === 'approved') || []);
          setPendingCategories(categoriesData.filter(c => c.status === 'pending') || []);
          setRejectedCategories(categoriesData.filter(c => c.status === 'rejected') || []);
          
          // Get product counts by category
          const categoryIds = categoriesData
            .filter(c => c.status === 'approved')
            .map(c => c.service_category_id);
          
          if (categoryIds.length > 0) {
            const { data: productCounts } = await supabase
              .from('Products')
              .select('service_category_id, count')
              .eq('partner_id', user.id)
              .in('service_category_id', categoryIds)
              .select('service_category_id, count(*)')
              .groupBy('service_category_id');
            
            const countMap: Record<string, number> = {};
            productCounts?.forEach((item: { service_category_id: string | number; count: number; }) => {
              countMap[item.service_category_id] = item.count;
            });
            
            setProductCountsByCategory(countMap);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [searchParams]);
  
  const renderMessage = () => {
    if (!message.message) return null;
    
    return (
      <div className={`p-4 mb-6 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{message.message}</p>
          </div>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  const hasCategories = approvedCategories.length > 0;
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Categories</h1>
          <p className="mt-2 text-gray-600">
            Manage categories where you can offer products and services
          </p>
        </div>
        <Link
          href="/partner/categories/request"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Request New Category
        </Link>
      </div>
      
      {renderMessage()}
      
      {/* Approved Categories */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Active Categories ({approvedCategories.length})
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Categories you have been approved to offer products in
          </p>
        </div>
        
        <div className="p-6">
          {approvedCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedCategories.map((category) => (
                <div 
                  key={category.access_id} 
                  className={`border ${category.is_primary ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'} rounded-lg p-4 relative`}
                >
                  {category.is_primary && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg">
                      Primary
                    </div>
                  )}
                  
                  <div className="flex items-start mb-3">
                    <div className="flex-shrink-0 bg-gray-100 w-12 h-12 rounded-md flex items-center justify-center">
                      {category.ServiceCategory.icon_url ? (
                        <img 
                          src={category.ServiceCategory.icon_url} 
                          alt={category.ServiceCategory.name} 
                          className="w-8 h-8" 
                        />
                      ) : (
                        <span className="text-gray-400 text-xl">#</span>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{category.ServiceCategory.name}</h3>
                      <p className="text-xs text-gray-500">Slug: {category.ServiceCategory.slug}</p>
                    </div>
                  </div>
                  
                  {category.ServiceCategory.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {category.ServiceCategory.description}
                    </p>
                  )}
                  
                  <div className="flex justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      {productCountsByCategory[category.service_category_id] || 0} products
                    </div>
                    <Link
                      href={`/partner/products?category=${category.service_category_id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View Products →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No active categories</h3>
              <p className="mt-1 text-sm text-gray-500">
                Once your category requests are approved, they will appear here.
              </p>
              <Link
                href="/partner/categories/request"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Request Category Access
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Pending Requests */}
      {pendingCategories.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">
                Pending Requests ({pendingCategories.length})
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Category access requests waiting for approval
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {pendingCategories.map((category) => (
                <div 
                  key={category.access_id} 
                  className="border border-yellow-200 bg-yellow-50 rounded-lg p-4"
                >
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-yellow-600 mr-3 mt-1" />
                    <div>
                      <h3 className="text-md font-medium text-gray-900">
                        {category.ServiceCategory.name}
                        {category.is_primary && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Primary
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Your request is pending approval from an administrator. You'll be notified when it's approved.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Requested on {new Date(category.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Rejected Requests */}
      {rejectedCategories.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">
                Rejected Requests ({rejectedCategories.length})
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Category access requests that were not approved
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {rejectedCategories.map((category) => (
                <div 
                  key={category.access_id} 
                  className="border border-red-200 bg-red-50 rounded-lg p-4"
                >
                  <div className="flex items-start">
                    <XCircle className="h-5 w-5 text-red-600 mr-3 mt-1" />
                    <div>
                      <h3 className="text-md font-medium text-gray-900">
                        {category.ServiceCategory.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Your request for this category was not approved. Please contact support for more information.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Requested on {new Date(category.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}