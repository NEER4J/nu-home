import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Link as LinkIcon, CheckCircle, Clock, XCircle } from "lucide-react";
import { updatePartnerStatus } from "../../actions";
import PendingCategorySection from "./components/PendingCategorySection";
import ApprovedCategorySection from "./components/ApprovedCategorySection";
import RejectedCategorySection from "./components/RejectedCategorySection";
import AddCategorySection from "./components/AddCategorySection";

// Status styling objects
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

export default async function PartnerDetails({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id: partnerId } = await params;
  const supabase = await createClient();
  
  // Get partner profile
  const { data: partner, error: partnerError } = await supabase
    .from("UserProfiles")
    .select("*")
    .eq("user_id", partnerId)
    .single();

  if (partnerError) {
    console.error("Error fetching partner:", partnerError);
    return <div>Error loading partner information</div>;
  }
  
  // Get user information for email/creation date
  const { data: userData } = await supabase.auth.admin.getUserById(partnerId);
  
  // Get partner's category access requests
  const { data: categoryAccess, error: categoryError } = await supabase
    .from("UserCategoryAccess")
    .select(`
      *,
      ServiceCategories(
        service_category_id,
        name,
        icon_url
      )
    `)
    .eq("user_id", partnerId);
    
  if (categoryError) {
    console.error("Error fetching category access:", categoryError);
  }
  
  // Get all categories for potentially adding new ones
  const { data: allCategories } = await supabase
    .from("ServiceCategories")
    .select("*")
    .eq("is_active", true)
    .order("name");
    
  // Get list of categories partner can request access to
  const accessedCategoryIds = categoryAccess?.map(cat => cat.service_category_id) || [];
  const availableCategories = allCategories?.filter(
    cat => !accessedCategoryIds.includes(cat.service_category_id)
  ) || [];
  
  // Group by status
  const pendingCategories = categoryAccess?.filter(cat => cat.status === 'pending') || [];
  const approvedCategories = categoryAccess?.filter(cat => cat.status === 'approved') || [];
  const rejectedCategories = categoryAccess?.filter(cat => cat.status === 'rejected') || [];
  
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link 
          href="/admin/partners" 
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Partners
        </Link>
      </div>
      
      {/* Partner header */}
      <div className={`p-6 rounded-lg shadow-sm border mb-8 ${statusStyles[partner.status as keyof typeof statusStyles].border} ${statusStyles[partner.status as keyof typeof statusStyles].bg}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-600 font-medium text-xl">
                {partner.company_name?.charAt(0) || userData?.user?.email?.charAt(0) || '?'}
              </span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-semibold text-gray-900">{partner.company_name}</h1>
              <div className="flex items-center mt-1">
                {statusStyles[partner.status as keyof typeof statusStyles].badge}
                <span className="ml-2 text-sm text-gray-500">
                  Created: {userData?.user?.created_at ? new Date(userData.user.created_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Status update buttons */}
          <div className="mt-4 md:mt-0 flex space-x-2">
            {partner.status === 'pending' && (
              <form action={updatePartnerStatus}>
                <input type="hidden" name="partner_id" value={partnerId} />
                <input type="hidden" name="status" value="active" />
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  Approve Account
                </button>
              </form>
            )}
            
            {partner.status === 'active' && (
              <form action={updatePartnerStatus}>
                <input type="hidden" name="partner_id" value={partnerId} />
                <input type="hidden" name="status" value="suspended" />
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  Suspend Account
                </button>
              </form>
            )}
            
            {partner.status === 'suspended' && (
              <form action={updatePartnerStatus}>
                <input type="hidden" name="partner_id" value={partnerId} />
                <input type="hidden" name="status" value="active" />
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  Reactivate Account
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Partner Details */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Partner Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <User className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <span className="block text-sm font-medium text-gray-500">Contact Person</span>
                  <span className="text-gray-900">{partner.contact_person || 'Not provided'}</span>
                </div>
              </div>
              
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <span className="block text-sm font-medium text-gray-500">Email</span>
                  <span className="text-gray-900">{userData?.user?.email || 'Not available'}</span>
                </div>
              </div>
              
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <span className="block text-sm font-medium text-gray-500">Phone</span>
                  <span className="text-gray-900">{partner.phone || 'Not provided'}</span>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <span className="block text-sm font-medium text-gray-500">Location</span>
                  <span className="text-gray-900">
                    {[partner.address, partner.postcode].filter(Boolean).join(', ') || 'Not provided'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <span className="block text-sm font-medium text-gray-500">Joined</span>
                  <span className="text-gray-900">
                    {userData?.user?.created_at ? new Date(userData.user.created_at).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
              
              {partner.website_url && (
                <div className="flex items-start">
                  <LinkIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Website</span>
                    <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {partner.website_url}
                    </a>
                  </div>
                </div>
              )}
            </div>
            
            {partner.business_description && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-line">{partner.business_description}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Right column - Category Access Management */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Category Access</h2>
              <div className="text-sm text-gray-500">
                {approvedCategories.length} Approved / {pendingCategories.length} Pending / {rejectedCategories.length} Rejected
              </div>
            </div>
            
            {/* Pending Category Requests */}
            {pendingCategories.length > 0 && (
              <PendingCategorySection categories={pendingCategories} partnerId={partnerId} />
            )}
            
            {/* Approved Categories */}
            {approvedCategories.length > 0 && (
              <ApprovedCategorySection categories={approvedCategories} partnerId={partnerId} />
            )}
            
            {/* Rejected Categories */}
            {rejectedCategories.length > 0 && (
              <RejectedCategorySection categories={rejectedCategories} partnerId={partnerId} />
            )}
            
            {/* Add new category access */}
            {availableCategories.length > 0 && (
              <AddCategorySection categories={availableCategories} partnerId={partnerId} />
            )}
          </div>
          
          {/* Activity Log placeholder */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
            <p className="text-sm text-gray-500">
              Activity log will be implemented in a future update.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 