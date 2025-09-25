// app/admin/products/page.tsx
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/products';
import AdminProductsTable from '@/components/admin/AdminProductsTable';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

export default async function AdminProductsPage({
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
  
  // Build products query
  let productsQuery = supabase
    .from('Products')
    .select('*, ServiceCategory:service_category_id(name, slug)');
  
  // Apply category filter if present
  if (resolvedSearchParams.category) {
    productsQuery = productsQuery.eq('service_category_id', resolvedSearchParams.category);
  }
  
  // Get products
  const { data: products, error: productsError } = await productsQuery.order('name');
  
  if (productsError) {
    throw new Error('Failed to fetch products');
  }
  
  return (
    <div className="mx-auto">
      {/* Header with tab-based navigation like the image */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex justify-between items-center px-4 py-2">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-gray-800">Products</h1>
            
          </div>
          <div className="flex items-center space-x-2">
          
            <Link 
              href="/admin/products/new" 
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Product
            </Link>
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="px-2 overflow-x-auto whitespace-nowrap border-t">
          <div className="flex">
            <Link
              href="/admin/products"
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
                href={`/admin/products?category=${category.service_category_id}`}
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
      
      {/* Products Table with Search */}
      <AdminProductsTable products={products} />
    </div>
  );
}