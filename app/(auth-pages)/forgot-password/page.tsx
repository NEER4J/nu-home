import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl p-8 border border-gray-100 " style={{ minWidth: "372px" }}>
          <form className="flex flex-col w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset password</h1>
              <p className="text-gray-500">
                Enter your email to receive a password reset link. Already know your password?{" "}
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
              
              <SubmitButton 
                formAction={forgotPasswordAction}
                className="w-full h-12 bg-[#2565eb] text-white font-medium rounded-lg hover:bg-[#2565eb]/90 focus:ring-4 focus:ring-[#2565eb]/20 transition duration-150"
              >
                Send reset link
              </SubmitButton>
              
              <FormMessage message={searchParams} />
              
              <div className="text-center pt-2">
                <Link
                  className="text-sm text-gray-500 hover:text-[#2565eb] transition"
                  href="/sign-in"
                >
                  &larr; Back to sign in
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
      {/* <SmtpMessage /> */}
    </div>
  );
}