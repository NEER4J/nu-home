import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import LeadFilters from '@/components/partner/LeadFilters';
import LeadCard from '@/components/partner/LeadCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

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

interface LeadData {
  submission_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  city?: string;
  postcode: string;
  submission_date: string;
  status: string;
  progress_step: string;
  payment_status: string;
  payment_method?: string;
  service_category_id: string;
  ServiceCategories?: {
    name: string;
    slug: string;
  };
  product_info?: any;
  addon_info?: any[];
  bundle_info?: any[];
  address_line_1?: string;
  formatted_address?: string;
  lead_submission_data?: {
    quote_data?: any;
    products_data?: any;
    addons_data?: any;
    survey_data?: any;
    checkout_data?: any;
    enquiry_data?: any;
    success_data?: any;
    last_activity_at?: string;
    current_page?: string;
    pages_completed?: string[];
  };
}

export const metadata = {
  title: 'My Leads | Quote AI Partner',
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
    const searchQuery = searchParams.search as string || '';
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
    
    // Apply search filter to count query
    if (searchQuery) {
      countQuery = countQuery.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,postcode.ilike.%${searchQuery}%`);
    }
    
    // Get count separately first
    const { count } = await countQuery;
    
    // Base query for data with joined lead_submission_data
    let dataQuery = supabase
      .from('partner_leads')
      .select(`
        *,
        ServiceCategories (
          name,
          slug
        ),
        lead_submission_data (
          quote_data,
          products_data,
          addons_data,
          survey_data,
          checkout_data,
          enquiry_data,
          success_data,
          last_activity_at,
          current_page,
          pages_completed
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
    
    // Apply search filter to data query
    if (searchQuery) {
      dataQuery = dataQuery.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,postcode.ilike.%${searchQuery}%`);
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
          <div className="flex justify-between items-center px-4 py-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">My Leads</h1>
              <Badge variant="secondary" className="ml-2">
                {count || 0} total
              </Badge>
            </div>
          </div>
        </div>

        <div className='flex-grow overflow-auto bg-gray-50 pt-6'>
          {/* Filters */}
          <div className="mb-6">
            <LeadFilters 
              statusFilter={statusFilter}
              categoryFilter={categoryFilter}
              searchQuery={searchQuery}
              categories={categories}
            />
          </div>

          {/* Leads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads && leads.length > 0 ? (
              leads.map((lead: LeadData) => (
                <LeadCard key={lead.submission_id} lead={lead} />
              ))
            ) : (
              <div className="col-span-full">
                <Card>
                  <CardContent className="text-center py-12">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
                    <p className="text-gray-500">Try adjusting your filters or check back later.</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <Link
                  href={`/partner/leads?page=${page > 1 ? page - 1 : 1}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Previous
                </Link>
                <Link
                  href={`/partner/leads?page=${page < totalPages ? page + 1 : totalPages}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
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
                      href={`/partner/leads?page=${page > 1 ? page - 1 : 1}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
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
                            href={`/partner/leads?page=${pageNum}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
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
                      href={`/partner/leads?page=${page < totalPages ? page + 1 : totalPages}${statusFilter ? `&status=${statusFilter}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
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
    );
  } catch (error) {
    console.error('Error:', error);
    return <div>Error loading leads. Please try again later.</div>;
  }
}