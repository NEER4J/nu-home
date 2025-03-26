import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Update the session first
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Implement role-based routing protection
  if (pathname.startsWith('/admin')) {
    // Create supabase client with the request
    const supabase = createClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    // No user is logged in, redirect to login
    if (!user) {
      const redirectUrl = new URL('/sign-in', request.url);
      redirectUrl.searchParams.set('redirect_to', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('UserProfiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // If not an admin, redirect to partner dashboard or home
    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/partner', request.url));
    }
  }

  // Protect partner routes
  if (pathname.startsWith('/partner')) {
    const supabase = createClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    // No user is logged in, redirect to login
    if (!user) {
      const redirectUrl = new URL('/sign-in', request.url);
      redirectUrl.searchParams.set('redirect_to', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('UserProfiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single();

    // If admin, redirect to admin dashboard
    if (profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // If not a partner, redirect to homepage
    if (!profile || profile.role !== 'partner') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // If partner account is suspended, redirect to suspension page
    if (profile.status === 'suspended') {
      return NextResponse.redirect(new URL('/partner/suspended', request.url));
    }

    // If partner account is pending, redirect to pending page
    if (profile.status === 'pending' && pathname !== '/partner/pending') {
      return NextResponse.redirect(new URL('/partner/pending', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
