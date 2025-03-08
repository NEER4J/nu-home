// app/admin/form-questions/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { AdminFilterControls } from '@/components/admin/FilterControls';
import { DeleteQuestionButton } from '@/components/admin/DeleteQuestionButton';

export const metadata = {
  title: 'Form Question Management | Nu-Home Admin',
  description: 'Manage form questions for quote submission forms'
};

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
    
    // Base query for questions
    let query = supabase
      .from('FormQuestions')
      .select(`
        *,
        ServiceCategories (
          name
        )
      `)
      .eq('is_deleted', false);
    
    // Apply filters based on searchParams
    if (searchParams.category) {
      query = query.eq('service_category_id', searchParams.category);
    }
    
    if (searchParams.status) {
      query = query.eq('status', searchParams.status);
    }
    
    // Fetch filtered questions
    const { data: questions } = await query
      .order('service_category_id')
      .order('step_number')
      .order('display_order_in_step');
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Form Question Management</h1>
          <Link
            href="/admin/form-questions/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Add New Question
          </Link>
        </div>
        
        {/* Filter by Service Category */}
        <div className="mb-6 bg-white p-4 rounded-md shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Filter Questions</h2>
          <AdminFilterControls 
            categories={categories || []} 
            selectedCategory={searchParams.category || ''} 
            selectedStatus={searchParams.status || ''} 
          />
        </div>
        
        {/* Questions Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {questions?.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500">
                No questions found. Create your first question!
              </li>
            ) : (
              questions?.map((question) => (
                <li key={question.question_id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className={`h-2.5 w-2.5 rounded-full mr-2 ${
                          question.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {question.question_text}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-1">
                          {question.ServiceCategories?.name}
                        </span>
                        <span className="mr-2 mb-1">
                          Step {question.step_number} (Order: {question.display_order_in_step})
                        </span>
                        <span className="mr-2 mb-1">
                          {question.is_multiple_choice ? 'Multiple Choice' : 'Text Input'}
                        </span>
                        {question.is_multiple_choice && question.allow_multiple_selections && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2 mb-1">
                            Multiple Selections
                          </span>
                        )}
                        {question.is_required && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2 mb-1">
                            Required
                          </span>
                        )}
                        {question.has_helper_video && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-2 mb-1">
                            Has Video
                          </span>
                        )}
                      </div>
                      {question.conditional_display && (
                        <div className="mt-1 text-xs text-gray-500">
                          <span className="font-medium">Conditional Display:</span> Shows when question {question.conditional_display.dependent_on_question_id.substring(0, 8)}... 
                          is {question.conditional_display.logical_operator === 'OR' ? 'any of' : 'all of'} {question.conditional_display.show_when_answer_equals.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                      <Link
                        href={`/admin/form-questions/${question.question_id}`}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 mr-2"
                      >
                        Edit
                      </Link>
                      <DeleteQuestionButton 
                        questionId={question.question_id} 
                        questionText={question.question_text}
                      />
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering admin form questions page:', error);
    
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