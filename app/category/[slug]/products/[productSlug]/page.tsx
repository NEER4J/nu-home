import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';

interface PageParams {
  slug: string;
  productSlug: string;
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<PageParams>;
}): Promise<Metadata> {
  // Resolve the params Promise
  const resolvedParams = await params;
  const supabase = await createClient();

  // Get the category
  const { data: category } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .single();

  if (!category) {
    return {
      title: 'Category Not Found',
      description: 'The requested category could not be found'
    };
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

  // Get the product
  let product = null;

  if (partner) {
    const { data: partnerProduct } = await supabase
      .from('PartnerProducts')
      .select(`
        *,
        service_category:service_category_id (
          name,
          slug
        )
      `)
      .eq('slug', resolvedParams.productSlug)
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', category.service_category_id)
      .single();
    
    product = partnerProduct;
  }

  // If no partner product found, try base product
  if (!product) {
    const { data: baseProduct } = await supabase
      .from('Products')
      .select(`
        *,
        service_category:service_category_id (
          name,
          slug
        )
      `)
      .eq('slug', resolvedParams.productSlug)
      .eq('service_category_id', category.service_category_id)
      .eq('is_active', true)
      .single();
    
    product = baseProduct;
  }

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found'
    };
  }

  return {
    title: partner 
      ? `${product.name} - ${partner.company_name}`
      : product.name,
    description: product.description
  };
}

export default async function ProductPage({ 
  params 
}: { 
  params: Promise<PageParams>;
}) {
  // Resolve the params Promise
  const resolvedParams = await params;
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

  // Get the product
  let product = null;

  if (partner) {
    const { data: partnerProduct } = await supabase
      .from('PartnerProducts')
      .select(`
        *,
        service_category:service_category_id (
          name,
          slug
        )
      `)
      .eq('slug', resolvedParams.productSlug)
      .eq('partner_id', partner.user_id)
      .eq('service_category_id', category.service_category_id)
      .single();
    
    if (partnerProduct) {
      product = partnerProduct;
    }
  }

  // If no partner product found, try base product
  if (!product) {
    const { data: baseProduct } = await supabase
      .from('Products')
      .select(`
        *,
        service_category:service_category_id (
          name,
          slug
        )
      `)
      .eq('slug', resolvedParams.productSlug)
      .eq('service_category_id', category.service_category_id)
      .eq('is_active', true)
      .single();
    
    if (baseProduct) {
      product = baseProduct;
    }
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href={`/category/${category.slug}`} className="hover:text-gray-700">
                {category.name}
              </Link>
            </li>
            <li>
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <Link href={`/category/${category.slug}/products`} className="hover:text-gray-700">
                Products
              </Link>
            </li>
            <li>
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li className="font-medium text-gray-900">{product.name}</li>
          </ol>
        </nav>

        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
          {/* Product Image */}
          <div className="aspect-h-9 aspect-w-10 relative overflow-hidden rounded-lg bg-gray-100 lg:col-span-1">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="h-full w-full object-contain object-center max-h-[300px]"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <svg className="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="mt-8 lg:col-span-1 lg:mt-0">
            <div className="space-y-6">
              {/* Title and Price */}
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{product.name}</h1>
                {product.price && (
                  <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">£{product.price}</p>
                )}
              </div>

              {/* Description */}
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-600">{product.description}</p>
              </div>

              {/* Partner Info if available */}
              {partner && (
                <div className="rounded-lg bg-gray-50 p-6">
                  <div className="flex items-center space-x-4">
                    {partner.logo_url ? (
                      <img 
                        src={partner.logo_url} 
                        alt={partner.company_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <span className="text-lg font-semibold text-blue-600">
                          {partner.company_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{partner.company_name}</h3>
                      <p className="text-sm text-gray-600">Authorized Dealer</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col space-y-4">
                <Link
                  href={`/category/${category.slug}/quote?product=${product.product_id || product.partner_product_id}`}
                  className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-8 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Request Quote
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Contact Supplier
                </button>
              </div>
            </div>

            {/* Specifications and Additional Info */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              {/* Specifications */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900">Specifications</h2>
                  <dl className="mt-4 space-y-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 px-4 py-3">
                        <dt className="text-sm font-medium text-gray-500">{key}</dt>
                        <dd className="col-span-2 text-sm text-gray-900">{value as string}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Additional Information */}
              {product.product_fields && Object.keys(product.product_fields).length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
                  <dl className="mt-4 space-y-4">
                    {Object.entries(product.product_fields).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 px-4 py-3">
                        <dt className="text-sm font-medium text-gray-500">{key}</dt>
                        <dd className="col-span-2 text-sm text-gray-900">{value as string}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 