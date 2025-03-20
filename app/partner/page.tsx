// app/partner/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, FileText, AlertCircle, CheckCircle, Activity, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function PartnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [pendingCategories, setPendingCategories] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return;
        }
        
        // Get partner profile
        const { data: profileData } = await supabase
          .from('UserProfiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
        }
        
        // Get partner's categories
        const { data: categoriesData } = await supabase
          .from('UserCategoryAccess')
          .select(`
            *,
            ServiceCategory:service_category_id (
              name, slug
            )
          `)
          .eq('user_id', user.id);
        
        if (categoriesData) {
          setCategories(categoriesData);
          
          // Get partner's products count
          const { count: products } = await supabase
            .from('Products')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', user.id);
          
          setProductsCount(products || 0);
          
          // Get partner's leads (quote submissions for their categories)
          const categoryIds = categoriesData.map(cat => cat.service_category_id) || [];
          
          if (categoryIds.length > 0) {
            const { data: leadsData, count: leads } = await supabase
              .from('QuoteSubmissions')
              .select(`
                *,
                ServiceCategories (
                  name
                )
              `, { count: 'exact' })
              .in('service_category_id', categoryIds)
              .order('submission_date', { ascending: false })
              .limit(5);
            
            setLeads(leadsData || []);
            setLeadsCount(leads || 0);
          }
          
          // Get pending category requests
          const { data: pendingData } = await supabase
            .from('UserCategoryAccess')
            .select(`
              *,
              ServiceCategory:service_category_id (
                name
              )
            `)
            .eq('user_id', user.id)
            .eq('status', 'pending');
          
          setPendingCategories(pendingData || []);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 p-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile?.company_name || 'Partner'}</h1>
        <p className="mt-2 text-gray-600">
          Manage your products, track leads, and grow your business with Nu-Home.
        </p>
        
        {profile?.status === 'pending' && (
          <div className="mt-4 flex items-start bg-yellow-50 text-yellow-800 p-4 rounded-md">
            <AlertCircle className="mr-3 h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-medium">Account Pending Approval</h3>
              <p className="text-sm">Your account is currently pending approval from an administrator. Some features may be limited.</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-md">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-700">Products</h2>
              <p className="text-3xl font-bold text-gray-900">{productsCount}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/partner/products" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View all products →
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-md">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-700">Leads</h2>
              <p className="text-3xl font-bold text-gray-900">{leadsCount}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/partner/leads" className="text-green-600 hover:text-green-800 text-sm font-medium">
              View all leads →
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-md">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-700">Categories</h2>
              <p className="text-3xl font-bold text-gray-900">{categories?.length || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/partner/categories" className="text-purple-600 hover:text-purple-800 text-sm font-medium">
              Manage categories →
            </Link>
          </div>
        </div>
      </div>
      
      {/* Recent Leads */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Recent Leads</h2>
          <Link href="/partner/leads" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View all
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          {leads && leads.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.submission_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{lead.first_name} {lead.last_name}</div>
                      <div className="text-sm text-gray-500">{lead.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.ServiceCategories?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(lead.submission_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${lead.status === 'new' ? 'bg-green-100 text-green-800' : 
                          lead.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'}`
                      }>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/partner/leads/${lead.submission_id}`} className="text-blue-600 hover:text-blue-900">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No leads yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                When customers submit quote requests for your services, they'll appear here.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Active Categories & Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Categories */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Your Service Categories</h2>
          </div>
          <div className="p-6">
            {categories && categories.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {categories.map(cat => (
                  <li key={cat.access_id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full ${cat.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'} mr-3`}></div>
                      <span className="text-gray-900">{cat.ServiceCategory.name}</span>
                      {cat.is_primary && (
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Primary
                        </span>
                      )}
                    </div>
                    <span className={`text-sm ${cat.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {cat.status === 'approved' ? (
                        <span className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approved
                        </span>
                      ) : 'Pending'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">No service categories assigned yet.</p>
              </div>
            )}
            
            <div className="mt-4">
              <Link 
                href="/partner/categories/request" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Request New Category
              </Link>
            </div>
          </div>
        </div>
        
        {/* Quick Links / Getting Started */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Quick Actions</h2>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/partner/products/new" 
                  className="flex items-center px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50 transition"
                >
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-2">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-gray-800">Add New Product</h3>
                    <p className="text-xs text-gray-500">Create a new product listing</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  href="/partner/profile" 
                  className="flex items-center px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50 transition"
                >
                  <div className="flex-shrink-0 bg-purple-100 rounded-md p-2">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-gray-800">Update Profile</h3>
                    <p className="text-xs text-gray-500">Update your business information</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  href="/partner/categories" 
                  className="flex items-center px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50 transition"
                >
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-2">
                    <Activity className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-gray-800">Manage Categories</h3>
                    <p className="text-xs text-gray-500">View and request service categories</p>
                  </div>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}