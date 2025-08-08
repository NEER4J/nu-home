import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Metadata } from 'next';

interface SearchParams {
  profile_id?: string;
  [key: string]: string | string[] | undefined;
}

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export async function generateMetadata({ 
  searchParams 
}: { 
  searchParams: SearchParams;
}): Promise<Metadata> {
  
  const supabase = await createClient();

  // Get partner info if profile_id is provided
  let title = 'Product Categories | Nu-Home';
  let description = 'Browse product categories from our partners';

  if (searchParams.profile_id) {
    const { data: partner } = await supabase
      .from('UserProfiles')
      .select('company_name')
      .eq('user_id', searchParams.profile_id)
      .single();

    if (partner) {
      title = `Product Categories | ${partner.company_name}`;
      description = `Browse product categories from ${partner.company_name}`;
    }
  }

  return {
    title,
    description
  };
}

export default async function CategoryPage({ 
  searchParams 
}: { 
  searchParams: SearchParams;
}) {
  
  const supabase = await createClient();

  // Get categories
  const { data: categories } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  // Get partner info if profile_id is provided
  let partner = null;
  if (searchParams.profile_id) {
    const { data: partnerData } = await supabase
      .from('UserProfiles')
      .select('*')
      .eq('user_id', searchParams.profile_id)
      .single();
    
    if (partnerData) {
      partner = partnerData;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {partner ? `Get a Quote from ${partner.company_name}` : 'Our Services'}
        </h1>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories?.map((category) => (
            <div
              key={category.service_category_id}
              className="relative group bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-200"
            >
              <div className="aspect-h-9 aspect-w-16 relative overflow-hidden rounded-t-lg">
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                    <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                  {category.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {category.description}
                </p>
                <div className="mt-4">
                  <a
                    href={`/category/${category.slug}/quote${resolvedSearchParams.profile_id ? `?profile_id=${resolvedSearchParams.profile_id}` : ''}`}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Get a Quote
                  </a>
                  <a
                    href={`/category/${category.slug}/products${resolvedSearchParams.profile_id ? `?profile_id=${resolvedSearchParams.profile_id}` : ''}`}
                    className="ml-4 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Products
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}