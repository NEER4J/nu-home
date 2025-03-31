import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';

interface SearchParams {
  submission?: string;
  price_min?: string;
  price_max?: string;
  [key: string]: string | string[] | undefined;
}

export async function generateMetadata({ 
  params,
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  // Resolve the promises
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const supabase = await createClient();
  
  // Get the hostname from headers
  const headersList = await headers();
  const hostname = headersList.toString().includes('host=') 
    ? headersList.toString().split('host=')[1].split(',')[0] 
    : '';
  const subdomain = hostname.split('.')[0];
  
  // Get partner info if subdomain exists
  let partner = null;
  if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
    const { data: partnerData } = await supabase
      .from('UserProfiles')
      .select('*')
      .eq('subdomain', subdomain)
      .single();
    
    if (partnerData) {
      partner = partnerData;
    }
  }

  const { data: category } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .eq('is_active', true)
    .single();

  if (!category) {
    return {
      title: 'Category Not Found',
      description: 'The requested category could not be found'
    };
  }

  return {
    title: partner 
      ? `${category.name} Products - ${partner.company_name}`
      : `${category.name} Products`,
    description: `Browse our selection of ${category.name} products and services${partner ? ` from ${partner.company_name}` : ''}.`
  };
}

export default async function CategoryProductsPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  // Resolve the promises
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const supabase = await createClient();

  // Get the category
  const { data: category } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .single();

  if (!category) {
    notFound();
  }

  // Get the partner info from subdomain
  const headersList = await headers();
  const hostname = headersList.toString().includes('host=') 
    ? headersList.toString().split('host=')[1].split(',')[0] 
    : '';
  const subdomain = hostname.split('.')[0];
  
  let partner = null;
  if (subdomain && subdomain !== 'localhost') {
    const { data: partnerData } = await supabase
      .from('UserProfiles')
      .select('*')
      .eq('subdomain', subdomain)
      .single();
    partner = partnerData;
  }

  // Get submission info if available
  let submission = null;
  if (resolvedSearchParams.submission) {
    const { data: submissionData } = await supabase
      .from('QuoteSubmissions')
      .select('*, partner_leads(*)')
      .eq('submission_id', resolvedSearchParams.submission)
      .single();

    if (submissionData) {
      submission = submissionData;
    }
  }

  // Get custom fields for this category
  const { data: customFields } = await supabase
    .from('CategoryFields')
    .select('*')
    .eq('service_category_id', category.service_category_id)
    .order('display_order');

  // Build the query
  let query = supabase
    .from('Products')
    .select(`
      *,
      service_category:service_category_id (
        name,
        slug
      )
    `)
    .eq('service_category_id', category.service_category_id)
    .eq('is_active', true);

  // Apply price filters if provided
  if (resolvedSearchParams.price_min) {
    query = query.gte('price', parseFloat(resolvedSearchParams.price_min));
  }
  if (resolvedSearchParams.price_max) {
    query = query.lte('price', parseFloat(resolvedSearchParams.price_max));
  }

  // Apply custom field filters
  if (customFields) {
    Object.entries(resolvedSearchParams).forEach(([key, value]) => {
      if (key !== 'submission' && key !== 'price_min' && key !== 'price_max') {
        const field = customFields.find(f => f.key === key);
        if (field && value) {
          if (field.is_multi) {
            // For multi-select fields, check if the value exists in the array
            query = query.filter('product_fields->>'+key, 'cs', value);
          } else {
            // For single-select fields, exact match
            query = query.filter('product_fields->>'+key, 'eq', value);
          }
        }
      }
    });
  }

  // Get products based on partner status
  let products = [];
  if (partner) {
    // First try to get partner products
    const { data: partnerProducts } = await supabase
      .from('PartnerProducts')
      .select(`
        *,
        service_category:service_category_id (
          name,
          slug
        )
      `)
      .eq('service_category_id', category.service_category_id)
      .eq('partner_id', partner.user_id)
      .eq('is_active', true);

    if (partnerProducts && partnerProducts.length > 0) {
      products = partnerProducts;
    }
  }

  // If no partner products found or no partner, get base products
  if (products.length === 0) {
    const { data: baseProducts } = await query;
    if (baseProducts) {
      products = baseProducts;
    }
  }

  // Get unique values for each custom field
  const fieldValues: { [key: string]: Set<string> } = {};
  if (customFields) {
    for (const field of customFields) {
      // Extract values directly from the options JSONB field
      if (field.options?.values) {
        fieldValues[field.key] = new Set(field.options.values);
      }
    }
  }

  // Get price range
  const { data: priceRange } = await supabase
    .from(partner ? 'PartnerProducts' : 'Products')
    .select('price')
    .eq('service_category_id', category.service_category_id)
    .eq(partner ? 'partner_id' : 'is_active', partner ? partner.user_id : true);

  const prices = priceRange?.map(p => p.price).filter(p => p !== null) || [];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message if coming from form submission */}
        {submission && (
          <div className="mb-8 rounded-lg bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your quote request has been submitted. While we prepare your quote, browse our available products below.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Header */}
        <div className="relative mb-8 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-10"></div>
          <div className="relative px-8 py-12">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              {partner ? `${partner.company_name} - ` : ''}{category.name}
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-gray-600">{category.description}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Filters */}
          <div className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-4 space-y-4">
              <form action="" className="space-y-4">
                {/* Price Range Filter */}
                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="p-6">
                    <h2 className="text-base font-semibold text-gray-900">Price Range</h2>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="price_min" className="block text-sm font-medium text-gray-700">
                          Min Price
                        </label>
                        <input
                          type="number"
                          name="price_min"
                          id="price_min"
                          min={minPrice}
                          max={maxPrice}
                          defaultValue={resolvedSearchParams.price_min}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="price_max" className="block text-sm font-medium text-gray-700">
                          Max Price
                        </label>
                        <input
                          type="number"
                          name="price_max"
                          id="price_max"
                          min={minPrice}
                          max={maxPrice}
                          defaultValue={resolvedSearchParams.price_max}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Field Filters */}
                {customFields?.map(field => (
                  <div key={field.key} className="overflow-hidden rounded-lg bg-white shadow">
                    <div className="p-6">
                      <h2 className="text-base font-semibold text-gray-900">{field.name}</h2>
                      <div className="mt-4">
                        <select
                          name={field.key}
                          defaultValue={resolvedSearchParams[field.key] || ''}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          multiple={field.is_multi}
                        >
                          <option value="">All {field.name}s</option>
                          {Array.from(fieldValues[field.key] || []).map(value => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Apply Filters Button */}
                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="p-6">
                    <button
                      type="submit"
                      className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Products Grid */}
          <div className="mt-6 lg:col-span-9 lg:mt-0">
            {/* Active Filters */}
            {Object.keys(resolvedSearchParams).length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(resolvedSearchParams).map(([key, value]) => {
                    if (key === 'submission') return null;
                    const field = customFields?.find(f => f.key === key);
                    const label = field ? field.name : key.replace('_', ' ');
                    return (
                      <Link
                        key={key}
                        href={{
                          pathname: `/category/${category.slug}/products`,
                          query: Object.fromEntries(
                            Object.entries(resolvedSearchParams).filter(([k]) => k !== key)
                          ),
                        }}
                        className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                      >
                        {label}: {value}
                        <span className="ml-2 text-blue-600 hover:text-blue-800">×</span>
                      </Link>
                    );
                  })}
                  <Link
                    href={`/category/${category.slug}/products`}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 hover:bg-gray-200"
                  >
                    Clear all filters
                  </Link>
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products?.map((product) => (
                <Link 
                  key={product.partner_product_id || product.product_id} 
                  href={`/category/${category.slug}/products/${product.slug}`}
                  className="group relative overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-200 hover:shadow-lg"
                >
                  {/* Product Image */}
                  <div className="aspect-h-9 aspect-w-16 relative overflow-hidden bg-gray-200">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gray-100">
                        <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Price Tag */}
                    {product.price && (
                      <div className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-900 shadow-md">
                        £{product.price}
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                      {product.name}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                      {product.description}
                    </p>

                    {/* Specifications Preview */}
                    {product.specifications && Object.keys(product.specifications).length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Key Features
                        </h4>
                        <dl className="mt-2 space-y-1">
                          {Object.entries(product.specifications).slice(0, 3).map(([key, value]) => (
                            <div key={key} className="flex items-center text-sm">
                              <dt className="font-medium text-gray-500">{key}:</dt>
                              <dd className="ml-2 text-gray-700">{value as string}</dd>
                            </div>
                          ))}
                        </dl>
                        {Object.keys(product.specifications).length > 3 && (
                          <p className="mt-2 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                            View all specifications →
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* No Products Message */}
            {(!products || products.length === 0) && (
              <div className="rounded-lg bg-white px-6 py-12 text-center shadow-sm">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No products available</h3>
                <p className="mt-2 text-gray-600">
                  {partner 
                    ? `${partner.company_name} hasn't added any products in this category yet.`
                    : 'Check back later for updates to our product catalog.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 