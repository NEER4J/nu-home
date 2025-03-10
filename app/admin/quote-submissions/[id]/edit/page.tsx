// app/admin/quote-submissions/[id]/edit/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EditSubmissionForm from '@/components/admin/EditSubmissionForm';

export const metadata = {
  title: 'Edit Quote Submission | Nu-Home Admin',
  description: 'Edit a quote submission'
};

export default async function EditSubmissionPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  try {
    // Resolve the params Promise
    const resolvedParams = await params;
    const submissionId = resolvedParams.id;
    
    const supabase = await createClient();
    
    // Fetch the submission
    const { data: submission, error } = await supabase
      .from('QuoteSubmissions')
      .select(`
        *,
        ServiceCategories (
          name,
          slug
        )
      `)
      .eq('submission_id', submissionId)
      .single();
    
    if (error || !submission) {
      notFound();
    }
    
    // Fetch all service categories for the dropdown
    const { data: categories } = await supabase
      .from('ServiceCategories')
      .select('*')
      .order('name');
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Edit Quote Submission</h1>
          <div className="flex space-x-3">
            <Link
              href={`/admin/quote-submissions/${submissionId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              View Details
            </Link>
            <Link
              href="/admin/quote-submissions"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Submissions
            </Link>
          </div>
        </div>
        
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <EditSubmissionForm 
              submission={submission} 
              categories={categories || []} 
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading submission for edit:', error);
    
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
                Unable to load submission
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the quote submission. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
        <Link
          href="/admin/quote-submissions"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Return to Submissions
        </Link>
      </div>
    );
  }
}