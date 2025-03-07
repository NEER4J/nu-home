// app/admin/service-categories/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';


export const metadata = {
  title: 'Service Categories | Nu-Home Admin',
  description: 'Manage service categories'
};

export default async function ServiceCategoriesPage() {
  try {
    const supabase = createClient();
    
    // Fetch all service categories
    const { data: categories, error } = await supabase
      .from('ServiceCategories')
      .select(`
        *,
        FormQuestions (count)
      `)
      .eq('FormQuestions.is_deleted', false)
      .order('name');
    
    if (error) {
      throw new Error(error.message);
    }
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Service Categories</h1>
          
          <Link
            href="/admin/service-categories/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Add New Category
          </Link>
        </div>
        
        {/* Categories List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {categories?.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500">
                No service categories found. Create your first category!
              </li>
            ) : (
              categories?.map((category) => (
                <li key={category.service_category_id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-md flex items-center justify-center">
                        {category.icon_url ? (
                          <img 
                            src={category.icon_url} 
                            alt={category.name} 
                            className="h-6 w-6" 
                          />
                        ) : (
                          <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium leading-6 text-gray-900">
                            {category.name}
                          </h3>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center">
                          <span className="text-sm text-gray-500">
                            {category.FormQuestions?.count || 0} Questions
                          </span>
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="text-sm text-gray-500">
                            URL: /services/{category.slug}
                          </span>
                        </div>
                        {category.description && (
                          <p className="mt-1 text-sm text-gray-600 max-w-2xl">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Link
                        href={`/admin/service-categories/${category.service_category_id}`}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 mr-2"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/services/${category.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        View Live
                      </Link>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading service categories:', error);
    
    // Fallback UI in case of errors
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Unable to load service categories
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the service categories. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }
}