import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { 
  getProducts, 
  getSubmission, 
  getRecommendedProducts,
  createServerSupabaseClient,
  getProductFilters
} from '@/lib/products';
import ProductFilters from '@/components/products/ProductFilters';
import ProductLayoutManager from '@/components/products/ProductLayoutManager';
import { Product } from '@/types/product.types';
import LoadingSpinner from '@/components/ui/LoadingSpinner'; 

// Loading component for the entire page
function ProductsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-40 bg-gray-100 rounded"></div>
        </div>
        
        {/* Filters skeleton */}
        <div className="mb-8 bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-24 bg-gray-200 rounded"></div>
            <div className="h-8 w-28 bg-gray-200 rounded"></div>
            <div className="h-8 w-20 bg-gray-200 rounded"></div>
          </div>
        </div>
        
        {/* Products grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="h-40 bg-gray-200 rounded-md mb-4"></div>
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-1/2 bg-gray-100 rounded mb-3"></div>
              <div className="h-8 w-full bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Products content component
async function ProductsContent({ 
  params, 
  searchParams 
}: { 
  params: { slug: string };
  searchParams: { submission?: string; [key: string]: string | string[] | undefined };
}) {
  const supabase = createServerSupabaseClient();
  
  // Get the service category based on the slug
  const { data: category, error: categoryError } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', params.slug)
    .single();
  
  if (categoryError || !category) {
    notFound();
  }
  
  // Get available filters for this category
  const filters = await getProductFilters(category.service_category_id);
  
  // Extract filter values from search params
  const activeFilters: Record<string, string | string[]> = {};

  // Process each filter key in the searchParams
  filters.forEach(filter => {
    const paramValue = searchParams[filter.key];
    if (paramValue !== undefined) {
      activeFilters[filter.key] = paramValue;
    }
  });
  
  let products: Product[] = [];
  let isRecommended = false;
  let customerName = '';
  
  // If there's a submission ID, get recommended products
  if (searchParams.submission) {
    try {
      const submission = await getSubmission(searchParams.submission);
      if (submission) {
        products = await getRecommendedProducts(
          category.service_category_id, 
          submission.form_answers
        );
        isRecommended = true;
        customerName = `${submission.first_name} ${submission.last_name}`;
      }
    } catch (error) {
      console.error('Error getting recommended products:', error);
      // Fallback to all products if there's an error
      products = await getProducts(category.service_category_id, true, activeFilters);
    }
  } else {
    // Otherwise, get all products for this category with active filters
    products = await getProducts(category.service_category_id, true, activeFilters);
  }
  
  // Get the layout type from the category
  const layoutType = category.products_list_layout || 'default';
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">
          {isRecommended ? 'Your Recommended Products' : `${category.name}`}
        </h1>
        {isRecommended && customerName && (
          <p className="mt-2 text-lg text-gray-600">
            Hi {customerName}, here are products that match your requirements
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          {isRecommended 
            ? `Based on your answers, we've selected ${products.length} products for you.`
            : `${products.length} products available`
          }
        </p>
      </div>
      
      {/* Filters Section - Moved to top and made horizontal */}
      {filters.length > 0 && (
        <div className="mb-8 bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <ProductFilters 
            filters={filters} 
            activeFilters={activeFilters} 
            categorySlug={params.slug}
          />
        </div>
      )}
      
      {/* Products Grid */}
      <div className="mt-6">
        {products.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
            <h2 className="text-xl font-medium text-gray-900 mb-2">No Products Found</h2>
            <p className="text-gray-600 text-sm">
              We couldn't find any products that match your requirements.
            </p>
            {Object.keys(activeFilters).length > 0 && (
              <Link 
                href={`/services/${params.slug}/products`}
                className="mt-4 inline-block text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear all filters
              </Link>
            )}
          </div>
        ) : (
          <div className={`
            ${layoutType === 'card' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : ''}
            ${layoutType === 'feature' ? 'space-y-6' : ''}
            ${layoutType === 'default' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : ''}
          `}>
            {products.map((product, index) => (
              <ProductLayoutManager
                key={product.product_id}
                product={product}
                categorySlug={params.slug}
                layoutType={layoutType}
                isPopular={index === 0} // First product is marked as popular
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Main Product Page component with suspense
export default async function ProductsPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submission?: string; [key: string]: string | string[] | undefined }>;
}) {
  // Resolve the promises
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsContent 
        params={resolvedParams} 
        searchParams={resolvedSearchParams} 
      />
    </Suspense>
  );
}