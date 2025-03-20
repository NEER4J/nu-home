// app/admin/partners/requests/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { approveCategoryRequest, rejectCategoryRequest } from '@/app/actions';

export const metadata = {
  title: 'Category Requests | Nu-Home Admin',
  description: 'Manage partner category access requests',
};

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

export default async function AdminCategoryRequestsPage() {
  try {
    const supabase = await createClient();
    
    // Fetch pending category access requests without direct join to user table
    const { data: requests, error } = await supabase
      .from('UserCategoryAccess')
      .select(`
        *,
        ServiceCategory:service_category_id (
          name,
          slug
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Extract the user IDs from the requests
    const userIds = requests?.map(request => request.user_id) || [];
    
    // Get user profiles separately
    let userProfilesById: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('UserProfiles')
        .select('*')
        .in('user_id', userIds);
      
      // Create a map of user_id to profile
      profiles?.forEach(profile => {
        userProfilesById[profile.user_id] = profile;
      });
    }
    
    // Get user emails separately
    let emailsById: Record<string, string> = {};
    
    if (userIds.length > 0) {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (!authError && authUsers && authUsers.users) {
        // Create a map of user_id to email
        authUsers.users.forEach(user => {
          if (userIds.includes(user.id)) {
            emailsById[user.id] = user.email || '';
          }
        });
      }
    }
    
    // Attach the user profiles and emails to the requests
    const requestsWithProfiles = requests?.map(request => {
      const profile = userProfilesById[request.user_id] || {};
      const email = emailsById[request.user_id] || 'No email found';
      
      return {
        ...request,
        UserProfile: {
          ...profile,
          email
        }
      };
    });
    
    return (
      <div className="flex flex-col h-full">
        <div className='border-b bg-white'>
          <div className="flex justify-between items-center px-4 py-2">
            <div className="flex items-center gap-2">
              <Link 
                href="/admin/partners"
                className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                <span>Back to Partners</span>
              </Link>
            </div>
          </div>
        </div>
        
        <div className='flex-grow overflow-auto bg-gray-50 p-6 justify-center align-middle'>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Partner Category Requests</h1>
            <p className="mt-1 text-sm text-gray-500">
              Approve or reject partner requests to access service categories
            </p>
          </div>
          
          {/* Requests List */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
            {requestsWithProfiles && requestsWithProfiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Partner
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Is Primary
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {requestsWithProfiles.map((request) => (
                      <tr key={request.access_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">
                              {request.UserProfile.company_name || 'Unnamed Partner'}
                            </div>
                            <div className="text-xs text-gray-500">
                              <a href={`mailto:${request.UserProfile.email}`} className="hover:text-blue-600">
                                {request.UserProfile.email}
                              </a>
                            </div>
                            {request.UserProfile.phone && (
                              <div className="text-xs text-gray-500">
                                {request.UserProfile.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {request.ServiceCategory.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Slug: {request.ServiceCategory.slug}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(request.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {request.is_primary ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Primary
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">Secondary</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-3">
                            <form action={approveCategoryRequest}>
                              <input type="hidden" name="access_id" value={request.access_id} />
                              <button 
                                type="submit"
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Approve
                              </button>
                            </form>
                            
                            <form action={rejectCategoryRequest}>
                              <input type="hidden" name="access_id" value={request.access_id} />
                              <button 
                                type="submit"
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                Reject
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are no pending category access requests from partners.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading category requests:', error);
    
    // Fallback UI in case of errors
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Unable to load category requests
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the category requests. Please try again later.</p>
                <p className="mt-1 font-mono text-xs">{error instanceof Error ? error.message : 'Unknown error'}</p>
              </div>
            </div>
          </div>
        </div>
        <Link
          href="/admin/partners"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Return to Partners
        </Link>
      </div>
    );
  }
}