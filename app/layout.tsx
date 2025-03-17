// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { signOutAction } from './actions';
import { LogOut } from 'lucide-react';
import Loader from '@/components/Loader';
import { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nu-Home',
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

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen bg-gray-50">
          {/* Main content */}
          <div className="flex-1 flex flex-col">
            {/* Top header with logo and sign in/out button */}
            <header className="bg-white -sm border-b border-gray-200">
              <div className="px-4 sm:px-4 lg:px-4">
                <div className="flex justify-between h-16 items-center">
                  <Link href="/" className="flex items-center">
                    <span className="text-blue-600 font-bold text-xl">Nu-Home</span>
                  </Link>
                  
                  {/* Sign in/out button */}
                  <div>
                    {isLoggedIn ? (
                      <form action={signOutAction}>
                        <button
                          type="submit"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </button>
                      </form>
                    ) : (
                      <Link
                        href="/sign-in"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Admin Login
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Main content area */}
            <main className="">
            <Loader />
              {children}
              </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-4">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="text-gray-500 text-sm text-center">
                  &copy; {new Date().getFullYear()} Nu-Home. All rights reserved.
                </p>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}