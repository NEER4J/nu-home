// middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // This `try/catch` block is only here for handling supabase connection errors.
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    const { data: { user } } = await supabase.auth.getUser();
    
    // If user not logged in and accessing protected routes, redirect to sign-in
    if (!user) {
      if (
        request.nextUrl.pathname.startsWith('/admin') || 
        request.nextUrl.pathname.startsWith('/partner') ||
        request.nextUrl.pathname.startsWith('/protected')
      ) {
        // Build the sign-in URL with redirect back
        const redirectUrl = new URL('/sign-in', request.url);
        redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }
      
      return response;
    }
    
    // For logged-in users, check role-based access
    if (user) {
      // Get user profile data for role check
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('role, is_approved, status')
        .eq('user_id', user.id)
        .single();
      
      // Handle admin routes
      if (request.nextUrl.pathname.startsWith('/admin')) {
        // If user is not an admin, redirect to appropriate location
        if (!profile || profile.role !== 'admin') {
          if (profile?.role === 'partner') {
            return NextResponse.redirect(new URL('/partner', request.url));
          } else {
            return NextResponse.redirect(new URL('/', request.url));
          }
        }
      }
      
      // Handle partner routes
      else if (request.nextUrl.pathname.startsWith('/partner')) {
        // If user is not a partner, redirect to appropriate location
        if (!profile || profile.role !== 'partner') {
          if (profile?.role === 'admin') {
            return NextResponse.redirect(new URL('/admin', request.url));
          } else {
            return NextResponse.redirect(new URL('/', request.url));
          }
        }
        
        // If partner is not approved, redirect to pending page
        if (profile.role === 'partner' && (!profile.is_approved || profile.status !== 'active')) {
          // Allow access to the pending page
          if (request.nextUrl.pathname !== '/partner/pending') {
            return NextResponse.redirect(new URL('/partner/pending', request.url));
          }
        }
      }
      
      // If user is on home and they're logged in, redirect to the appropriate dashboard
      if (request.nextUrl.pathname === '/') {
        if (profile?.role === 'admin') {
          return NextResponse.redirect(new URL('/admin', request.url));
        } else if (profile?.role === 'partner') {
          if (profile.is_approved && profile.status === 'active') {
            return NextResponse.redirect(new URL('/partner', request.url));
          } else {
            return NextResponse.redirect(new URL('/partner/pending', request.url));
          }
        }
      }
    }

    return response;
  } catch (e) {
    // If Supabase client creation fails, continue without auth checks
    console.error('Middleware error:', e);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|public).*)",
  ],
};