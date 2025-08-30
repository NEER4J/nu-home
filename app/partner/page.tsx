import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle, Clock, Package, ShoppingCart, Users, Globe } from "lucide-react";
import CategoryUrlSection from './CategoryUrlSection';

// Add CopyButton component before the main component
function CopyButton({ url }: { url: string }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <button
      onClick={copyToClipboard}
      className="ml-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
      title="Copy URL"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
      </svg>
    </button>
  );
}

export default async function PartnerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("UserProfiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Fetch category access data
  const { data: categoryAccess } = await supabase
    .from("UserCategoryAccess")
    .select(`
      *,
      ServiceCategories(
        name,
        icon_url,
        slug
      )
    `)
    .eq("user_id", user.id);

  // Split categories by status
  const approvedCategories = categoryAccess?.filter(cat => cat.status === 'approved') || [];
  const pendingCategories = categoryAccess?.filter(cat => cat.status === 'pending') || [];
  const primaryCategory = categoryAccess?.find(cat => cat.is_primary);

  // Fetch products count
  const { count: productsCount } = await supabase
    .from("Products")
    .select("*", { count: 'exact', head: true })
    .eq("owner_id", user.id);

  // Fetch leads count
  const { count: leadsCount } = await supabase
    .from("QuoteSubmissions")
    .select("*", { count: 'exact', head: true })
    .eq("assigned_partner_id", user.id);

  // Fetch recent leads
  const { data: recentLeads } = await supabase
    .from("QuoteSubmissions")
    .select(`
      *,
      ServiceCategories(name)
    `)
    .eq("assigned_partner_id", user.id)
    .order('submission_date', { ascending: false })
    .limit(3);

  // Fetch notifications
  const { data: notifications } = await supabase
    .from("CategoryNotifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order('created_at', { ascending: false })
    .limit(5);

  // Use the stored domain verification status from the database
  const customDomainVerified = profile?.domain_verified || false;

  return (
    <div className="max-w-[1500px] mx-auto">
      {/* Account status bar */}
      <div className={`mb-6 p-4 hidden rounded-lg ${profile?.status === 'active' ? 'bg-green-50' : profile?.status === 'pending' ? 'bg-yellow-50' : 'bg-red-50'}`}>
        <div className="flex items-center">
          {profile?.status === 'active' ? (
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          ) : profile?.status === 'pending' ? (
            <Clock className="h-5 w-5 text-yellow-500 mr-2" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          )}
          <span className={`font-medium ${profile?.status === 'active' ? 'text-green-700' : profile?.status === 'pending' ? 'text-yellow-700' : 'text-red-700'}`}>
            Account Status: {profile?.status === 'active' ? 'Active' : profile?.status === 'pending' ? 'Pending Approval' : 'Suspended'}
          </span>
          
          {profile?.status === 'pending' && (
            <div className="ml-auto text-sm text-yellow-700">
              Your account is under review. You'll be notified once approved.
            </div>
          )}
          
          {profile?.status === 'suspended' && (
            <div className="ml-auto text-sm text-red-700">
              Your account has been suspended. Please contact support.
            </div>
          )}
        </div>
      </div>

      {/* Custom Domain Status */}
      {profile?.custom_domain && (
        <div className={`mb-6 p-4 rounded-lg hidden ${customDomainVerified ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Globe className={`h-5 w-5 mr-2 ${customDomainVerified ? 'text-green-500' : 'text-yellow-500'}`} />
              <div>
                <span className={`font-medium ${customDomainVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                  Custom Domain: {profile.custom_domain}
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  {customDomainVerified 
                    ? 'Your custom domain is verified and ready to use' 
                    : 'Your custom domain is pending verification. Please check your DNS settings.'
                  }
                </p>
              </div>
            </div>
            {!customDomainVerified && (
              <Link 
                href="/partner/profile" 
                className="text-sm font-medium text-yellow-700 hover:text-yellow-600"
              >
                Verify Domain
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Dashboard stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-50 rounded-md">
              <Package className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Products</h3>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-semibold text-gray-900">{productsCount || 0}</p>
              <p className="text-sm text-gray-500">Active products</p>
            </div>
            <Link 
              href="/partner/my-products" 
              className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center"
            >
              Manage <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-green-50 rounded-md">
              <Users className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Categories</h3>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-semibold text-gray-900">{approvedCategories.length}</p>
              <p className="text-sm text-gray-500">Approved categories</p>
            </div>
            <Link 
              href="/partner/category-access" 
              className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center"
            >
              Manage <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-50 rounded-md">
              <ShoppingCart className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Leads</h3>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-semibold text-gray-900">{leadsCount || 0}</p>
              <p className="text-sm text-gray-500">Total leads</p>
            </div>
            <Link 
              href="/partner/leads" 
              className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center"
            >
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main dashboard content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Categories */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Your Categories</h2>
              <Link 
                href="/partner/category-access" 
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Request more
              </Link>
            </div>
            
            {approvedCategories.length === 0 && pendingCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>You don't have any categories yet.</p>
                <Link 
                  href="/partner/category-access" 
                  className="mt-2 inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-md text-sm font-medium"
                >
                  Request Categories
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedCategories.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Your Categories</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {approvedCategories.map((category) => (
                        <div key={category.access_id} className="p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-md flex items-center justify-center">
                                {category.ServiceCategories?.icon_url ? (
                                  <img 
                                    src={category.ServiceCategories.icon_url} 
                                    alt={category.ServiceCategories.name} 
                                    className="h-5 w-5" 
                                  />
                                ) : (
                                  <Package className="h-4 w-4 text-blue-500" />
                                )}
                              </div>
                              <div className="ml-2">
                                <p className="text-sm font-medium text-gray-900">{category.ServiceCategories?.name}</p>
                                {category.is_primary && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    Primary
                                  </span>
                                )}
                              </div>
                            </div>
                            <CategoryUrlSection 
                              slug={category.ServiceCategories?.slug || ''} 
                              userId={user.id} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {pendingCategories.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Approval</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pendingCategories.map((category) => (
                        <div key={category.access_id} className="flex items-center p-3 bg-yellow-50 rounded-md">
                          <div className="flex-shrink-0 h-10 w-10 bg-yellow-100 rounded-md flex items-center justify-center">
                            {category.ServiceCategories?.icon_url ? (
                              <img 
                                src={category.ServiceCategories.icon_url} 
                                alt={category.ServiceCategories.name} 
                                className="h-6 w-6" 
                              />
                            ) : (
                              <Package className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{category.ServiceCategories?.name}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Recent leads */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Recent Leads</h2>
              <Link 
                href="/partner/leads" 
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            
            {!recentLeads || recentLeads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No leads assigned to you yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentLeads.map((lead) => (
                  <div key={lead.submission_id} className="py-4 flex items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lead.first_name} {lead.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {lead.ServiceCategories?.name} - {lead.postcode}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(lead.submission_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Link 
                        href={`/partner/leads/${lead.submission_id}`} 
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:text-gray-500"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right column */}
        <div className="space-y-6">
          {/* Profile card */}
        
          
          {/* Notifications */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
              <Link 
                href="/partner/notifications" 
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            
            {!notifications || notifications.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No new notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.notification_id} className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-900">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Quick actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            
            <div className="space-y-2">
              <Link 
                href="/partner/my-products/new" 
                className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100"
              >
                <Package className="h-5 w-5 text-blue-500 mr-3" />
                <span className="text-sm font-medium text-gray-900">Add New Product</span>
              </Link>
              
              <Link 
                href="/partner/category-access" 
                className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100"
              >
                <ShoppingCart className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-sm font-medium text-gray-900">Request Category Access</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 