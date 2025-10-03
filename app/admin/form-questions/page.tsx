// app/admin/form-questions/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import SimpleFormQuestionsEditor from '@/components/admin/SimpleFormQuestionsEditor';

export const metadata = {
  title: 'Form Question Management | Quote AI Admin',
  description: 'Manage form questions with an interactive visual editor'
};

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default async function AdminFormQuestionsPage({
  searchParams
}: {
  searchParams: { category?: string; status?: string }
}) {
  try {
    const supabase = await createClient();
    
    // Fetch all service categories
    const { data: categories } = await supabase
      .from('ServiceCategories')
      .select('*')
      .order('name');
    
    // Fetch all partners
    const { data: partners } = await supabase
      .from('UserProfiles')
      .select('user_id, company_name, contact_person, status')
      .eq('role', 'partner')
      .eq('status', 'active')
      .order('company_name');
    
    return (
      <div className="h-100">
        <SimpleFormQuestionsEditor 
          initialCategories={categories || []} 
          initialPartners={partners || []}
        />
      </div>
    );
  } catch (error) {
    console.error('Error rendering admin form questions page:', error);
    
    // Fallback UI in case of errors
    return (
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Unable to load form questions
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the form questions. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Return to Home
        </Link>
      </div>
    );
  }
}