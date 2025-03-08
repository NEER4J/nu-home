// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { signOutAction } from './actions';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Nu-Home | Home Improvement Quotes',
  description: 'Get free quotes for home improvement services',
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
  
  // Check if current path is under admin
  const isAdminPage = false; // This will be determined client-side

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center">
                  <span className="text-blue-600 font-bold text-xl">Nu-Home</span>
                </Link>
              </div>
              <nav className="hidden md:flex space-x-8">
                {/* Admin navigation - only visible when logged in */}
                {isLoggedIn && (
                  <>
                    <Link href="/admin" className="text-blue-600 hover:text-blue-800 px-3 py-2 text-sm font-medium">
                      Dashboard
                    </Link>
                    <Link href="/admin/form-questions" className="text-blue-600 hover:text-blue-800 px-3 py-2 text-sm font-medium">
                      Form Questions
                    </Link>
                    <Link href="/admin/quote-submissions" className="text-blue-600 hover:text-blue-800 px-3 py-2 text-sm font-medium">
                      Submissions
                    </Link>
                    <Link href="/admin/service-categories" className="text-blue-600 hover:text-blue-800 px-3 py-2 text-sm font-medium">
                      Categories
                    </Link>
                  </>
                )}
              </nav>
              <div className="hidden md:flex">
                {isLoggedIn ? (
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
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
              {/* Mobile menu button */}
              <div className="md:hidden flex items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  aria-expanded="false"
                >
                  <span className="sr-only">Open main menu</span>
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Admin header bar - we need to use client-side detection for this */}
        <div id="admin-header-container"></div>

        <main className="min-h-screen">{children}</main>

        {/* Footer */}
        <footer className="bg-gray-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h3 className="text-lg font-semibold mb-4 text-center">Nu-Home</h3>
            <div className="mt-8 pt-8 border-t border-gray-700">
              <p className="text-gray-400 text-sm text-center">
                &copy; {new Date().getFullYear()} Nu-Home. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

        {/* Add client-side script to detect admin pages */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const isAdminPage = window.location.pathname.startsWith('/admin');
                if (isAdminPage && ${isLoggedIn}) {
                  const container = document.getElementById('admin-header-container');
                  if (container) {
                    container.innerHTML = \`
                      <div class="bg-blue-600 text-white shadow-md">
                        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                          <div class="flex items-center justify-between h-12">
                            <div class="flex items-center">
                              <span class="font-semibold">Admin Area</span>
                            </div>
                            <div class="flex items-center space-x-4 text-sm">
                              <a href="/admin" class="text-white hover:text-blue-100">Dashboard</a>
                              <a href="/" class="text-white hover:text-blue-100">View Site</a>
                            </div>
                          </div>
                        </div>
                      </div>
                    \`;
                  }
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}