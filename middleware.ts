import { createClient } from '@/utils/supabase/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const hostname = requestUrl.hostname;
  const path = requestUrl.pathname;
  const searchParams = requestUrl.searchParams;

  // Skip middleware for specific paths
  if (
    path.startsWith('/_next') || 
    path.startsWith('/api') ||
    path.startsWith('/static') ||
    path.startsWith('/auth') ||
    path.includes('.') ||
    path === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Handle subdomains first (no auth required)
  const isLocalhost = hostname.includes('localhost');
  const isVercel = hostname.includes('vercel.app');
  
  // Define main domain based on environment
  let mainDomain: string;
  if (isLocalhost) {
    mainDomain = 'localhost:3000';
  } else if (isVercel) {
    mainDomain = hostname.split('-')[0] + '.vercel.app';
  } else {
    mainDomain = 'apstic.com';
  }

  // Extract subdomain
  let subdomain: string | null = null;
  if (isLocalhost) {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
      subdomain = parts[0];
    }
  } else if (isVercel) {
    const parts = hostname.split('-');
    if (parts.length > 1) {
      subdomain = parts[0];
    }
  } else {
    // For production
    if (hostname !== mainDomain) {
      subdomain = hostname.split('.')[0];
    }
  }

  // Handle protected paths that need subdomain processing
  const isProtectedPath = (path.includes('/quote') || path.includes('/products')) && 
    !path.includes('/products/addons');
  
  if (isProtectedPath) {
    // If we already have the partner_subdomain parameter, proceed
    if (searchParams.has('partner_subdomain')) {
      return NextResponse.next();
    }

    // If we have a subdomain, validate it
    if (subdomain) {
      try {
        const supabase = createClient(request);
        const { data: profile } = await supabase
          .from('UserProfiles')
          .select('user_id, status')
          .eq('subdomain', subdomain)
          .eq('status', 'active')
          .single();

        if (profile) {
          // Valid subdomain - add it as a parameter and rewrite
          const url = new URL(request.url);
          url.searchParams.set('partner_subdomain', subdomain);
          return NextResponse.rewrite(url);
        }
      } catch (error) {
        console.error('Error checking subdomain:', error);
      }

      // Invalid subdomain - redirect to main domain
      const protocol = isLocalhost ? 'http' : 'https';
      const redirectUrl = new URL(path, `${protocol}://${mainDomain}`);
      // Preserve all existing query parameters except partner_subdomain
      searchParams.forEach((value, key) => {
        if (key !== 'partner_subdomain') {
          redirectUrl.searchParams.set(key, value);
        }
      });
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Only check auth for protected routes
  if (path.startsWith('/partner') || path.startsWith('/admin')) {
    try {
      const supabase = createClient(request);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        const redirectUrl = new URL('/auth/login', request.url);
        redirectUrl.searchParams.set('redirect_to', path);
        return NextResponse.redirect(redirectUrl);
      }

      // For admin routes, check if user has admin role
      if (path.startsWith('/admin')) {
        const { data: profile } = await supabase
          .from('UserProfiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (!profile || profile.role !== 'admin') {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }

      // For partner routes, check if user has partner role
      if (path.startsWith('/partner')) {
        const { data: profile } = await supabase
          .from('UserProfiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (!profile || profile.role !== 'partner') {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Auth error:', error);
      // On auth error, redirect to login
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirect_to', path);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Get the current pathname
  const pathname = request.nextUrl.pathname
  const isCategoryPage = pathname.startsWith('/category')

  // Add a custom header to indicate if we're on a category page
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })
  response.headers.set('x-is-category-page', isCategoryPage.toString())

  // Refresh session if expired - required for Server Components
  const supabase = createMiddlewareClient({ req: request, res: response })
  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
