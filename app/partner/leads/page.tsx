import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import LeadFilters from '@/components/partner/LeadFilters';

interface Category {
  service_category_id: string;
  name: string;
}

interface ServiceCategoryAccess {
  ServiceCategories: {
    service_category_id: string;
    name: string;
  };
}

export const metadata = {
  title: 'My Leads | Nu-Home Partner',
  description: 'View and manage your leads'
};

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default async function PartnerLeadsPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  try {
    // Get filter parameters
    const statusFilter = searchParams.status as string || '';
    const categoryFilter = searchParams.category as string || '';
    const page = parseInt(searchParams.page as string || '1', 10);
    const pageSize = 10;
    
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return <div>Please sign in to view your leads.</div>;
    }
    
    // Fetch categories that the partner has access to
    const { data: partnerCategories } = await supabase
      .from('UserCategoryAccess')
      .select(`
        ServiceCategories (
          service_category_id,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'approved') as { data: ServiceCategoryAccess[] | null };
      
    const categories: Category[] = (partnerCategories || []).map(pc => ({
      service_category_id: pc.ServiceCategories.service_category_id,
      name: pc.ServiceCategories.name
    }));
      
    // Base query for count
    let countQuery = supabase
      .from('partner_leads')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_partner_id', user.id); // Only count leads assigned to this partner
    
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
      .from('partner_leads')
      .select(`
        *,
        ServiceCategories (
          name,
          slug
        )
      `)
      .eq('assigned_partner_id', user.id) // Only get leads assigned to this partner
      .order('submission_date', { ascending: false });
    
    // Apply filters to data query
    if (statusFilter) {
      dataQuery = dataQuery.eq('status', statusFilter);
    }
    
    if (categoryFilter) {
      dataQuery = dataQuery.eq('service_category_id', categoryFilter);
    }
    
    // Apply pagination
    const { data: leads, error } = await dataQuery
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / pageSize);
    
    return (
      <div className="flex flex-col h-full">
        <div className='border-b bg-white'>
          <div className="flex justify-between items-center px-4 py-2">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-800">My Leads</h1>
            </div>
          </div>
        </div>

        <div className='flex-grow overflow-auto bg-gray-50 p-6 justify-center align-middle'>
          {/* Filters */}
          <LeadFilters 
            statusFilter={statusFilter}
            categoryFilter={categoryFilter}
            categories={categories}
          />

          {/* Leads Table */}
          <div className="bg-white overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead Info
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
                  {leads && leads.length > 0 ? (
                    leads.map((lead) => (
                      <tr key={lead.submission_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">
                            ID: {lead.submission_id.substring(0, 8)}...
                          </div>
                          <div className="text-sm text-gray-500">
                            Date: {new Date(lead.submission_date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            Time: {new Date(lead.submission_date).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                              {lead.email}
                            </a>
                          </div>
                          {lead.phone && (
                            <div className="text-sm text-gray-500">
                              <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
                                {lead.phone}
                              </a>
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            {lead.city ? `${lead.city}, ` : ''}{lead.postcode}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">
                            {lead.ServiceCategories?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lead.form_answers?.length || 0} form answers
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${lead.status === 'new' ? 'bg-green-100 text-green-800' : 
                              lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                              lead.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                              lead.status === 'converted' ? 'bg-yellow-100 text-yellow-800' :
                              lead.status === 'lost' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'}`
                          }>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <Link href={`/partner/leads/${lead.submission_id}`} className="text-blue-600 hover:text-blue-900">
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No leads found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Link
                    href={`/partner/leads?page=${page > 1 ? page - 1 : 1}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Previous
                  </Link>
                  <Link
                    href={`/partner/leads?page=${page < totalPages ? page + 1 : totalPages}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Next
                  </Link>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{Math.min((page - 1) * pageSize + 1, count || 0)}</span> to <span className="font-medium">{Math.min(page * pageSize, count || 0)}</span> of{' '}
                      <span className="font-medium">{count}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md -space-x-px" aria-label="Pagination">
                      <Link
                        href={`/partner/leads?page=${page > 1 ? page - 1 : 1}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </Link>
                      
                      {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        const showEllipsis = totalPages > 7;
                        
                        // Always show first page, last page, current page and pages around current
                        const showPage = pageNum === 1 || 
                                        pageNum === totalPages || 
                                        (pageNum >= page - 1 && pageNum <= page + 1) ||
                                        (!showEllipsis);
                        
                        if (showPage) {
                          return (
                            <Link
                              key={pageNum}
                              href={`/partner/leads?page=${pageNum}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                              className={`relative inline-flex items-center px-4 py-2 border ${
                                page === pageNum ? 'bg-blue-50 border-blue-500 text-blue-600 z-10' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              } text-sm font-medium`}
                            >
                              {pageNum}
                            </Link>
                          );
                        }
                        
                        return null;
                      })}
                      
                      <Link
                        href={`/partner/leads?page=${page < totalPages ? page + 1 : totalPages}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error:', error);
    return <div>Error loading leads. Please try again later.</div>;
  }
} 