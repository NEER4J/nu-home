import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, ArrowRightIcon, BuildingIcon, UserIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import { redirect } from "next/navigation";
// import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: profile } = await supabase
      .from("UserProfiles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();
    if (profile?.role === "admin") {
      redirect("/admin");
    } else if (profile?.role === "partner") {
      redirect("/partner");
    }
  }

  // Fetch service categories for selection
  const { data: categories } = await supabase
    .from("ServiceCategories")
    .select("service_category_id, name")
    .eq("is_active", true);
    
  const searchParams = await props.searchParams;
  if ("success" in searchParams) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <Alert className="bg-green-50 border-green-200 shadow-sm">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <InfoIcon className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="ml-3">
              <AlertTitle className="text-green-800 font-semibold text-lg">Registration Successful</AlertTitle>
              <AlertDescription className="text-green-700 mt-2">
                {searchParams.success}
                <div className="mt-4">
                  <Link 
                    href="/sign-in" 
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition"
                  >
                    Go to Sign In
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </AlertDescription>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <form className="flex flex-col w-full" action={signUpAction}>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-semibold text-gray-800 mb-2">Join Our Marketplace</h1>
              <p className="text-gray-500 max-w-md mx-auto">
                Create an account to start growing your business and connect with new customers
              </p>
              <div className="mt-3">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link className="text-blue-600 font-medium hover:underline transition" href="/sign-in">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
            
            {searchParams && "error" in searchParams && (
              <Alert className="mb-6 bg-red-50 border-red-200">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <InfoIcon className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <AlertTitle className="text-red-800 font-semibold">Registration Error</AlertTitle>
                  <AlertDescription className="text-red-700 mt-1">
                    {searchParams.error}
                  </AlertDescription>
                </div>
              </Alert>
            )}
            
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address *</Label>
                    <Input 
                      name="email" 
                      placeholder="you@example.com" 
                      required 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password *</Label>
                    <Input
                      type="password"
                      name="password"
                      placeholder="Create a secure password"
                      minLength={6}
                      required
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    />
                    <p className="text-xs text-gray-500">Must be at least 6 characters</p>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="subdomain" className="text-sm font-medium text-gray-700">Subdomain (Optional)</Label>
                    <div className="flex items-center">
                      <Input 
                        name="subdomain" 
                        placeholder="yourbusiness" 
                        className="w-full h-12 px-4 rounded-l-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                      />
                      <span className="bg-gray-100 h-12 px-3 flex items-center rounded-r-lg border border-l-0 border-gray-200 text-gray-500">
                        .example.com
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Create a custom URL for your profile</p>
                  </div>
                </div>
              </div>
              
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <BuildingIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Business Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="company_name" className="text-sm font-medium text-gray-700">Company Name *</Label>
                    <Input 
                      name="company_name" 
                      placeholder="Your Business Name" 
                      required 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contact_person" className="text-sm font-medium text-gray-700 flex items-center">
                      <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                      Contact Person *
                    </Label>
                    <Input 
                      name="contact_person" 
                      placeholder="Full Name" 
                      required 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-1 text-gray-500" />
                      Phone Number
                    </Label>
                    <Input 
                      name="phone" 
                      placeholder="Your Phone Number" 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">Business Address</Label>
                    <Input 
                      name="address" 
                      placeholder="Street Address" 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="postcode" className="text-sm font-medium text-gray-700 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1 text-gray-500" />
                      Postcode *
                    </Label>
                    <Input 
                      name="postcode" 
                      placeholder="Postcode/ZIP" 
                      required 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm font-medium text-gray-700">Website URL</Label>
                    <Input 
                      name="website" 
                      placeholder="https://yourbusiness.com" 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="logo_url" className="text-sm font-medium text-gray-700">Logo URL</Label>
                    <Input 
                      name="logo_url" 
                      placeholder="https://yourbusiness.com/logo.png" 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    />
                    <p className="text-xs text-gray-500">Enter a URL to your company logo image</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-600 mr-2 text-center text-sm font-semibold">?</span>
                  Service Category
                </h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_category" className="text-sm font-medium text-gray-700">Primary Service Category *</Label>
                    <select
                      name="primary_category"
                      required
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    >
                      <option value="">Select a service</option>
                      {categories?.map((category) => (
                        <option key={category.service_category_id} value={category.service_category_id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">This will be your main service category. You can request additional categories later.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="business_description" className="text-sm font-medium text-gray-700">Business Description</Label>
                    <textarea
                      name="business_description"
                      placeholder="Briefly describe your business and services offered"
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Fields marked with * are required</p>
                
                <SubmitButton 
                  pendingText="Creating account..."
                  className="w-full h-12 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition duration-150"
                >
                  Create Partner Account
                </SubmitButton>
              </div>
            </div>
          </form>
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            By signing up, you agree to our{" "}
            <a href="#" className="text-blue-600 hover:underline">Terms</a> and{" "}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
      {/* <SmtpMessage /> */}
    </div>
  );
}