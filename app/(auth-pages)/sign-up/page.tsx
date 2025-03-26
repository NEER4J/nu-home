import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
// import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  // Fetch service categories for selection
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("ServiceCategories")
    .select("service_category_id, name")
    .eq("is_active", true);
    
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-xl p-8 border border-gray-100">
          <form className="flex flex-col w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Partner Registration</h1>
              <p className="text-gray-500">
                Join our marketplace and start growing your business
              </p>
              <p className="text-gray-500 mt-1">
                Already have an account?{" "}
                <Link className="text-[#2565eb] font-medium hover:underline transition" href="/sign-in">
                  Sign in
                </Link>
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-medium text-gray-800 mb-4">Account Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
                    <Input 
                      name="email" 
                      placeholder="you@example.com" 
                      required 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                    <Input
                      type="password"
                      name="password"
                      placeholder="Create a secure password"
                      minLength={6}
                      required
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                    />
                    <p className="text-xs text-gray-500">Must be at least 6 characters</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium text-gray-700">Account Type</Label>
                    <select
                      name="role"
                      required
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                    >
                      <option value="partner">Partner (Service Provider)</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-medium text-gray-800 mb-4">Business Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="company_name" className="text-sm font-medium text-gray-700">Company Name</Label>
                    <Input 
                      name="company_name" 
                      placeholder="Your Business Name" 
                      required 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contact_person" className="text-sm font-medium text-gray-700">Contact Person</Label>
                    <Input 
                      name="contact_person" 
                      placeholder="Full Name" 
                      required 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                    <Input 
                      name="phone" 
                      placeholder="Your Phone Number" 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">Business Address</Label>
                    <Input 
                      name="address" 
                      placeholder="Street Address" 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="postcode" className="text-sm font-medium text-gray-700">Postcode</Label>
                    <Input 
                      name="postcode" 
                      placeholder="Postcode/ZIP" 
                      required 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm font-medium text-gray-700">Website (optional)</Label>
                    <Input 
                      name="website" 
                      placeholder="https://yourbusiness.com" 
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-medium text-gray-800 mb-4">Service Category</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_category" className="text-sm font-medium text-gray-700">Primary Service Category</Label>
                    <select
                      name="primary_category"
                      required
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                    >
                      <option value="">Select a category</option>
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
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              <SubmitButton 
                formAction={signUpAction} 
                pendingText="Creating account..."
                className="w-full h-12 bg-[#2565eb] text-white font-medium rounded-lg hover:bg-[#2565eb]/90 focus:ring-4 focus:ring-[#2565eb]/20 transition duration-150"
              >
                Create Partner Account
              </SubmitButton>
              
              <FormMessage message={searchParams} />
            </div>
          </form>
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            By signing up, you agree to our{" "}
            <a href="#" className="text-[#2565eb] hover:underline">Terms</a> and{" "}
            <a href="#" className="text-[#2565eb] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
      {/* <SmtpMessage /> */}
    </div>
  );
}