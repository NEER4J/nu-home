import { createClient } from '@/utils/supabase/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  // Create Supabase client
  const supabase = createClient(request);

  // Check authentication for protected routes
  if (path.startsWith('/partner') || path.startsWith('/admin')) {
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
  }

  // Handle subdomains
  const isLocalhost = hostname.includes('localhost');
  const isVercel = hostname.includes('vercel.app');
  
  // Define main domain based on environment
  let mainDomain: string;
  if (isLocalhost) {
    mainDomain = 'localhost:3000';
  } else if (isVercel) {
    // Extract the main vercel domain
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
    // For Vercel preview URLs, extract subdomain from the first part
    const parts = hostname.split('-');
    if (parts.length > 1) {
      subdomain = parts[0];
    }
  } else {
    // For production
    subdomain = hostname.replace(`.${mainDomain}`, '');
    if (subdomain === hostname) subdomain = null;
  }

  // Check if we need to handle subdomain logic
  const isProtectedPath = path.includes('/quote') || path.includes('/products');
  
  if (isProtectedPath) {
    // If there's already a partner_subdomain parameter, skip subdomain processing
    if (searchParams.has('partner_subdomain')) {
      return NextResponse.next();
    }

    if (subdomain) {
      try {
        const { data: profile } = await supabase
          .from('UserProfiles')
          .select('user_id, status')
          .eq('subdomain', subdomain)
          .eq('status', 'active')
          .single();

        if (profile) {
          // Valid subdomain, add it as a parameter
          const url = new URL(request.url);
          url.searchParams.set('partner_subdomain', subdomain);
          return NextResponse.rewrite(url);
        }
      } catch (error) {
        console.error('Error checking subdomain:', error);
      }
    }

    // Only redirect if we're not already on the main domain
    if (hostname !== mainDomain) {
      const protocol = isLocalhost ? 'http' : 'https';
      const redirectUrl = new URL(path, `${protocol}://${mainDomain}`);
      searchParams.forEach((value, key) => redirectUrl.searchParams.set(key, value));
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
