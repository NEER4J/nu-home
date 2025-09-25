// app/admin/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export const metadata = {
  title: 'Admin Dashboard | Quote AI',
  description: 'Manage Quote AI quote form system',
};

export default async function AdminDashboard() {
  try {
    const supabase = await createClient();
    
    // Get counts for dashboard
    const { count: questionsCount } = await supabase
      .from('FormQuestions')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);
    const { count: categoriesCount } = await supabase
      .from('ServiceCategories')
      .select('*', { count: 'exact', head: true });
    const { count: partnersCount } = await supabase
      .from('UserProfiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'partner');
    const { count: productsCount } = await supabase
      .from('Products')
      .select('*', { count: 'exact', head: true });
    // Get 5 most recent partners
    const { data: recentPartners } = await supabase
      .from('UserProfiles')
      .select('*')
      .eq('role', 'partner')
      .order('created_at', { ascending: false })
      .limit(5);
    // Get 5 most recent categories
    const { data: recentCategories } = await supabase
      .from('ServiceCategories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    return (
      <div className="flex flex-col h-full">
      

        <div className='border-b bg-white' >
          <div className="flex justify-between items-center px-4 py-2">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-800">Admin Dashboard</h1>
            </div>
          </div>
        </div>
        
        <div className='flex-grow overflow-auto bg-gray-50 p-6 justify-center align-middle'>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Questions Card */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Questions
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {questionsCount || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200">
              <div className="text-sm">
                <Link href="/admin/form-questions" className="font-medium text-blue-600 hover:text-blue-500">
                  View all questions
                </Link>
              </div>
            </div>
          </div>

          {/* Categories Card */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Service Categories
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {categoriesCount || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200">
              <div className="text-sm">
                <Link href="/admin/service-categories" className="font-medium text-blue-600 hover:text-blue-500">
                  View all categories
                </Link>
              </div>
            </div>
          </div>

          {/* Partners Card */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4V7a4 4 0 10-8 0v2m12 4v2a4 4 0 01-4 4H7a4 4 0 01-4-4v-2" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Partners
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {partnersCount || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200">
              <div className="text-sm">
                <Link href="/admin/partners" className="font-medium text-blue-600 hover:text-blue-500">
                  View all partners
                </Link>
              </div>
            </div>
          </div>

          {/* Products Card */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Products
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {productsCount || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200">
              <div className="text-sm">
                <Link href="/admin/products" className="font-medium text-blue-600 hover:text-blue-500">
                  View all products
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Partners & Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Partners</h2>
            </div>
            <ul className="divide-y divide-gray-200">
              {recentPartners && recentPartners.length > 0 ? recentPartners.map((partner) => (
                <li key={partner.user_id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{partner.company_name || partner.email}</div>
                      <div className="text-xs text-gray-500">Joined {partner.created_at ? new Date(partner.created_at).toLocaleDateString() : ''}</div>
                    </div>
                    <Link href={`/admin/partners/${partner.user_id}`} className="text-blue-600 hover:text-blue-700 text-sm">View</Link>
                  </div>
                </li>
              )) : (
                <li className="px-6 py-4 text-center text-gray-500">No recent partners</li>
              )}
            </ul>
          </div>
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Categories</h2>
            </div>
            <ul className="divide-y divide-gray-200">
              {recentCategories && recentCategories.length > 0 ? recentCategories.map((category) => (
                <li key={category.service_category_id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{category.name}</div>
                      <div className="text-xs text-gray-500">Added {category.created_at ? new Date(category.created_at).toLocaleDateString() : ''}</div>
                    </div>
                    <Link href={`/admin/service-categories/${category.service_category_id}`} className="text-blue-600 hover:text-blue-700 text-sm">View</Link>
                  </div>
                </li>
              )) : (
                <li className="px-6 py-4 text-center text-gray-500">No recent categories</li>
              )}
            </ul>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-gray-500">Common admin tasks you might want to perform.</p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/admin/form-questions/new" className="group block">
                <div className="p-5 border border-gray-200 rounded-md hover:border-blue-300 transition-colors duration-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 rounded-md p-3 group-hover:bg-blue-200 transition-colors duration-200">
                      <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Add New Question</h3>
                      <p className="mt-1 text-sm text-gray-500">Create a new question for one of your forms.</p>
                    </div>
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/service-categories/new" className="group block">
                <div className="p-5 border border-gray-200 rounded-md hover:border-green-300 transition-colors duration-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-100 rounded-md p-3 group-hover:bg-green-200 transition-colors duration-200">
                      <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Add Service Category</h3>
                      <p className="mt-1 text-sm text-gray-500">Create a new service category.</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        </div>


      </div>
    );
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    
    // Fallback UI in case of errors
    return (
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading dashboard
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the admin dashboard. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900">Admin Navigation</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link href="/admin/form-questions" className="rounded-md bg-white px-6 py-5 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                <div className="font-medium text-gray-900">Form Questions</div>
                <div className="mt-2 text-sm text-gray-500">Manage form questions</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
}