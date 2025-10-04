"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner';

interface FooterProps {
  partnerInfo?: PartnerProfile;
  hideOnPages?: string[];
}

export default function Footer({ partnerInfo: propPartnerInfo, hideOnPages = [] }: FooterProps) {
  const [partnerInfo, setPartnerInfo] = useState<PartnerProfile | null>(propPartnerInfo || null);
  const [loading, setLoading] = useState(!propPartnerInfo);
  const pathname = usePathname();

  // Fetch partner info by host (custom domain preferred, fallback to subdomain) if not provided as prop
  useEffect(() => {
    async function fetchPartnerByHost() {
      if (propPartnerInfo) {
        setPartnerInfo(propPartnerInfo);
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const hostname = window.location.hostname;
        const partner = await resolvePartnerByHost(supabase, hostname);
        
        if (partner) {
          setPartnerInfo(partner);
        }
      } catch (error) {
        console.error('Error resolving partner from host:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPartnerByHost();
  }, [propPartnerInfo]);

  // Check if current page needs extra bottom padding for mobile bottom bar
  const needsExtraPadding = pathname?.includes('/addons') || pathname?.includes('/checkout');
  
  // Check if footer should be hidden on current page
  const shouldHideFooter = hideOnPages.some(page => pathname?.includes(page));

  // Don't render footer if it should be hidden
  if (shouldHideFooter) {
    return null;
  }

  return (
    <footer className={`border-t border-gray-200 w-full ${needsExtraPadding ? 'pb-20 md:pb-0' : ''}`}>
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex flex-col sm:flex-row md:justify-between justify-start space-y-4 sm:space-y-0 items-center">
            {/* Logo */}
            <div className="flex items-center w-full md:w-auto">
              {partnerInfo?.logo_url ? (
                <img
                  src={partnerInfo.logo_url}
                  alt={partnerInfo.company_name}
                  className="h-8 w-auto"
                />
              ) : (
                <div className="animate-pulse">
                  <div className="h-8 w-24 bg-gray-200 rounded-md"></div>
                </div>
              )}
            </div>

            {/* Copyright Text */}
            <div className="text-left">
              <p className="text-sm text-gray-600">
                The content on this website is owned by us and our licensors. Do not copy any content (including images) without our consent.
              </p>
            </div>

            {/* Links */}
            <div className="flex items-center space-x-6 w-full md:w-auto">
              <Link 
                href={partnerInfo?.privacy_policy || '/privacy-policy'} 
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                href={partnerInfo?.terms_conditions || '/terms-and-conditions'} 
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
