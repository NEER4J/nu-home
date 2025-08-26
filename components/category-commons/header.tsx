"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Phone, Mail, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  partnerInfo?: PartnerProfile;
}

export default function Header({ partnerInfo: propPartnerInfo }: HeaderProps) {
  const [partnerInfo, setPartnerInfo] = useState<PartnerProfile | null>(propPartnerInfo || null);
  const [loading, setLoading] = useState(!propPartnerInfo);

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

  // Get dynamic color based on partner info
  const getDynamicColor = () => {
    return partnerInfo?.company_color || '#000000'; // Default to black if no company color
  };

  return (
    <header className="bg-white border-b border-gray-200 w-full z-50">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - Dynamic based on partner or default */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              {partnerInfo?.logo_url ? (
                <img
                  src={partnerInfo.logo_url}
                  alt={partnerInfo.company_name}
                  className="h-8 w-auto"
                />
              ) : (
                <div className="bg-black text-white px-3 py-1 rounded-md font-bold text-lg">
                  {partnerInfo?.company_name}
                </div>
              )}
              {partnerInfo && !partnerInfo.logo_url && (
                <span className="text-gray-600 text-sm">
                  {partnerInfo.company_name}
                </span>
              )}
            </Link>
          </div>

          {/* Help Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center px-4 py-2 text-white rounded-full text-sm font-medium hover:opacity-90 transition-colors"
                style={{ backgroundColor: getDynamicColor() }}
              >
                Help
                <ChevronDown className="ml-2 h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 p-0 rounded-2xl" align="end">
              <div className="p-2">
                {/* Chat Option */}
                <DropdownMenuItem className="!hidden flex items-center space-x-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors mb-4 p-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getDynamicColor()}15` }}>
                      <MessageCircle className="h-5 w-5" style={{ color: getDynamicColor() }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Chat with us</p>
                    <button className="text-sm text-gray-600 hover:text-gray-800 underline">
                      Start chat
                    </button>
                  </div>
                </DropdownMenuItem>

                {/* Call Option */}
                <DropdownMenuItem className="!hidden flex items-center space-x-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors p-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getDynamicColor()}15` }}>
                      <Phone className="h-5 w-5" style={{ color: getDynamicColor() }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">We'll call you</p>
                    <button className="text-sm text-gray-900 hover:text-gray-700 underline font-medium">
                      Request callback
                    </button>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="hidden" />

                {/* Dynamic Phone Number or Default */}
                <div className="px-3 py-2">
                  <p className="text-xs text-gray-500 mb-1">
                    {partnerInfo ? `Speak to ${partnerInfo.company_name}` : 'Speak to our team'}
                  </p>
                  <a
                    href={`tel:${partnerInfo?.phone?.replace(/\s/g, '') || '03301131333'}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {partnerInfo?.phone || '0330 113 1333'}
                  </a>
                  <div className="flex items-center mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-500">Lines are open</span>
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Dynamic Email or Default */}
                <div className="px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" style={{ color: getDynamicColor() }} />
                    <a
                      href={`mailto:${partnerInfo?.contact_person ? `info@${partnerInfo.subdomain}.com` : ''}`}
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      {partnerInfo?.contact_person ? `info@${partnerInfo.subdomain}.com` : ''}
                    </a>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
