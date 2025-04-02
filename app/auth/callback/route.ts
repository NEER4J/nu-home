import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // Get user profile to check role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('role, status')
        .eq('user_id', user.id)
        .single();

      // If there's a specific redirect URL, use it
      if (redirectTo) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }

      // Otherwise, redirect based on role and status
      if (profile?.role === 'admin') {
        return NextResponse.redirect(`${origin}/admin`);
      } else if (profile?.role === 'partner') {
        if (profile.status === 'pending') {
          return NextResponse.redirect(`${origin}/partner/pending`);
        } else if (profile.status === 'suspended') {
          return NextResponse.redirect(`${origin}/partner/suspended`);
        } else {
          return NextResponse.redirect(`${origin}/partner`);
        }
      }
    }
  }

  // Default redirect
  return NextResponse.redirect(`${origin}/`);
}
