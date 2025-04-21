import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import QuoteForm from '@/components/QuoteForm';

interface SearchParams {
  profile_id?: string;
  category_slug?: string;
  [key: string]: string | string[] | undefined;
}

export async function generateMetadata({ 
  searchParams 
}: { 
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  // Resolve the searchParams Promise
  const resolvedSearchParams = await searchParams;
  
  const supabase = await createClient();
  
  if (!resolvedSearchParams.profile_id || !resolvedSearchParams.category_slug) {
    return {
      title: 'Products Not Found',
      description: 'The requested products could not be found'
    };
  }

  // Get partner info
  const { data: partner } = await supabase
    .from('UserProfiles')
    .select('*')
    .eq('user_id', resolvedSearchParams.profile_id)
    .single();

  // Get category info
  const { data: category } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', resolvedSearchParams.category_slug)
    .eq('is_active', true)
    .single();

  if (!category || !partner) {
    return {
      title: 'Products Not Found',
      description: 'The requested products could not be found'
    };
  }

  return {
    title: `${category.name} Products | ${partner.company_name}`,
    description: `Browse ${category.name} products from ${partner.company_name}. ${category.description || ''}`
  };
}

export default async function ProductsPage({ 
  searchParams 
}: { 
  searchParams: Promise<SearchParams>;
}) {
  // Resolve the searchParams Promise
  const resolvedSearchParams = await searchParams;
  
  const supabase = await createClient();

  // Get partner info if profile_id is provided
  let partner = null;
  if (resolvedSearchParams.profile_id) {
    const { data: partnerData } = await supabase
      .from('UserProfiles')
      .select('*')
      .eq('user_id', resolvedSearchParams.profile_id)
      .single();
    
    if (partnerData) {
      partner = partnerData;
    }
  }

  // Get category if category_slug is provided
  let category = null;
  if (resolvedSearchParams.category_slug) {
    const { data: categoryData } = await supabase
      .from('ServiceCategories')
      .select('*')
      .eq('slug', resolvedSearchParams.category_slug)
      .single();
    
    if (categoryData) {
      category = categoryData;
    }
  }

  // Get products based on partner and category
  let query = supabase
    .from(partner ? 'PartnerProducts' : 'Products')
    .select(`
      *,
      service_category:service_category_id (
        name,
        slug
      )
    `);

  if (category) {
    query = query.eq('service_category_id', category.service_category_id);
  }

  if (partner) {
    query = query.eq('partner_id', partner.user_id);
  } else {
    query = query.eq('is_active', true);
  }

  const { data: products } = await query.order('name');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {partner 
            ? category 
              ? `${category.name} Products from ${partner.company_name}`
              : `Products from ${partner.company_name}`
            : category
              ? `${category.name} Products`
              : 'All Products'
          }
        </h1>

        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.product_id}
                className="relative group bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-200"
              >
                <div className="aspect-h-9 aspect-w-16 relative overflow-hidden rounded-t-lg">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {product.price && (
                    <div className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-900 shadow-md">
                      £{product.price}
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                    {product.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="mt-4">
                    <a
                      href={`/products/${product.slug}`}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Details
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {partner 
                ? `No products available from ${partner.company_name}${category ? ` in ${category.name}` : ''}`
                : `No products available${category ? ` in ${category.name}` : ''}`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 