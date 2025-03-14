import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import QuoteForm from '@/components/QuoteForm'; 
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  // Await the params object
  const resolvedParams = await params;
  
  const supabase = await createClient();
  const { data: category } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .eq('is_active', true)
    .single();

  if (!category) {
    return {
      title: 'Service Not Found',
      description: 'The requested service category could not be found'
    };
  }

  return {
    title: `${category.name} Quote | Nu-Home`,
    description: `Get a quote for ${category.name} services. ${category.description || ''}`
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

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  // Await the params object
  const resolvedParams = await params;
  
  const supabase = await createClient();
  const { data: category } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .eq('is_active', true)
    .single();

  if (!category) {
    notFound();
  }

  // Default form behavior values if not set in the database
  const showThankYou = category.show_thank_you ?? true;
  const redirectToProducts = category.redirect_to_products ?? false;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="">
          {/* Quote form section with enhanced styling */}
          <div className="p-6">
            {/* QuoteForm is a client component, so pass the behavior settings from the category */}
            <QuoteForm 
              serviceCategoryId={category.service_category_id} 
              serviceCategorySlug={category.slug}
              redirectToProducts={redirectToProducts}
              showThankYouMessage={showThankYou}
            />
          </div>
        </div>
      </div>
    </div>
  );
}