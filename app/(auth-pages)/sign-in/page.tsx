import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, LockIcon, AtSignIcon, ArrowRightIcon } from "lucide-react";
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function Login(props: { searchParams: Promise<Message> }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: profile } = await supabase
      .from('UserProfiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();
    if (profile?.role === 'admin') {
      redirect('/admin');
    } else if (profile?.role === 'partner') {
      redirect('/partner');
    }
  }

  const searchParams = await props.searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <form className="flex flex-col w-full" action={signInAction}>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-3">Welcome back</h1>
              <p className="text-gray-500 mb-3">
                Sign in to your account to manage your business
              </p>
              <div className="mt-2">
                <p className="text-gray-600">
                  Don't have an account?{" "}
                  <Link className="text-blue-600 font-medium hover:underline transition" href="/sign-up">
                    Sign up
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
                  <AlertTitle className="text-red-800 font-semibold">Login Error</AlertTitle>
                  <AlertDescription className="text-red-700 mt-1">
                    {searchParams.error}
                  </AlertDescription>
                </div>
              </Alert>
            )}
            
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center">
                  <AtSignIcon className="h-4 w-4 mr-2 text-gray-500" />
                  Email address
                </Label>
                <Input 
                  name="email" 
                  placeholder="you@example.com" 
                  required 
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center">
                    <LockIcon className="h-4 w-4 mr-2 text-gray-500" />
                    Password
                  </Label>
                  <Link
                    className="text-xs text-blue-600 hover:underline"
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
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                />
              </div>
              
              <SubmitButton 
                pendingText="Signing in..." 
                className="w-full h-12 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition duration-150 mt-2 flex items-center justify-center"
              >
                Sign in
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </SubmitButton>
            </div>
          </form>
        </div>
        
        {searchParams && "success" in searchParams && (
          <Alert className="mt-4 bg-green-50 border-green-200 shadow-sm">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <InfoIcon className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="ml-3">
              <AlertDescription className="text-green-700">
                {searchParams.success}
              </AlertDescription>
            </div>
          </Alert>
        )}
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Protected by industry standard security
          </p>
        </div>
      </div>
    </div>
  );
}