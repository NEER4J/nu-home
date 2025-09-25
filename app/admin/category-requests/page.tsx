import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { updateCategoryAccess } from "../actions";
import { Clock, CheckCircle, XCircle, Package, User } from "lucide-react";
import Link from "next/link";
import { UserCategoryAccess } from "@/types/database.types";

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

interface CategoryRequest extends UserCategoryAccess {
  company_name: string;
  contact_person: string;
  phone: string | null;
  category_name: string;
  icon_url: string | null;
}

export default async function CategoryRequestsPage() {
  const supabase = await createClient();
  
  // Check if admin is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/sign-in");
  }
  
  // Verify admin role
  const { data: adminProfile } = await supabase
    .from("UserProfiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
    
  if (!adminProfile || adminProfile.role !== 'admin') {
    return redirect("/admin");
  }
  
  // Fetch all pending category requests with partner and category details
  const { data: pendingRequests, error } = await supabase
    .rpc('get_pending_category_requests');
    
  if (error) {
    console.error("Error fetching pending requests:", error);
    return <div>Error loading category requests</div>;
  }
  
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Services Access Requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and manage partner requests for services access.
        </p>
      </div>
      
      {pendingRequests?.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Pending Requests</h3>
          <p className="text-sm text-gray-500">
            All services access requests have been processed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(pendingRequests as CategoryRequest[])?.map((request) => (
            <div 
              key={request.access_id}
              className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 bg-white rounded-md flex items-center justify-center border border-gray-200">
                      {request.icon_url ? (
                        <img 
                          src={request.icon_url}
                          alt={request.category_name}
                          className="h-6 w-6" 
                        />
                      ) : (
                        <Package className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                          {request.category_name}
                        </h3>
                        <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </div>
                      <div className="mt-1">
                        <Link 
                          href={`/admin/partners/${request.user_id}`}
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
                        >
                          <User className="h-4 w-4 mr-1" />
                          {request.company_name || "View Partner"}
                        </Link>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <form action={updateCategoryAccess}>
                      <input type="hidden" name="access_id" value={request.access_id} />
                      <input type="hidden" name="partner_id" value={request.user_id} />
                      <input type="hidden" name="category_id" value={request.service_category_id} />
                      <input type="hidden" name="status" value="approved" />
                      <button
                        type="submit"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Activate
                      </button>
                    </form>
                    
                    <form action={updateCategoryAccess}>
                      <input type="hidden" name="access_id" value={request.access_id} />
                      <input type="hidden" name="partner_id" value={request.user_id} />
                      <input type="hidden" name="category_id" value={request.service_category_id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button
                        type="submit"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Disable
                      </button>
                    </form>
                  </div>
                </div>
                
                {request.admin_notes && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700">Admin Notes:</h4>
                    <p className="mt-1 text-sm text-gray-600">{request.admin_notes}</p>
                  </div>
                )}
                
                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  Requested on {new Date(request.requested_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 