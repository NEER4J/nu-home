// app/layout.tsx
import '.././globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { signOutAction } from '.././actions';
import { Layout, Menu, Home, ClipboardList, FileText, Layers, User, LogOut, Menu as MenuIcon, X } from 'lucide-react';
import Loader from '@/components/Loader';

const inter = Inter({ subsets: ['latin'] });



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
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
          {/* Sidebar - hidden on mobile by default */}
          {isLoggedIn && (
            <div id="sidebar" className="hidden md:flex md:w-64 flex-col bg-white border-r border-gray-200 transition-all duration-300">
              
              {/* User profile section */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">{user?.email?.split('@')[0] || 'Admin'}</span>
                    <span className="text-xs text-gray-500">{user?.email || ''}</span>
                  </div>
                </div>
              </div>
              
              {/* Navigation links */}
              <nav className="flex-1 py-4 px-2">
                <ul className="space-y-1" id="nav-links">
                  <li>
                    <Link 
                      href="/admin" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
                      id="nav-dashboard"
                    >
                      <Home className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/admin/form-questions" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
                      id="nav-form-questions"
                    >
                      <ClipboardList className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                      Form Questions
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/admin/quote-submissions" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
                      id="nav-submissions"
                    >
                      <FileText className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                      Submissions
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/admin/service-categories" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
                      id="nav-categories"
                    >
                      <Layers className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                      Categories
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/admin/products" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
                      id="nav-products"
                    >
                      <Layers className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                      Products
                    </Link>
                  </li>
                </ul>
              </nav>
              
             
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 flex flex-col">
            {/* Top header for mobile controls */}
         

            {/* Main content area */}
            <main> <Loader /> {children}</main>

           
          </div>
        </div>

  );
}