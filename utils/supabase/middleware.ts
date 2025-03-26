import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const createClient = (request: NextRequest) => {
  // Create a Supabase client for use in the middleware
  return createServerClient(
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
        },
      },
    },
  );
};

export const updateSession = async (request: NextRequest) => {
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
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
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { data: { user } } = await supabase.auth.getUser();
    const { pathname } = request.nextUrl;

    // No user check - redirect to sign in
    if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/partner'))) {
      const redirectUrl = new URL('/sign-in', request.url);
      redirectUrl.searchParams.set('redirect_to', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // If logged in but on home page, redirect to appropriate dashboard
    if (user && pathname === '/') {
      // Check role
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('role, status')
        .eq('user_id', user.id)
        .single();

      if (profile?.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else if (profile?.role === 'partner') {
        // Check partner status
        if (profile.status === 'pending') {
          return NextResponse.redirect(new URL('/partner/pending', request.url));
        } else if (profile.status === 'suspended') {
          return NextResponse.redirect(new URL('/partner/suspended', request.url));
        } else {
          return NextResponse.redirect(new URL('/partner', request.url));
        }
      }
    }

    // Role-based protection for admin routes
    if (user && pathname.startsWith('/admin')) {
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/partner', request.url));
      }
    }

    // Role-based protection for partner routes
    if (user && pathname.startsWith('/partner')) {
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

      // Status-based redirects for partners
      if (profile.status === 'suspended' && pathname !== '/partner/suspended') {
        return NextResponse.redirect(new URL('/partner/suspended', request.url));
      }

      if (profile.status === 'pending' && pathname !== '/partner/pending') {
        return NextResponse.redirect(new URL('/partner/pending', request.url));
      }
    }

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
