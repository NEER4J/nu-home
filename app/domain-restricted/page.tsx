"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner';
import { ArrowRight, Star, Phone, Mail } from 'lucide-react';

interface ServiceCategory {
  service_category_id: string;
  name: string;
  slug: string;
}

export default function DomainRestrictedPage() {
  const [partnerInfo, setPartnerInfo] = useState<PartnerProfile | null>(null);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPartnerAndServices() {
      try {
        const supabase = createClient();
        
        // Get hostname from window location
        const hostname = window.location.hostname;
        
        if (hostname && hostname !== 'localhost' && hostname !== 'www') {
          // Fetch partner info by hostname
          const partner = await resolvePartnerByHost(supabase, hostname);

          if (partner) {
            console.log('Found partner info:', partner);
            setPartnerInfo(partner);
            
            // Fetch partner's approved service categories in parallel
            const categoryPromise = supabase
              .from('UserCategoryAccess')
              .select(`
                *,
                ServiceCategories(
                  service_category_id,
                  name,
                  slug
                )
              `)
              .eq('user_id', partner.user_id)
              .eq('status', 'approved');

            const { data: categoryAccess } = await categoryPromise;

            if (categoryAccess && categoryAccess.length > 0) {
              const categories = categoryAccess.map((access: any) => ({
                service_category_id: access.ServiceCategories.service_category_id,
                name: access.ServiceCategories.name,
                slug: access.ServiceCategories.slug
              }));
              setServiceCategories(categories);
            }
          } else {
            setError('Partner not found for this domain');
          }
        } else {
          // No hostname to resolve, show 404 immediately
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error loading partner and services:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    // Add a small delay to prevent flash of loading state
    const timer = setTimeout(() => {
      loadPartnerAndServices();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[90vh] max-w-[700px] mx-auto flex flex-col items-center justify-center p-5">
        <div className="w-full">
          {/* Skeleton for logo */}
          <div className="h-10 w-32 bg-gray-200 rounded mb-8 animate-pulse"></div>
          
          {/* Skeleton for header */}
          <div className="space-y-4 mb-8">
            <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          {/* Skeleton for service cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
          
          {/* Skeleton for contact info */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // If partner detected, show service showcase
  if (partnerInfo && serviceCategories.length > 0) {
    const brandColor = partnerInfo.company_color || '#2563eb';
    const isLightColor = brandColor === '#ffffff' || brandColor === '#fff' || brandColor === 'white';
    
    return (
      <div className="min-h-[90vh] max-w-[700px] mx-auto flex flex-col items-center justify-center p-5">
        

        {/* Header */}
        <div className="text-left">
          {/* Logo */}
        {partnerInfo.logo_url && (
          <div className="mb-8 w-full">
            <img 
              src={partnerInfo.logo_url} 
              alt={`${partnerInfo.company_name} logo`}
              className="h-10 w-auto object-contain"
            />
          </div>
        )}
          <h1 className="text-3xl md:text-6xl font-bold text-gray-800 mb-4">
            Oops! You're at the wrong place
          </h1>
         
          <p className="text-lg text-gray-600">
            Discover our range of services and get free a quote today
          </p>
        </div>

        {/* Service Cards */}
        <div className="max-w-6xl py-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceCategories.map((category) => (
              <Link
                key={category.service_category_id}
                href={`/${category.slug}/quote`}
                className="group relative rounded-2xl p-6 text-white hover:opacity-90 transition-opacity duration-300"
                style={{ backgroundColor: brandColor }}
              >
                {/* Service Content */}
                <div>
                  <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                  <p className="text-white/80 mb-6">
                    {category.slug === 'solar' && 'Designed for UK weather'}
                    {category.slug === 'battery' && 'Charge at night, for cheap'}
                    {!['solar', 'battery'].includes(category.slug) && 'Professional installation'}
                  </p>
                  
                  {/* CTA Button */}
                  <div className="flex justify-end">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isLightColor ? 'bg-gray-800 group-hover:bg-gray-700' : 'bg-white group-hover:bg-gray-100'
                    }`}>
                      <ArrowRight className={`w-6 h-6 ${
                        isLightColor ? 'text-white' : 'text-gray-800'
                      }`} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
            {partnerInfo.phone && (
              <p className="text-lg flex items-center gap-2" style={{ textDecoration: 'underline' }}>
                <Phone className="w-5 h-5" />
                {partnerInfo.phone}
              </p>
            )}
            <p className="text-lg flex items-center gap-2" style={{ textDecoration: 'underline' }}>
              <Mail className="w-5 h-5" />
              info@{partnerInfo.company_name?.toLowerCase().replace(/\s+/g, '')}.com
            </p>
          </div>

       
      </div>
    );
  }

  // Show sign-in page when no partner is found
  return (
    <div className="min-h-[90vh] max-w-[700px] mx-auto flex flex-col items-center justify-center p-5">
      <div className="w-full">
        <div className="p-8">
          <div className="mb-8 text-left">
          <h1 className="text-3xl md:text-6xl font-bold text-gray-800 mb-4">
            Oops! You're at the wrong place
          </h1>
            <p className="text-gray-500 mb-3">
              Sign in to access your account
            </p>
            
          </div>
          
          <div className="space-y-5">
            <Link
              href="/sign-in"
              className="w-full h-12 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition duration-150 flex items-center justify-center"
            >
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
        
        
      </div>
    </div>
  );
}
