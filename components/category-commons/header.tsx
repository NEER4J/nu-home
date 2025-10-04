"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, Phone, Mail, MessageCircle, ExternalLink, X,
  Info, CheckCircle, AlertTriangle, Gift, Megaphone,
  Star, Heart, Zap, Shield, Award, Target, TrendingUp,
  Users, Clock, MapPin, Globe, Settings,
  Lightbulb, Rocket, Crown, Diamond, Flame, Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner';
import { PartnerHighlight } from '@/types/database.types';
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
  const [highlights, setHighlights] = useState<PartnerHighlight[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [dismissedHighlights, setDismissedHighlights] = useState<Set<string>>(new Set());

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
          console.log('Header - Partner loaded:', partner);
          console.log('Header - Company color:', partner.company_color);
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

  // Fetch highlights for the partner
  useEffect(() => {
    async function fetchHighlights() {
      if (!partnerInfo?.user_id) return;

      setHighlightsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('PartnerHighlights')
          .select('*')
          .eq('partner_id', partnerInfo.user_id)
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching highlights:', error);
          return;
        }

        // Filter highlights by date range
        const now = new Date();
        const validHighlights = (data || []).filter(highlight => {
          const startDate = highlight.start_date ? new Date(highlight.start_date as string) : null;
          const endDate = highlight.end_date ? new Date(highlight.end_date as string) : null;

          if (startDate && now < startDate) return false;
          if (endDate && now > endDate) return false;
          return true;
        });

        setHighlights(validHighlights as unknown as PartnerHighlight[]);
      } catch (error) {
        console.error('Error in fetchHighlights:', error);
      } finally {
        setHighlightsLoading(false);
      }
    }

    fetchHighlights();
  }, [partnerInfo?.user_id]);

  // Get dynamic color based on partner info
  const getDynamicColor = () => {
    const color = partnerInfo?.company_color || '#2563eb'; // Default to blue if no company color
    console.log('Header - Partner info:', partnerInfo);
    console.log('Header - Dynamic color:', color);
    return color;
  };

  // Dismiss a highlight
  const dismissHighlight = (highlightId: string) => {
    setDismissedHighlights(prev => new Set(Array.from(prev).concat(highlightId)));
  };

  // Icon mapping
  const iconMap = {
    Info, CheckCircle, AlertTriangle, Gift, Megaphone,
    Star, Heart, Zap, Shield, Award, Target, TrendingUp,
    Users, Clock, MapPin, Globe, Settings,
    Lightbulb, Rocket, Crown, Diamond, Flame, Sparkles
  };

  // Helper function to get icon component
  const getIconComponent = (iconName: string | null) => {
    if (!iconName || !(iconName in iconMap)) {
      return Info; // Default icon
    }
    return iconMap[iconName as keyof typeof iconMap];
  };

  // Helper function to generate color styles from hex color
  const generateColorStyles = (hexColor: string) => {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Use the color as background, text is always white
    const bgColor = `rgb(${r}, ${g}, ${b})`;
    
    return {
      bg: `bg-[${bgColor}]`,
      border: `border-[${bgColor}]`,
      text: `text-white`,
      style: {
        backgroundColor: bgColor,
        borderColor: bgColor,
        color: 'white'
      }
    };
  };

  const getColorSchemeStyles = (colorScheme: string | null) => {
    // Check if it's a hex color
    if (colorScheme && colorScheme.startsWith('#')) {
      return generateColorStyles(colorScheme);
    }

    // Default to blue hex color
    return generateColorStyles('#3B82F6');
  };

  // Filter out dismissed highlights
  const visibleHighlights = highlights.filter(highlight => 
    !dismissedHighlights.has(highlight.highlight_id)
  );

  return (
    <>
      {/* Highlights Bar */}
      {visibleHighlights.length > 0 && (
        <div className="w-full">
          {visibleHighlights.map((highlight) => {
            const colorStyles = getColorSchemeStyles(highlight.color_scheme);
            return (
              <div
                key={highlight.highlight_id}
                className="relative overflow-hidden"
                style={{
                  backgroundColor: colorStyles.style?.backgroundColor || '#3B82F6'
                }}
              >
                <div className="relative px-4 py-3">
                  {/* Desktop: Side by side layout */}
                  <div className="hidden sm:flex items-center max-w-[1480px] mx-auto justify-center">
                    <div className="flex items-center min-w-0 justify-center">
                      {(() => {
                        const IconComponent = getIconComponent(highlight.icon);
                        return <IconComponent className="h-5 w-5 mr-3 text-white flex-shrink-0" />;
                      })()}
                      <h4 className="font-bold text-white text-base mr-4 whitespace-nowrap">
                        {highlight.title}
                      </h4>
                      <p className="text-white text-sm opacity-90 flex-1 min-w-0">
                        {highlight.message}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => dismissHighlight(highlight.highlight_id)}
                      className="ml-4 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors text-white flex-shrink-0"
                      title="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Mobile: Marquee scrolling with overlay button */}
                  <div className="sm:hidden relative overflow-hidden">
                    <div className="flex items-center space-x-4 animate-marquee whitespace-nowrap">
                      {(() => {
                        const IconComponent = getIconComponent(highlight.icon);
                        return <IconComponent className="h-5 w-5 text-white flex-shrink-0" />;
                      })()}
                      <h4 className="font-bold text-white text-base">
                        {highlight.title}
                      </h4>
                      <span className="text-white text-sm opacity-90">
                        {highlight.message}
                      </span>
                    </div>
                    
                    {/* Overlay dismiss button */}
                    <button
                      onClick={() => dismissHighlight(highlight.highlight_id)}
                      className="absolute top-0 right-0 h-full px-1 bg-black bg-opacity-50 rounded-full hover:bg-opacity-30 transition-colors text-white flex items-center"
                      title="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Header */}
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
                <div className="animate-pulse">
                  <div className="h-8 w-24 bg-gray-200 rounded-md"></div>
                </div>
              )}
            </Link>
          </div>

          {/* Help Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center px-4 py-2 text-white rounded-full text-sm font-medium hover:opacity-90 transition-colors"
                style={{ 
                  backgroundColor: getDynamicColor(),
                  border: 'none'
                }}
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
    </>
  );
}
