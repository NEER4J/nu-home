import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
// import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
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
                formAction={signUpAction} 
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
      {/* <SmtpMessage /> */}
    </div>
  );
}