import '../globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { signOutAction } from '../actions';
import { Home, Package, FileText, Grid, Settings, Bell, LogOut, User, PlusCircle, BarChart2, Tag } from 'lucide-react';
import Loader from '@/components/Loader';

const inter = Inter({ subsets: ['latin'] });

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get partner profile
  let profile = null;
  let categoryAccess = [];
  let notificationCount = 0;
  
  if (user) {
    const { data: profileData } = await supabase
      .from("UserProfiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    profile = profileData;
    
    // Get partner's category access
    const { data: categories } = await supabase
      .from("UserCategoryAccess")
      .select("*, ServiceCategories(name)")
      .eq("user_id", user.id)
      .eq("status", "approved");
    
    categoryAccess = categories || [];
    
    // Get unread notification count
    const { count } = await supabase
      .from("CategoryNotifications")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    
    notificationCount = count || 0;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar - hidden on mobile by default */}
      <div id="sidebar" className="hidden md:flex md:w-64 flex-col bg-white border-r border-gray-200">
        
        {/* User profile section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">{profile?.company_name || 'Partner'}</span>
              <span className="text-xs text-gray-500">{user?.email || ''}</span>
            </div>
          </div>
          {profile?.status === 'pending' && (
            <div className="mt-2 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded flex items-center">
              <span className="mr-1">●</span> Pending Approval
            </div>
          )}
        </div>
        
        {/* Navigation links */}
        <nav className="flex-1 py-4 px-2">
          <ul className="space-y-1">
            <li>
              <Link 
                href="/partner" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <Home className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Dashboard
              </Link>
            </li>
            
            <li className="pt-2">
              <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Products & Categories
              </div>
            </li>
            
            <li>
              <Link 
                href="/partner/my-products" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <Package className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                My Products
              </Link>
            </li>
            
            <li>
              <Link 
                href="/partner/admin-products" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <Tag className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Admin Products
              </Link>
            </li>
            
            <li>
              <Link 
                href="/partner/category-access" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <Grid className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Category Access
              </Link>
            </li>
            
            <li className="pt-2">
              <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Leads & Analytics
              </div>
            </li>
            
            <li>
              <Link 
                href="/partner/leads" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <FileText className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Leads
              </Link>
            </li>
            
            <li>
              <Link 
                href="/partner/performance" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <BarChart2 className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Performance
              </Link>
            </li>
            
            <li className="pt-2">
              <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Account
              </div>
            </li>
            
            <li>
              <Link 
                href="/partner/notifications" 
                className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <span className="flex items-center">
                  <Bell className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                  Notifications
                </span>
                {notificationCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {notificationCount}
                  </span>
                )}
              </Link>
            </li>
            
            <li>
              <Link 
                href="/partner/settings" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <Settings className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Settings
              </Link>
            </li>
            
            <li className="mt-6">
              <form action={signOutAction}>
                <button
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-red-50 hover:text-red-600 group"
                  type="submit"
                >
                  <LogOut className="mr-3 h-5 w-5 text-gray-500 group-hover:text-red-600" />
                  Sign out
                </button>
              </form>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top header for mobile */}
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden">
          <h1 className="font-semibold">Partner Dashboard</h1>
          {/* Mobile menu button - would need JS for toggling sidebar on mobile */}
          <button className="p-2 rounded-md text-gray-500 hover:bg-gray-100">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-6"> 
          <Loader /> 
          {children}
        </main>
      </div>
    </div>
  );
} 