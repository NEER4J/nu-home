// app/admin/partners/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Partner Management | Nu-Home Admin',
  description: 'Manage partners and their service categories',
};

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

export default async function AdminPartnersPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>
}) {
  try {
    // Resolve the searchParams Promise
    const resolvedSearchParams = await searchParams;
    
    // Get filter parameter
    const statusFilter = resolvedSearchParams.status || '';
    
    const supabase = await createClient();
    
    // Build the query - Note: We're querying UserProfiles without trying to join the auth users table directly
    let query = supabase
      .from('UserProfiles')
      .select('*')
      .eq('role', 'partner');
    
    // Apply status filter if present
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    
    // Execute the query
    const { data: partners, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Fetch user emails separately
    const userIds = partners?.map(p => p.user_id) || [];
    
    // Get all emails in a separate query
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
    
    // Fetch category requests count for each partner
    const partnerIds = partners?.map(p => p.user_id) || [];
    
    // Get category access data for all partners in one query
    const { data: allCategoryAccess } = await supabase
      .from('UserCategoryAccess')
      .select(`
        *,
        ServiceCategory:service_category_id (
          name
        )
      `)
      .in('user_id', partnerIds.length > 0 ? partnerIds : ['none']);
    
    // Organize category access by user_id
    const categoryAccessByUser: Record<string, any[]> = {};
    allCategoryAccess?.forEach(access => {
      if (!categoryAccessByUser[access.user_id]) {
        categoryAccessByUser[access.user_id] = [];
      }
      categoryAccessByUser[access.user_id].push(access);
    });
    
    // Add created_at timestamps of accounts - this is a workaround because we can't join directly
    let createdAtById: Record<string, string> = {};
    
    if (userIds.length > 0) {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (!authError && authUsers && authUsers.users) {
        // Create a map of user_id to created_at
        authUsers.users.forEach(user => {
          if (userIds.includes(user.id)) {
            createdAtById[user.id] = user.created_at || '';
          }
        });
      }
    }
    
    return (
      <div className="flex flex-col h-full">
        <div className='border-b bg-white'>
          <div className="flex justify-between items-center px-4 py-2">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-800">Partner Management</h1>
            </div>
          </div>
        </div>
        
        <div className='flex-grow overflow-auto bg-gray-50 p-6 justify-center align-middle'>
          {/* Status Filter Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <Link
                  href="/admin/partners"
                  className={`${
                    !statusFilter
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  All Partners
                </Link>
                <Link
                  href="/admin/partners?status=pending"
                  className={`${
                    statusFilter === 'pending'
                      ? 'border-yellow-500 text-yellow-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Pending Approval
                </Link>
                <Link
                  href="/admin/partners?status=active"
                  className={`${
                    statusFilter === 'active'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Active Partners
                </Link>
                <Link
                  href="/admin/partners?status=suspended"
                  className={`${
                    statusFilter === 'suspended'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Suspended
                </Link>
              </nav>
            </div>
          </div>

          {/* Partners Table */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
            {partners && partners.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Partner
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact Info
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categories
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
                    {partners.map((partner) => {
                      const partnerCategories = categoryAccessByUser[partner.user_id] || [];
                      const pendingCategoryCount = partnerCategories.filter(cat => cat.status === 'pending').length;
                      const emailAddress = emailsById[partner.user_id] || 'No email found';
                      const createdAt = createdAtById[partner.user_id] || partner.created_at;
                      
                      return (
                        <tr key={partner.profile_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {partner.company_name || 'Unnamed Partner'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Joined {new Date(createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{partner.contact_person}</div>
                            <div className="text-sm text-gray-500">
                              <a href={`mailto:${emailAddress}`} className="hover:text-blue-600">
                                {emailAddress}
                              </a>
                            </div>
                            {partner.phone && (
                              <div className="text-sm text-gray-500">
                                <a href={`tel:${partner.phone}`} className="hover:text-blue-600">
                                  {partner.phone}
                                </a>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {partnerCategories.length === 0 ? (
                                <span className="text-gray-500 italic">No categories</span>
                              ) : (
                                <div>
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    {partnerCategories
                                      .filter(cat => cat.status === 'approved')
                                      .map(cat => (
                                        <span key={cat.access_id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          {cat.ServiceCategory.name}
                                          {cat.is_primary && (
                                            <span className="ml-1 bg-green-200 px-1 py-0.5 rounded-sm text-xs">Primary</span>
                                          )}
                                        </span>
                                      ))}
                                  </div>
                                  {pendingCategoryCount > 0 && (
                                    <div className="text-xs text-yellow-600">
                                      {pendingCategoryCount} pending request{pendingCategoryCount !== 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${partner.status === 'active' ? 'bg-green-100 text-green-800' : 
                                partner.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'}`
                            }>
                              {partner.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-3">
                              <Link href={`/admin/partners/${partner.profile_id}`} className="text-blue-600 hover:text-blue-900">
                                View
                              </Link>
                              
                              {partner.status === 'pending' && (
                                <Link href={`/admin/partners/${partner.profile_id}/approve`} className="text-green-600 hover:text-green-900">
                                  Approve
                                </Link>
                              )}
                              
                              {partner.status === 'active' && (
                                <Link href={`/admin/partners/${partner.profile_id}/suspend`} className="text-red-600 hover:text-red-900">
                                  Suspend
                                </Link>
                              )}
                              
                              {partner.status === 'suspended' && (
                                <Link href={`/admin/partners/${partner.profile_id}/reactivate`} className="text-green-600 hover:text-green-900">
                                  Reactivate
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No partners found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {statusFilter ? `No partners with status "${statusFilter}"` : 'No partners have registered yet'}
                </p>
              </div>
            )}
          </div>
          
          {/* Add button for pending category requests */}
          <div className="mt-6">
            <Link 
              href="/admin/partners/requests" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <AlertCircle className="mr-2 h-5 w-5" />
              View Category Requests
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading partners page:', error);
    
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
                Unable to load partners
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the partners list. Please try again later.</p>
                <p className="mt-1 font-mono text-xs">{error instanceof Error ? error.message : 'Unknown error'}</p>
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