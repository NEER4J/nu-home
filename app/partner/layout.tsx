"use client";

import '../globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { signOutAction } from '../actions';
import { Home, Package, FileText, Grid, Settings, Bell, LogOut, User, PlusCircle, BarChart2, Tag, Download, Gift, Code, MapPin } from 'lucide-react';
import Loader from '@/components/Loader';
import { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';

const inter = Inter({ subsets: ['latin'] });

interface UserProfile {
  company_name?: string;
  status?: string;
  user_id?: string;
}

interface CategoryAccess {
  ServiceCategories?: {
    name: string;
  };
}

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [categoryAccess, setCategoryAccess] = useState<CategoryAccess[]>([]);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      // Get user session
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (currentUser) {
        // Get partner profile
        const { data: profileData } = await supabase
          .from("UserProfiles")
          .select("*")
          .eq("user_id", currentUser.id)
          .single();
        
        setProfile(profileData as UserProfile);
        
        // Get partner's category access
        const { data: categories } = await supabase
          .from("UserCategoryAccess")
          .select("*, ServiceCategories(name)")
          .eq("user_id", currentUser.id)
          .eq("status", "approved");
        
        setCategoryAccess((categories as unknown as CategoryAccess[]) || []);
        
        // Get unread notification count
        const { count } = await supabase
          .from("CategoryNotifications")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", currentUser.id)
          .eq("is_read", false);
        
        setNotificationCount(count || 0);
      }
    }

    loadData();
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 relative">
      {/* Sidebar - hidden on mobile by default */}
      <div id="sidebar" className="hidden md:flex md:w-60 flex-col h-screen">
        
       
        
        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto p-4 h-full mt-16 fixed top-0 left-0 bg-white border-r border-gray-200">
          <ul className="space-y-1 h-full w-full">
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
                href="/partner/addons" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <Gift className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Addons
              </Link>
            </li>
            
            <li>
              <Link 
                href="/partner/import" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <Download className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Import Products
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
            
            <li>
              <Link 
                href="/partner/integration" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <Code className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Integration
              </Link>
            </li>
            
            <li>
              <Link 
                href="/partner/field-mappings" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <MapPin className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Field Mappings
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
            
            <li className="pt-2">
              <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Account
              </div>
            </li>

            <li>
              <Link 
                href="/partner/notifications" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <Bell className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Notifications
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
            
            <li>
              <Link 
                href="/partner/profile" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 group"
              >
                <User className="mr-3 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                Profile
              </Link>
            </li>
            
            <li>
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
          <h1 className="font-semibold">{profile?.company_name || 'Partner'} Dashboard</h1>
          {/* Mobile menu button - would need JS for toggling sidebar on mobile */}
          <button className="p-2 rounded-md text-gray-500 hover:bg-gray-100">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-6 mt-16"> 
          <Loader /> 
          {children}
        </main>
      </div>
    </div>
  );
} 