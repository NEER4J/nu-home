// app/admin/form-questions/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export const metadata = {
  title: 'Form Question Management | Nu-Home Admin',
  description: 'Manage form questions for quote submission forms'
};

export default async function AdminFormQuestionsPage() {
  try {
    const supabase = createClient();
    
    // Fetch all service categories
    const { data: categories } = await supabase
      .from('ServiceCategories')
      .select('*')
      .order('name');
    
    // Fetch all questions with their related service category
    const { data: questions } = await supabase
      .from('FormQuestions')
      .select(`
        *,
        ServiceCategories (
          name
        )
      `)
      .eq('is_deleted', false)
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Service Category
              </label>
              <select
                id="category-filter"
                name="category"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                defaultValue=""
              >
                <option value="">All Categories</option>
                {categories?.map((category) => (
                  <option key={category.service_category_id} value={category.service_category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                name="status"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                defaultValue="active"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
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
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                          {question.ServiceCategories?.name}
                        </span>
                        <span className="mr-2">
                          Step {question.step_number} (Order: {question.display_order_in_step})
                        </span>
                        <span className="mr-2">
                          {question.is_multiple_choice ? 'Multiple Choice' : 'Text Input'}
                        </span>
                        {question.is_required && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Required
                          </span>
                        )}
                      </div>
                      {question.conditional_display && (
                        <div className="mt-1 text-xs text-gray-500">
                          <span className="font-medium">Conditional Display:</span> Shows when question {question.conditional_display.dependent_on_question_id.substring(0, 8)}... 
                          is {question.conditional_display.logical_operator} {question.conditional_display.show_when_answer_equals.join(', ')}
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
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </button>
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