'use client';

import { createClient } from '@/utils/supabase/client';
import QuoteForm from '@/components/QuoteForm';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner';

interface QuoteFormWrapperProps {
  serviceCategoryId: string;
  serviceCategorySlug: string;
  partnerId: string;
  showThankYou: boolean;
  redirectToProducts: boolean;
}

export default function QuoteFormWrapper({
  serviceCategoryId,
  serviceCategorySlug,
  partnerId,
  showThankYou,
  redirectToProducts,
}: QuoteFormWrapperProps) {
  const router = useRouter();
  const [partnerInfo, setPartnerInfo] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPartnerInfo() {
      try {
        const supabase = await createClient();
        
        // Get hostname from window location
        const hostname = window.location.hostname;
        
        if (hostname && hostname !== 'localhost' && hostname !== 'www') {
          // Fetch partner info by hostname
          const partner = await resolvePartnerByHost(supabase, hostname);

          if (partner) {
            console.log('Found partner info:', partner);
            setPartnerInfo(partner);
          } else {
            setError('Partner not found for this domain');
          }
        }
      } catch (err) {
        console.error('Error in fetchPartnerInfo:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchPartnerInfo();
  }, []);

  const handleSubmitSuccess = async (data: any) => {
    try {
      const supabase = await createClient();
      
      // Get the current hostname
      const hostname = window.location.hostname;
      const isCustomDomain = hostname !== 'localhost' && hostname !== 'www' && hostname !== 'apstic';

      // Get the partner lead submission ID
      const { data: lead, error: leadError } = await supabase
        .from('partner_leads')
        .select('submission_id')
        .eq('email', data.email) // Assuming email is unique for each submission
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (leadError) {
        console.error('Error fetching partner lead:', leadError);
        return;
      }

      // Handle redirection based on category settings
      if (redirectToProducts) {
        const redirectUrl = `/category/${serviceCategorySlug}/products?submission=${lead.submission_id}`;
        router.push(redirectUrl);
      } else if (showThankYou) {
        const redirectUrl = `/category/${serviceCategorySlug}/thank-you?submission=${lead.submission_id}`;
        router.push(redirectUrl);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error handling form submission:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Loading partner information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <QuoteForm 
      serviceCategoryId={serviceCategoryId}
      serviceCategorySlug={serviceCategorySlug}
      redirectToProducts={false} // We handle redirection ourselves
      showThankYouMessage={showThankYou}
      onSubmitSuccess={handleSubmitSuccess}
      partnerId={partnerId}
      partnerInfo={partnerInfo || undefined}
    />
  );
} 