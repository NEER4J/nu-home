// app/admin/form-questions/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EditQuestionForm from '@/components/admin/EditQuestionForm';

export const metadata = {
  title: 'Edit Question | Nu-Home Admin',
  description: 'Edit an existing form question'
};

export default async function EditFormQuestionPage({
  params
}: {
  params: { id: string }
}) {
  try {
    const supabase = createClient();
    
    // Fetch the question to edit
    const { data: question, error } = await supabase
      .from('FormQuestions')
      .select('*')
      .eq('question_id', params.id)
      .single();
    
    if (error || !question) {
      notFound();
    }
    
    // Fetch all service categories for the dropdown
    const { data: categories } = await supabase
      .from('ServiceCategories')
      .select('*')
      .order('name');
    
    // Get questions for conditional logic
    const { data: conditionalQuestions } = await supabase
      .from('FormQuestions')
      .select('question_id, question_text, step_number, is_multiple_choice, answer_options')
      .eq('service_category_id', question.service_category_id)
      .eq('status', 'active')
      .lt('step_number', question.step_number)
      .order('step_number');
    
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>
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
            <EditQuestionForm 
              question={question} 
              categories={categories || []}
              conditionalQuestions={conditionalQuestions || []}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading edit question page:', error);
    
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
                Unable to load question
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the question. Please try again later.</p>
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