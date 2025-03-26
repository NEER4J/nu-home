import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { CheckCircle, Clock, XCircle, AlertTriangle, ArrowUpRight, Search } from "lucide-react";
import { updatePartnerStatus } from "../actions";

// Status count type
interface StatusCount {
  status: string;
  count: number;
}

// Partner interface
interface Partner {
  profile_id: string;
  user_id: string;
  company_name: string;
  contact_person: string;
  status: string;
  postcode: string;
  email?: string;
  created_at?: string;
}

export default async function AdminPartners({
  searchParams,
}: {
  searchParams: { status?: string; search?: string };
}) {
  const supabase = await createClient();
  
  // Get query parameters - using the await keyword explicitly
  const params = await Promise.resolve(searchParams);
  const status = params?.status || 'all';
  const search = params?.search || '';
  
  // Fetch partners with their profiles
  let query = supabase
    .from("UserProfiles")
    .select('*')
    .eq('role', 'partner');
  
  // Apply status filter
  if (status !== 'all') {
    query = query.eq('status', status);
  }
  
  // Apply search filter if present
  if (search) {
    query = query.or(`company_name.ilike.%${search}%, contact_person.ilike.%${search}%`);
  }
  
  // Execute query and order by creation date
  const { data: partners, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error fetching partners:", error);
    return <div>Error loading partners</div>;
  }

  // Get counts manually rather than using group by, which isn't well-typed
  const { data: allPartners } = await supabase
    .from("UserProfiles")
    .select('status')
    .eq('role', 'partner');
    
  // Count statuses manually
  const statusMap: Record<string, number> = {
    pending: 0,
    active: 0,
    suspended: 0
  };
  
  allPartners?.forEach(partner => {
    if (partner.status in statusMap) {
      statusMap[partner.status]++;
    }
  });
  
  // Create a map of status counts
  const counts = {
    all: partners?.length || 0,
    pending: statusMap.pending || 0,
    active: statusMap.active || 0,
    suspended: statusMap.suspended || 0
  };

  // Status styling
  const statusStyles = {
    pending: {
      icon: <Clock className="h-5 w-5 text-yellow-500" />,
      badge: <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>,
      bg: "bg-yellow-50",
      border: "border-yellow-200"
    },
    active: {
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      badge: <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>,
      bg: "bg-green-50",
      border: "border-green-200"
    },
    suspended: {
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      badge: <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Suspended</span>,
      bg: "bg-red-50",
      border: "border-red-200"
    }
  };

  const handlePartnerStatusUpdate = async (partnerId: string, newStatus: string) => {
    const formData = new FormData();
    formData.append("partner_id", partnerId);
    formData.append("status", newStatus);
    
    // This is a placeholder for the server action call
    // In a real implementation, you would call the server action here
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
        <Link 
          href="/admin/partners/metrics" 
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Performance Metrics <ArrowUpRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
      
      {/* Filter tabs */}
      <div className="mb-6">
        <nav className="flex space-x-4" aria-label="Tabs">
          <Link
            href="/admin/partners"
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              status === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Partners ({counts.all})
          </Link>
          <Link
            href="/admin/partners?status=pending"
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              status === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending ({counts.pending})
          </Link>
          <Link
            href="/admin/partners?status=active"
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active ({counts.active})
          </Link>
          <Link
            href="/admin/partners?status=suspended"
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              status === 'suspended'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Suspended ({counts.suspended})
          </Link>
        </nav>
      </div>
      
      {/* Search bar */}
      <div className="mb-6">
        <form className="flex gap-2">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search partners by name..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Search
          </button>
          {search && (
            <Link
              href={`/admin/partners${status !== 'all' ? `?status=${status}` : ''}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear
            </Link>
          )}
        </form>
      </div>
      
      {/* Partners list */}
      {partners?.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No partners found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search or filter to find what you're looking for.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {partners?.map((partner: Partner) => (
              <li key={partner.profile_id}>
                <div className={`px-6 py-4 ${statusStyles[partner.status as keyof typeof statusStyles].bg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-lg">
                            {partner.company_name?.charAt(0) || partner.email?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">{partner.company_name}</h3>
                          {statusStyles[partner.status as keyof typeof statusStyles].badge}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>{partner.contact_person}</span>
                          <span className="mx-2">•</span>
                          <span>{partner.email}</span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          <span>Created: {new Date(partner.created_at || '').toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span>Postcode: {partner.postcode}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/admin/partners/${partner.user_id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View Details
                      </Link>
                      
                      {partner.status === 'pending' && (
                        <form action={updatePartnerStatus}>
                          <input type="hidden" name="partner_id" value={partner.user_id} />
                          <input type="hidden" name="status" value="active" />
                          <button
                            type="submit"
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </button>
                        </form>
                      )}
                      
                      {partner.status === 'active' && (
                        <form action={updatePartnerStatus}>
                          <input type="hidden" name="partner_id" value={partner.user_id} />
                          <input type="hidden" name="status" value="suspended" />
                          <button
                            type="submit"
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                          >
                            Suspend
                          </button>
                        </form>
                      )}
                      
                      {partner.status === 'suspended' && (
                        <form action={updatePartnerStatus}>
                          <input type="hidden" name="partner_id" value={partner.user_id} />
                          <input type="hidden" name="status" value="active" />
                          <button
                            type="submit"
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                          >
                            Reactivate
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 