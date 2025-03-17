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
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link 
          href="/admin/products/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Add New Product
        </Link>
      </div>
      
      {/* Category Filter */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Filter by Category</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products"
            className={`px-3 py-1 rounded text-sm ${
              !resolvedSearchParams.category 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            All Categories
          </Link>
          {categories.map((category) => (
            <Link
              key={category.service_category_id}
              href={`/admin/products?category=${category.service_category_id}`}
              className={`px-3 py-1 rounded text-sm ${
                resolvedSearchParams.category === category.service_category_id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
      
      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.product_id}>
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
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/admin/products/${product.product_id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      <span className="text-gray-300">|</span>
                      <Link
                        href={`/services/${product.ServiceCategory?.slug}/products/${product.slug}`}
                        className="text-green-600 hover:text-green-900"
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
  );
}