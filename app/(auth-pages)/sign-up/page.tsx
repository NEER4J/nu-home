// app/(auth-pages)/sign-up/page.tsx
import { enhancedSignUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  
  // Get available service categories for partners to select from
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('ServiceCategories')
    .select('service_category_id, name')
    .eq('is_active', true)
    .order('name');
  
  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl p-8 border border-gray-100" style={{ minWidth: "372px" }}>
          <form className="flex flex-col w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Get Started</h1>
              <p className="text-gray-500">
                Already have an account?{" "}
                <Link className="text-[#2565eb] font-medium hover:underline transition" href="/sign-in">
                  Sign in
                </Link>
              </p>
            </div>
            
            <div className="space-y-5">
              {/* Account Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">Account Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input 
                      type="radio" 
                      id="role-partner" 
                      name="role" 
                      value="partner"
                      className="sr-only peer"
                      defaultChecked
                      required
                    />
                    <label 
                      htmlFor="role-partner"
                      className="flex flex-col items-center justify-center p-4 text-gray-500 bg-white border border-gray-200 rounded-lg cursor-pointer peer-checked:border-blue-600 peer-checked:text-blue-600 hover:bg-gray-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div className="font-semibold">Partner</div>
                      <div className="text-xs text-center">Sell products and receive leads</div>
                    </label>
                  </div>
                  <div>
                    <input 
                      type="radio" 
                      id="role-admin" 
                      name="role" 
                      value="admin"
                      className="sr-only peer"
                      required
                    />
                    <label 
                      htmlFor="role-admin"
                      className="flex flex-col items-center justify-center p-4 text-gray-500 bg-white border border-gray-200 rounded-lg cursor-pointer peer-checked:border-blue-600 peer-checked:text-blue-600 hover:bg-gray-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <div className="font-semibold">Admin</div>
                      <div className="text-xs text-center">Manage platform and partners</div>
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Partner-specific fields - shown/hidden with JavaScript */}
              <div id="partner-fields" className="space-y-4 pt-2 border-t border-gray-100">
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-sm font-medium text-gray-700">Company Name</Label>
                  <Input 
                    name="company_name" 
                    placeholder="Your company name"
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact_person" className="text-sm font-medium text-gray-700">Contact Person</Label>
                  <Input 
                    name="contact_person" 
                    placeholder="Full name"
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                  <Input 
                    name="phone" 
                    placeholder="Your phone number"
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postcode" className="text-sm font-medium text-gray-700">Postcode</Label>
                  <Input 
                    name="postcode" 
                    placeholder="Your business postcode"
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="primary_category" className="text-sm font-medium text-gray-700">Primary Service Category</Label>
                  <select 
                    name="primary_category"
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                  >
                    <option value="">Select a category</option>
                    {categories?.map((category) => (
                      <option key={category.service_category_id} value={category.service_category_id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">Select the main service category you want to offer</p>
                </div>
              </div>
              
              {/* Base account fields */}
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
              
              <SubmitButton 
                formAction={enhancedSignUpAction} 
                pendingText="Creating account..."
                className="w-full h-12 bg-[#2565eb] text-white font-medium rounded-lg hover:bg-[#2565eb]/90 focus:ring-4 focus:ring-[#2565eb]/20 transition duration-150"
              >
                Create account
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
      
      {/* Add JavaScript to toggle partner fields visibility */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('DOMContentLoaded', function() {
          const partnerFields = document.getElementById('partner-fields');
          const roleInputs = document.querySelectorAll('input[name="role"]');
          
          function togglePartnerFields() {
            const selectedRole = document.querySelector('input[name="role"]:checked').value;
            partnerFields.style.display = selectedRole === 'partner' ? 'block' : 'none';
          }
          
          // Set initial state
          togglePartnerFields();
          
          // Add change listeners
          roleInputs.forEach(input => {
            input.addEventListener('change', togglePartnerFields);
          });
        });
      `}} />
    </div>
  );
}