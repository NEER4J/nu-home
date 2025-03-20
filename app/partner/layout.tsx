'use client';

import '../globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Package, FileText, Layers, User, LogOut, Menu as MenuIcon, Settings, BarChart4 } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/sign-in');
          return;
        }
        
        setUser(user);
        
        // Check if user is a partner
        const { data: profileData } = await supabase
          .from('UserProfiles')
          .select('role, is_approved, status, company_name')
          .eq('user_id', user.id)
          .single();
        
        if (!profileData || profileData.role !== 'partner') {
          // Handle unauthorized access
          const { error } = await supabase.auth.signOut();
          router.push('/sign-in?error=Unauthorized access');
          return;
        }
        
        setProfile(profileData);
        
        // Check if partner is not approved
        if (!profileData.is_approved || profileData.status !== 'active') {
          if (window.location.pathname !== '/partner/pending') {
            router.push('/partner/pending');
          }
        }
      } catch (error) {
        console.error('Error in layout:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [router]);
  
  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar - hidden on mobile by default unless menu is open */}
      <div id="sidebar" className={`${menuOpen ? 'block' : 'hidden'} md:flex md:w-64 flex-col bg-white border-r border-gray-200 transition-all duration-300 fixed md:static top-0 left-0 h-screen z-50`}>
        
        {/* Mobile close button - only visible on mobile */}
        <div className="md:hidden p-4 flex justify-end">
          <button onClick={toggleMenu} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* User profile section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">{profile?.company_name || 'Partner'}</span>
              <span className="text-xs text-gray-500">{user?.email}</span>
            </div>
          </div>
        </div>
        
        {/* Navigation links */}
        <nav className="flex-1 py-4 px-2">
          <ul className="space-y-1" id="nav-links">
            <li>
              <Link 
                href="/partner" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
                id="nav-dashboard"
              >
                <BarChart4 className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                href="/partner/products" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
                id="nav-products"
              >
                <Package className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                My Products
              </Link>
            </li>
            <li>
              <Link 
                href="/partner/leads" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
                id="nav-leads"
              >
                <FileText className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                My Leads
              </Link>
            </li>
            <li>
              <Link 
                href="/partner/categories" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
                id="nav-categories"
              >
                <Layers className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Categories
              </Link>
            </li>
            <li className="pt-4 mt-4 border-t border-gray-200">
              <Link 
                href="/partner/profile" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
                id="nav-profile"
              >
                <Settings className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Profile Settings
              </Link>
            </li>
          </ul>
        </nav>
        
        {/* Logout button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-red-50 hover:text-red-600 group"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-500 group-hover:text-red-600" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header with menu toggle */}
        <header className="bg-white border-b border-gray-200 md:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={toggleMenu}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <div className="text-lg font-semibold">Partner Portal</div>
            <div className="w-6"> {/* Empty div for alignment */}</div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-grow overflow-auto"> 
          {children}
        </main>
      </div>
    </div>
  );
}