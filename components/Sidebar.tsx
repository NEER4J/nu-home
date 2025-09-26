"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { signOutAction } from '@/app/actions';
import React, { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LucideIcon, User, Settings, LogOut, Menu, X } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string; // Optional section heading
}

interface UserProfile {
  profile_id?: string;
  user_id?: string;
  company_name?: string;
  contact_person?: string;
  address?: string | null;
  phone?: string | null;
  postcode?: string;
  status?: string;
  verification_data?: any;
  business_description?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
  tier_id?: string | null;
  role?: string;
  subdomain?: string | null;
  company_color?: string | null;
  otp?: boolean | null;
  smtp_settings?: any;
  twilio_settings?: any;
  stripe_settings?: any;
  kanda_settings?: any;
  custom_domain?: string | null;
  domain_verified?: boolean | null;
  header_code?: string | null;
  footer_code?: string | null;
  body_code?: string | null;
  privacy_policy?: string | null;
  terms_conditions?: string | null;
}

interface SidebarProps {
  navItems: NavItem[];
  showProfile?: boolean;
  profileType?: 'partner' | 'admin';
}

export default function Sidebar({ navItems, showProfile = true, profileType = 'partner' }: SidebarProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const pathname = usePathname();
  const supabase = createClient();

  // Helper function to determine if a link is active
  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/partner' || href === '/admin') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setProfileLoading(true);
        
        // Get user session
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        if (currentUser && showProfile && profileType === 'partner') {
          // Get partner profile
          const { data: profileData, error: profileError } = await supabase
            .from("UserProfiles")
            .select("profile_id, user_id, company_name, contact_person, address, phone, postcode, status, business_description, website_url, logo_url, company_color, subdomain, custom_domain")
            .eq("user_id", currentUser.id)
            .single();
          
          if (profileError) {
            console.error('Error loading profile:', profileError);
            console.error('Profile error details:', profileError.details, profileError.hint, profileError.message);
            setProfile({});
          } else {
            console.log('Profile data loaded successfully:', profileData);
            console.log('Company name:', profileData?.company_name);
            console.log('Logo URL:', profileData?.logo_url);
            setProfile(profileData as UserProfile);
          }
        }
      } catch (error) {
        console.error('Error in loadData:', error);
      } finally {
        setProfileLoading(false);
      }
    }

    loadData();
  }, [showProfile, profileType]);

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md border border-gray-200"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-600" />
        ) : (
          <Menu className="h-6 w-6 text-gray-600" />
        )}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-screen w-60 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:flex md:w-60 md:flex-col
      `}>
        {/* Logo Section */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center space-x-2">
           
            <span className="text-lg font-semibold text-gray-900">Ai For Trades</span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1 hover:bg-gray-100 rounded-md"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto p-4 flex flex-col">
          <ul className="space-y-1 w-full flex-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const showSectionHeading = item.section && (index === 0 || navItems[index - 1]?.section !== item.section);
              
              return (
                <React.Fragment key={item.href}>
                  {showSectionHeading && (
                    <li className="pt-5">
                      <div className="px-2 text-sm text-gray-400">
                        {item.section}
                      </div>
                    </li>
                  )}
                  <li>
                    <Link 
                      href={item.href} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-2 py-2 text-sm rounded-md group ${
                        isActive(item.href)
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${
                        isActive(item.href)
                          ? 'text-blue-600'
                          : 'text-gray-500 group-hover:text-blue-600'
                      }`} />
                      {item.label}
                    </Link>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
          
          {/* Profile Section - Bottom of sidebar */}
          {showProfile && (
            <div className="mt-auto pt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                    <div className="flex items-center">
                      {/* Profile Avatar/Logo */}
                      <div className="flex-shrink-0 mr-3">
                        {profileType === 'partner' && profile?.logo_url ? (
                          <img 
                            src={profile.logo_url} 
                            alt={`${profile.company_name || 'Company'} logo`}
                            className="w-8 h-8 rounded-full object-contain p-1 border border-gray-200"
                            onError={(e) => {
                              console.log('Logo failed to load:', profile.logo_url);
                              e.currentTarget.style.display = 'none';
                              // Show fallback
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-gray-200 ${profileType === 'partner' && profile?.logo_url ? 'hidden' : 'flex'}`}
                        >
                          <span className="text-sm font-semibold text-blue-600">
                            {profileType === 'partner' 
                              ? (profile?.company_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U')
                              : (user?.email?.charAt(0)?.toUpperCase() || 'A')
                            }
                          </span>
                        </div>
                      </div>
                      
                      {/* Profile Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {profileLoading ? 'Loading...' : (
                            profileType === 'partner' 
                              ? (profile?.company_name || 'Company Name')
                              : (user?.email?.split('@')[0] || 'Admin')
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user?.email || 'Loading...'}
                        </div>
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
              
                  <DropdownMenuItem asChild>
                    <Link href={profileType === 'partner' ? '/partner/settings' : '/admin/settings'} className="w-full flex items-center text-gray-600 hover:text-gray-700 cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild> 
                    <form action={signOutAction} className="w-full">
                      <button
                        type="submit"
                        className="w-full flex items-center text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </nav>
      </div>
    </>
  );
}