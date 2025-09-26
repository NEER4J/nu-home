import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { ChevronRight, CheckCircle, Clock, XCircle, AlertCircle, Package, Plus, Grid } from "lucide-react";
import { redirect } from "next/navigation";
import { requestCategoryAccess } from "../../partner/actions";

export default async function CategoryAccessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch all service categories
  const { data: allCategories } = await supabase
    .from("ServiceCategories")
    .select("*")
    .eq("is_active", true)
    .order("name");

  // Fetch user's category access
  const { data: userCategoryAccess } = await supabase
    .from("UserCategoryAccess")
    .select("*, ServiceCategories(name, icon_url)")
    .eq("user_id", user.id);

  // Group categories by status
  const approvedCategories = userCategoryAccess?.filter(cat => cat.status === 'approved') || [];
  const pendingCategories = userCategoryAccess?.filter(cat => cat.status === 'pending') || [];
  const rejectedCategories = userCategoryAccess?.filter(cat => cat.status === 'rejected') || [];

  // Get list of categories user can request access to
  const accessedCategoryIds = userCategoryAccess?.map(cat => cat.service_category_id) || [];
  const availableCategories = allCategories?.filter(
    cat => !accessedCategoryIds.includes(cat.service_category_id)
  ) || [];

  // Status badges and classes
  const statusInfo = {
    approved: {
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      badge: <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Activated</span>,
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    pending: {
      icon: <Clock className="h-5 w-5 text-yellow-500" />,
      badge: <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200"
    },
    rejected: {
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      badge: <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Disabled</span>,
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Services Access</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your services and request access to new ones.
        </p>
      </div>

   

      {/* Your current categories */}
      <div className="mb-8">
        
        {userCategoryAccess?.length === 0 ? (
          <div className="bg-white p-6 rounded-lg border text-center">
            <Grid className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Services Yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              You haven't requested access to any services yet.
            </p>
            <a 
              href="#request-category" 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Request Your First Service
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {approvedCategories.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Activated Services</h3>
                <div className="space-y-3">
                  {approvedCategories.map((category) => (
                    <div 
                      key={category.access_id} 
                      className={`p-4 rounded-lg border ${statusInfo.approved.borderColor} ${statusInfo.approved.bgColor} flex items-center justify-between`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-white rounded-md flex items-center justify-center">
                          {category.ServiceCategories?.icon_url ? (
                            <img 
                              src={category.ServiceCategories.icon_url}
                              alt={category.ServiceCategories?.name}
                              className="h-6 w-6" 
                            />
                          ) : (
                            <Package className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <h4 className="text-base font-medium text-gray-900">{category.ServiceCategories?.name}</h4>
                          <div className="flex items-center mt-1">
                            {statusInfo.approved.badge}
                            {category.is_primary && (
                              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                Primary Category
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Link
                        href={`/partner/my-products?category=${category.service_category_id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Manage Products
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {pendingCategories.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Pending Services</h3>
                <div className="space-y-3">
                  {pendingCategories.map((category) => (
                    <div 
                      key={category.access_id} 
                      className={`p-4 rounded-lg border ${statusInfo.pending.borderColor} ${statusInfo.pending.bgColor} flex items-center justify-between`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-white rounded-md flex items-center justify-center">
                          {category.ServiceCategories?.icon_url ? (
                            <img 
                              src={category.ServiceCategories.icon_url}
                              alt={category.ServiceCategories?.name}
                              className="h-6 w-6" 
                            />
                          ) : (
                            <Package className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <h4 className="text-base font-medium text-gray-900">{category.ServiceCategories?.name}</h4>
                          <div className="flex items-center mt-1">
                            {statusInfo.pending.badge}
                            <span className="ml-2 text-xs text-gray-500">
                              Requested on {new Date(category.requested_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-yellow-700">
                        <Clock className="h-4 w-4 mr-1" />
                        Awaiting approval
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {rejectedCategories.length > 0 && (
              <div className="hidden">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Disabled Services</h3>
                <div className="space-y-3">
                  {rejectedCategories.map((category) => (
                    <div 
                      key={category.access_id} 
                      className={`p-4 rounded-lg border ${statusInfo.rejected.borderColor} ${statusInfo.rejected.bgColor} flex items-center justify-between`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-white rounded-md flex items-center justify-center">
                          {category.ServiceCategories?.icon_url ? (
                            <img 
                              src={category.ServiceCategories.icon_url}
                              alt={category.ServiceCategories?.name}
                              className="h-6 w-6" 
                            />
                          ) : (
                            <Package className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <h4 className="text-base font-medium text-gray-900">{category.ServiceCategories?.name}</h4>
                          <div className="flex items-center mt-1">
                            {statusInfo.rejected.badge}
                            <span className="ml-2 text-xs text-gray-500">
                              Disabled on {new Date(category.rejected_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {category.admin_notes && (
                        <div className="text-sm text-red-700 max-w-xs">
                          <span className="font-medium">Reason:</span> {category.admin_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Request new categories */}
      <div id="request-category">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium text-gray-900">Request New Services</h2>
          <span className="text-sm text-gray-500">{availableCategories.length} services available</span>
        </div>

        {availableCategories.length === 0 ? (
          <div className="bg-white p-6 rounded-lg border text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">All Services Requested</h3>
            <p className="text-sm text-gray-500">
              You have already requested access to all available services.
            </p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg border">
            <form action={requestCategoryAccess} className="space-y-4">
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Service
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="">Choose a service...</option>
                  {availableCategories.map((category) => (
                    <option key={category.service_category_id} value={category.service_category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Explain why you need access to this category and any relevant experience..."
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Request Access
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
} 