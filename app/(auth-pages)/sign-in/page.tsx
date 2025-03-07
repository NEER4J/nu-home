import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center  px-4 py-12">
      <div className="w-full min-w-xl">
        <div className="bg-white rounded-xl p-8 border border-gray-100 min-w-xl" style={{ minWidth: "372px" }}>
          <form className="flex flex-col w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome back</h1>
              <p className="text-gray-500">
                Don't have an account?{" "}
                <Link className="text-[#2565eb] font-medium hover:underline transition" href="/sign-up">
                  Sign up
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
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                  <Link
                    className="text-xs text-[#2565eb] hover:underline"
                    href="/forgot-password"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-[#2565eb] focus:ring-2 focus:ring-[#2565eb]/20 transition"
                />
              </div>
              
              <SubmitButton 
                pendingText="Signing in..." 
                formAction={signInAction}
                className="w-full h-12 bg-[#2565eb] text-white font-medium rounded-lg hover:bg-[#2565eb]/90 focus:ring-4 focus:ring-[#2565eb]/20 transition duration-150"
              >
                Sign in
              </SubmitButton>
              
              <FormMessage message={searchParams} />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}