// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { createClient } from '@/utils/supabase/server';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Quote AI',
  description: 'Home services and products',
  metadataBase: new URL('http://localhost:3000'),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;
  
  // Get user profile for company name and logo
  let companyName = undefined;
  let logoUrl = undefined;
  if (user) {
    const { data: profile } = await supabase
      .from('UserProfiles')
      .select('company_name, logo_url')
      .eq('user_id', user.id)
      .single();
    companyName = profile?.company_name;
    logoUrl = profile?.logo_url;
  }

  // Check if we're on the domain-restricted page
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isDomainRestricted = pathname.includes('/domain-restricted');

  return (
    <html lang="en">
      <body className={inter.className}>
        {isDomainRestricted ? (
          // For domain-restricted page, render without header
          <div className="min-h-screen bg-white">
            {children}
          </div>
        ) : (
          // For all other pages, render with header
          <div className="flex flex-col h-screen bg-gray-50">
            {/* Main content */}
            <div className="flex-1 flex flex-col">

              {/* Main content area */}
              <main className="">
                {children}
              </main>
             
            </div>
          </div>
        )}
        <Toaster />
      </body>
    </html>
  );
}