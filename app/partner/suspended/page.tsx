import { createClient } from "@/utils/supabase/server";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function PartnerSuspendedPage() {
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
        <div className="p-3 bg-red-50 rounded-full inline-flex mb-6">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Suspended</h1>
        
        <p className="text-lg text-gray-600 mb-6">
          Your partner account has been suspended.
        </p>
        
        <div className="mb-8 max-w-xl mx-auto">
          <div className="bg-red-50 p-6 rounded-lg text-left">
            <h3 className="font-medium text-red-800 mb-2">Why has this happened?</h3>
            <p className="text-red-700 mb-3">
              Your account may have been suspended due to:
            </p>
            <ul className="list-disc list-inside text-red-700 space-y-1 mb-3">
              <li>Violation of our terms of service</li>
              <li>Consistent poor customer feedback</li>
              <li>Failure to respond to customer inquiries</li>
              <li>Suspicious activity detected on your account</li>
            </ul>
            <p className="text-red-700">
              For more information regarding your specific case, please contact our support team.
            </p>
          </div>
        </div>
        
        <div className="max-w-xl mx-auto">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Need to Appeal?</h3>
            <p className="text-sm text-gray-500 mb-3">
              If you believe your account has been suspended in error, please contact our support team to review your case.
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
          Account ID: {user?.id.substring(0, 8)}...
        </p>
      </div>
    </div>
  );
} 