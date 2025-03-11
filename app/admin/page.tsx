// app/admin/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export const metadata = {
  title: 'Admin Dashboard | Nu-Home',
  description: 'Manage Nu-Home quote form system',
};

export default async function AdminDashboard() {
  try {
    const supabase = await createClient();
    
    // Get counts for dashboard
    const { count: questionsCount } = await supabase
      .from('FormQuestions')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);
    
    const { count: categoriesCount } = await supabase
      .from('ServiceCategories')
      .select('*', { count: 'exact', head: true });
    
    const { count: submissionsCount } = await supabase
      .from('QuoteSubmissions')
      .select('*', { count: 'exact', head: true });
    
    const { count: newSubmissionsCount } = await supabase
      .from('QuoteSubmissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new');
    
    // Get recent submissions
    const { data: recentSubmissions } = await supabase
      .from('QuoteSubmissions')
      .select(`
        *,
        ServiceCategories (
          name
        )
      `)
      .order('submission_date', { ascending: false })
      .limit(5);
    
    return (
      <div className="flex flex-col h-full">
      

        <div className='border-b bg-white' >
          <div className="flex justify-between items-center px-4 py-2">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-800">Admin Dashboard</h1>
            </div>
          </div>
        </div>
        
        <div className='flex-grow overflow-auto bg-gray-50 p-6 justify-center align-middle'>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Questions Card */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Questions
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {questionsCount || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200">
              <div className="text-sm">
                <Link href="/admin/form-questions" className="font-medium text-blue-600 hover:text-blue-500">
                  View all questions
                </Link>
              </div>
            </div>
          </div>

          {/* Categories Card */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Service Categories
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {categoriesCount || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200">
              <div className="text-sm">
                <Link href="/admin/service-categories" className="font-medium text-blue-600 hover:text-blue-500">
                  View all categories
                </Link>
              </div>
            </div>
          </div>

          {/* Total Submissions Card */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Submissions
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {submissionsCount || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200">
              <div className="text-sm">
                <Link href="/admin/quote-submissions" className="font-medium text-blue-600 hover:text-blue-500">
                  View all submissions
                </Link>
              </div>
            </div>
          </div>

          {/* New Submissions Card */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      New Submissions
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {newSubmissionsCount || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200">
              <div className="text-sm">
                <Link href="/admin/quote-submissions?status=new" className="font-medium text-blue-600 hover:text-blue-500">
                  View new submissions
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Submissions */}
        <div className="bg-white border border-gray-200 rounded-md mb-8">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Recent Quote Submissions</h2>
              <p className="mt-1 text-sm text-gray-500">Latest quote requests from customers.</p>
            </div>
            <Link href="/admin/quote-submissions" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3 bg-gray-50">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentSubmissions && recentSubmissions.length > 0 ? (
                  recentSubmissions.map((submission) => (
                    <tr key={submission.submission_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {submission.first_name} {submission.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {submission.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{submission.ServiceCategories?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(submission.submission_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(submission.submission_date).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${submission.status === 'new' ? 'bg-green-100 text-green-800' : 
                            submission.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                            submission.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'}`
                        }>
                          {submission.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/admin/quote-submissions/${submission.submission_id}`} className="text-blue-600 hover:text-blue-700">
                          View
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
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-gray-500">Common admin tasks you might want to perform.</p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/admin/form-questions/new" className="group block">
                <div className="p-5 border border-gray-200 rounded-md hover:border-blue-300 transition-colors duration-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 rounded-md p-3 group-hover:bg-blue-200 transition-colors duration-200">
                      <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Add New Question</h3>
                      <p className="mt-1 text-sm text-gray-500">Create a new question for one of your forms.</p>
                    </div>
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/service-categories/new" className="group block">
                <div className="p-5 border border-gray-200 rounded-md hover:border-green-300 transition-colors duration-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-100 rounded-md p-3 group-hover:bg-green-200 transition-colors duration-200">
                      <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Add Service Category</h3>
                      <p className="mt-1 text-sm text-gray-500">Create a new service category.</p>
                    </div>
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/quote-submissions?status=new" className="group block">
                <div className="p-5 border border-gray-200 rounded-md hover:border-purple-300 transition-colors duration-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-purple-100 rounded-md p-3 group-hover:bg-purple-200 transition-colors duration-200">
                      <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Process New Submissions</h3>
                      <p className="mt-1 text-sm text-gray-500">Review and process new quote requests.</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        </div>


      </div>
    );
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    
    // Fallback UI in case of errors
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading dashboard
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the admin dashboard. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900">Admin Navigation</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link href="/admin/form-questions" className="rounded-md bg-white px-6 py-5 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                <div className="font-medium text-gray-900">Form Questions</div>
                <div className="mt-2 text-sm text-gray-500">Manage form questions</div>
              </Link>
              
              <Link href="/admin/quote-submissions" className="rounded-md bg-white px-6 py-5 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                <div className="font-medium text-gray-900">Quote Submissions</div>
                <div className="mt-2 text-sm text-gray-500">View user submissions</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
}