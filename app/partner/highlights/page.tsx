"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import { Plus, AlertCircle } from 'lucide-react';
import { PartnerHighlight } from '@/types/database.types';
import HighlightForm from './components/HighlightForm';
import HighlightsList from './components/HighlightsList';

export default function PartnerHighlightsPage() {
  const router = useRouter();
  const [highlights, setHighlights] = useState<PartnerHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      setLoading(true);
      try {
        // Get current user
        const { data, error } = await supabase.auth.getUser();
        
        if (error || !data.user) {
          console.log("No authenticated user found", error);
          router.push('/auth/signin');
          return;
        }
        
        const currentUser = data.user;
        setUser(currentUser);
        
        // Fetch highlights
        const { data: highlightsData, error: highlightsError } = await supabase
          .from('PartnerHighlights')
          .select('*')
          .eq('partner_id', currentUser.id)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (highlightsError) {
          console.error('Error fetching highlights:', highlightsError);
          setError('Failed to load highlights');
          return;
        }

        setHighlights((highlightsData as unknown as PartnerHighlight[]) || []);
      } catch (err) {
        console.error('Error in checkAuthAndFetchData:', err);
        setError('Failed to load highlights');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }


  const refreshHighlights = async () => {
    if (!user) return;
    
    try {
      const { data: highlightsData, error: highlightsError } = await supabase
        .from('PartnerHighlights')
        .select('*')
        .eq('partner_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (highlightsError) {
        console.error('Error fetching highlights:', highlightsError);
        return;
      }

      setHighlights((highlightsData as unknown as PartnerHighlight[]) || []);
    } catch (err) {
      console.error('Error in refreshHighlights:', err);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Header Highlights
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage special points and announcements that appear in your header
            </p>
          </div>
          <HighlightForm 
            mode="create"
            onSuccess={refreshHighlights}
          />
        </div>
      </div>

      {/* Highlights List */}
      <HighlightsList 
        initialHighlights={highlights}
        onRefresh={refreshHighlights}
      />
    </div>
  );
}
