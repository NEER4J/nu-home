// app/admin/products/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { createServerSupabaseClient } from '@/lib/products';
import { DeleteProductButton } from '@/components/admin/DeleteProductButton';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>
}) {
  // Resolve the searchParams Promise
  const resolvedSearchParams = await searchParams;
  
  const supabase = createServerSupabaseClient();
  
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
      
      {/* Products Table */}
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
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
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => (
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
    </div>
  );
}