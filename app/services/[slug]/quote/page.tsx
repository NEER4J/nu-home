import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import QuoteFormWrapper from './QuoteFormWrapper';
import { headers } from 'next/headers';
import { resolvePartnerByHostname } from '@/lib/partner';

interface SearchParams {
  submission?: string;
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

  // Get partner info from hostname if available
  let partnerId = resolvedSearchParams.partner_id;
  if (resolvedSearchParams.subdomain) {
    const partner = await resolvePartnerByHostname(supabase, resolvedSearchParams.subdomain as string);

    if (partner) {
      partnerId = partner.user_id;
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

  let title = `Get a Quote for ${category.name}`;
  let description = `Request a quote for ${category.name} services.`;

  if (partnerId) {
    const { data: partner } = await supabase
      .from('UserProfiles')
      .select('company_name')
      .eq('user_id', partnerId)
      .single();

    if (partner) {
      title = `Get a Quote for ${category.name} from ${partner.company_name}`;
      description = `Request a quote for ${category.name} services from ${partner.company_name}.`;
    }
  }

  return {
    title,
    description
  };
}

export const dynamicParams = true;

export async function generateStaticParams() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('ServiceCategories')
    .select('slug')
    .eq('is_active', true);
  
  return (categories || []).map(category => ({
    slug: category.slug,
  }));
}

export default async function QuotePage({ 
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
  
  console.log('Debug - Params:', resolvedParams);
  console.log('Debug - SearchParams:', resolvedSearchParams);
  
  // Get the category
  const { data: category, error: categoryError } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .eq('is_active', true)
    .single();

  console.log('Debug - Category lookup result:', { category, error: categoryError });

  if (!category) {
    console.log('Debug - Category not found');
    notFound();
  }

  // Get the partner info from hostname
  const headersList = await headers();
  const hostname = headersList.toString().includes('host=') 
    ? headersList.toString().split('host=')[1].split(',')[0] 
    : '';
  
  let partner = null;
  if (hostname && hostname !== 'localhost') {
    partner = await resolvePartnerByHostname(supabase, hostname);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QuoteFormWrapper 
          serviceCategoryId={category.service_category_id}
          serviceCategorySlug={category.slug}
          partnerId={partner?.user_id || ''}
          showThankYou={false}
          redirectToProducts={true}
        />
      </div>
    </div>
  );
} 