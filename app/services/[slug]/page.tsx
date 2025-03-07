// app/services/[slug]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import QuoteForm from '@/components/QuoteForm'; 

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: category } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', params.slug)
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
  const supabase = createClient();
  const { data: categories } = await supabase
    .from('ServiceCategories')
    .select('slug')
    .eq('is_active', true);
  
  return (categories || []).map(category => ({
    slug: category.slug,
  }));
}

export default async function ServicePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: category } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single();

  if (!category) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        <a href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Service Information */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{category.name}</h1>
          
          {category.description && (
            <div className="prose prose-blue max-w-none mb-8">
              <p>{category.description}</p>
            </div>
          )}
          
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">Why choose Nu-Home?</h2>
            
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Trusted local providers</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Fast, no-obligation quotes</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Expert advice and support</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Satisfaction guaranteed</span>
              </li>
            </ul>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-3">How it works:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Complete the quote form with your details</li>
              <li>We'll match you with trusted local providers</li>
              <li>Receive competitive quotes within 24 hours</li>
              <li>Choose the best option for your needs</li>
            </ol>
          </div>
        </div>
        
        {/* Quote Form */}
        <div>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-blue-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Get Your Free Quote</h2>
              <p className="text-blue-100 text-sm mt-1">No obligation, competitive quotes</p>
            </div>
            
            <div className="p-6">
              <QuoteForm 
                serviceCategoryId={category.service_category_id} 
                serviceCategorySlug={category.slug}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}