// app/admin/addons/page.tsx
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/products';
import AdminAddonsTable from '@/components/admin/AdminAddonsTable';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

export default async function AdminAddonsPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>
}) {
  // Resolve the searchParams Promise
  const resolvedSearchParams = await searchParams;
  
  const supabase = await createServerSupabaseClient();
  
  // Get all service categories
  const { data: categories, error: categoriesError } = await supabase
    .from('ServiceCategories')
    .select('service_category_id, name, slug')
    .order('name');
  
  if (categoriesError) {
    throw new Error('Failed to fetch categories');
  }
  
  // Build addons query
  let addonsQuery = supabase
    .from('AdminAddons')
    .select('*, ServiceCategory:service_category_id(name, slug, addon_types)');
  
  // Apply category filter if present
  if (resolvedSearchParams.category) {
    addonsQuery = addonsQuery.eq('service_category_id', resolvedSearchParams.category);
  }
  
  // Get addons
  const { data: addons, error: addonsError } = await addonsQuery.order('title');
  
  if (addonsError) {
    throw new Error('Failed to fetch addons');
  }
  
  return (
    <div className="mx-auto">
      {/* Header with tab-based navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex justify-between items-center px-4 py-2">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-gray-800">Addons</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Link 
              href="/admin/addons/new" 
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Addon
            </Link>
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="px-2 overflow-x-auto whitespace-nowrap border-t">
          <div className="flex">
            <Link
              href="/admin/addons"
              className={`px-4 py-2 text-sm font-medium ${
                !resolvedSearchParams.category 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              All Categories
            </Link>
            {categories.map((category) => (
              <Link
                key={category.service_category_id}
                href={`/admin/addons?category=${category.service_category_id}`}
                className={`px-4 py-2 text-sm font-medium ${
                  resolvedSearchParams.category === category.service_category_id 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      {/* Addons Table with Search */}
      <AdminAddonsTable addons={addons} />
    </div>
  );
}
