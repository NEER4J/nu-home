// app/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';


export const metadata = {
  title: 'Nu-Home | Home Improvement Quote System',
  description: 'Get free, no-obligation quotes for home improvement services including EV chargers, solar panels, heating, cooling and more.'
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <div className="bg-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Improve Your Home
            </h1>
            <p className="mt-6 text-xl text-blue-100 max-w-3xl mx-auto">
              Connect with trusted local providers for all your home improvement needs.
              Get free, no-obligation quotes in minutes.
            </p>
           
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">Our Services</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Select a service to get started with your free quote
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories?.map((category) => (
            <Link 
              key={category.service_category_id} 
              href={`/services/${category.slug}`}
              className="group"
            >
              <div className="bg-white rounded-lg -md overflow-hidden hover:-lg transition- duration-300">
                <div className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    {category.icon_url ? (
                      <img 
                        src={category.icon_url} 
                        alt={category.name} 
                        className="w-6 h-6" 
                      />
                    ) : (
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="mt-2 text-gray-600">
                      {category.description.length > 120
                        ? `${category.description.substring(0, 120)}...`
                        : category.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center text-blue-600">
                    <span className="text-sm font-medium">Get a free quote</span>
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      

      {/* Call to Action */}
      <div className="bg-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to improve your home?</h2>
          <p className="mt-4 text-xl text-blue-100 max-w-2xl mx-auto">
            Get started with a free, no-obligation quote today
          </p>
         
        </div>
      </div>
    </div>
  );
}