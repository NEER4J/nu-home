// app/admin/quote-submissions/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import SubmissionFilters from '@/components/admin/SubmissionFilters';

export const metadata = {
  title: 'Quote Submissions | Nu-Home Admin',
  description: 'Manage customer quote submissions'
};

export default async function QuoteSubmissionsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  try {
    // Resolve the searchParams Promise
    const resolvedSearchParams = await searchParams;
    
    // Get filter parameters
    const statusFilter = resolvedSearchParams.status as string || '';
    const categoryFilter = resolvedSearchParams.category as string || '';
    const page = parseInt(resolvedSearchParams.page as string || '1', 10);
    const pageSize = 10;
    
    const supabase = await createClient();
    
    // Fetch all service categories for filter dropdown
    const { data: categories } = await supabase
      .from('ServiceCategories')
      .select('*')
      .order('name');
      
    // Base query for count
    let countQuery = supabase
      .from('QuoteSubmissions')
      .select('*', { count: 'exact', head: true });
    
    // Apply filters to count query
    if (statusFilter) {
      countQuery = countQuery.eq('status', statusFilter);
    }
    
    if (categoryFilter) {
      countQuery = countQuery.eq('service_category_id', categoryFilter);
    }
    
    // Get count separately first
    const { count } = await countQuery;
    
    // Base query for data
    let dataQuery = supabase
      .from('QuoteSubmissions')
      .select(`
        *,
        ServiceCategories (
          name,
          slug
        )
      `)
      .order('submission_date', { ascending: false });
    
    // Apply filters to data query
    if (statusFilter) {
      dataQuery = dataQuery.eq('status', statusFilter);
    }
    
    if (categoryFilter) {
      dataQuery = dataQuery.eq('service_category_id', categoryFilter);
    }
    
    // Apply pagination
    const { data: submissions, error } = await dataQuery
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / pageSize);
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Quote Submissions</h1>
        </div>
        
        {/* Filters - Now a client component */}
        <SubmissionFilters 
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          categories={categories || []}
        />
        
        {/* Submissions Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submission Info
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions && submissions.length > 0 ? (
                  submissions.map((submission) => (
                    <tr key={submission.submission_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">
                          ID: {submission.submission_id.substring(0, 8)}...
                        </div>
                        <div className="text-sm text-gray-500">
                          Date: {new Date(submission.submission_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Time: {new Date(submission.submission_date).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {submission.first_name} {submission.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          <a href={`mailto:${submission.email}`} className="hover:text-blue-600">
                            {submission.email}
                          </a>
                        </div>
                        {submission.phone && (
                          <div className="text-sm text-gray-500">
                            <a href={`tel:${submission.phone}`} className="hover:text-blue-600">
                              {submission.phone}
                            </a>
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          {submission.city ? `${submission.city}, ` : ''}{submission.postcode}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">
                          {submission.ServiceCategories?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {submission.form_answers?.length || 0} form answers
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${submission.status === 'new' ? 'bg-green-100 text-green-800' : 
                            submission.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                            submission.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                            submission.status === 'disqualified' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'}`
                        }>
                          {submission.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <Link href={`/admin/quote-submissions/${submission.submission_id}`} className="text-blue-600 hover:text-blue-900 mr-3">
                          View
                        </Link>
                        <Link href={`/admin/quote-submissions/${submission.submission_id}/edit`} className="text-green-600 hover:text-green-900">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No submissions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination - We need to keep these as links without client-side interactivity */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <a
                  href={`/admin/quote-submissions?page=${page > 1 ? page - 1 : 1}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Previous
                </a>
                <a
                  href={`/admin/quote-submissions?page=${page < totalPages ? page + 1 : totalPages}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Next
                </a>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{Math.min((page - 1) * pageSize + 1, count || 0)}</span> to <span className="font-medium">{Math.min(page * pageSize, count || 0)}</span> of{' '}
                    <span className="font-medium">{count}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <a
                      href={`/admin/quote-submissions?page=${page > 1 ? page - 1 : 1}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </a>
                    
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      const showEllipsis = totalPages > 7;
                      
                      // Always show first page, last page, current page and pages around current
                      const showPage = pageNum === 1 || 
                                      pageNum === totalPages || 
                                      (pageNum >= page - 1 && pageNum <= page + 1) ||
                                      (!showEllipsis);
                                      
                      // Show ellipsis after first page if current page > 3
                      const showFirstEllipsis = showEllipsis && pageNum === 2 && page > 3;
                      
                      // Show ellipsis before last page if current page < totalPages - 2
                      const showLastEllipsis = showEllipsis && pageNum === totalPages - 1 && page < totalPages - 2;
                      
                      if (showFirstEllipsis || showLastEllipsis) {
                        return (
                          <span key={`ellipsis-${pageNum}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        );
                      }
                      
                      if (showPage) {
                        return (
                          <a
                            key={pageNum}
                            href={`/admin/quote-submissions?page=${pageNum}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                            className={`relative inline-flex items-center px-4 py-2 border ${
                              page === pageNum ? 'bg-blue-50 border-blue-500 text-blue-600 z-10' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            } text-sm font-medium`}
                          >
                            {pageNum}
                          </a>
                        );
                      }
                      
                      return null;
                    })}
                    
                    <a
                      href={`/admin/quote-submissions?page=${page < totalPages ? page + 1 : totalPages}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </a>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading quote submissions:', error);
    
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
                Unable to load submissions
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the quote submissions. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }
}