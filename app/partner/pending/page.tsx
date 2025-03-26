import { createClient } from "@/utils/supabase/server";
import { Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function PartnerPendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user profile
  let profile = null;
  if (user) {
    const { data: profileData } = await supabase
      .from("UserProfiles")
      .select('*')
      .eq("user_id", user.id)
      .single();
    
    profile = profileData;
  }

  return (
    <div className="max-w-4xl mx-auto text-center">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
        <div className="p-3 bg-yellow-50 rounded-full inline-flex mb-6">
          <Clock className="h-12 w-12 text-yellow-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Pending Approval</h1>
        
        <p className="text-lg text-gray-600 mb-6">
          Your partner account is currently under review by our admin team.
        </p>
        
        <div className="mb-8 max-w-xl mx-auto">
          <div className="bg-yellow-50 p-6 rounded-lg text-left">
            <h3 className="font-medium text-yellow-800 mb-2">What happens next?</h3>
            <p className="text-yellow-700 mb-3">
              Our team is reviewing your application. This typically takes 1-2 business days, but may sometimes take longer.
            </p>
            <p className="text-yellow-700">
              You'll receive an email notification once your account has been approved.
            </p>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 max-w-xl mx-auto">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Complete Your Profile</h3>
            <p className="text-sm text-gray-500 mb-3">
              While waiting, you can complete your profile information.
            </p>
            <Link
              href="/partner/settings"
              className="inline-flex items-center text-blue-600 font-medium hover:text-blue-500"
            >
              Update profile <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-500 mb-3">
              Have questions about your application?
            </p>
            <Link
              href="mailto:support@example.com"
              className="inline-flex items-center text-blue-600 font-medium hover:text-blue-500"
            >
              Contact support <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        <p>
          Application submitted on {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
        </p>
      </div>
    </div>
  );
} 