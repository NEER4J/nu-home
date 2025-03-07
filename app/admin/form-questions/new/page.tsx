// app/admin/form-questions/new/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import NewQuestionForm from '@/components/admin/NewQuestionForm';

export const metadata = {
  title: 'Add New Question | Nu-Home Admin',
  description: 'Create a new question for quote forms'
};

export default async function NewFormQuestionPage() {
  try {
    const supabase = createClient();
    
    // Fetch all service categories for the dropdown
    const { data: categories } = await supabase
      .from('ServiceCategories')
      .select('*')
      .order('name');
    
    // Get the highest step number for each category to suggest next step
    const { data: maxSteps } = await supabase
      .from('FormQuestions')
      .select(`
        service_category_id,
        step_number
      `)
      .order('step_number', { ascending: false });
    
    // Create a map of category ID to highest step number
    const categoryStepMap: Record<string, number> = {};
    maxSteps?.forEach(item => {
      if (!categoryStepMap[item.service_category_id] || 
          item.step_number > categoryStepMap[item.service_category_id]) {
        categoryStepMap[item.service_category_id] = item.step_number;
      }
    });
    
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Add New Question</h1>
          <Link
            href="/admin/form-questions"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg 
              className="h-5 w-5 mr-2 -ml-1" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Questions
          </Link>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <NewQuestionForm 
              categories={categories || []} 
              categoryStepMap={categoryStepMap} 
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading new question page:', error);
    
    // Fallback UI in case of errors
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Unable to load page
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the new question form. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
        <Link
          href="/admin/form-questions"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Return to Questions
        </Link>
      </div>
    );
  }
}