"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import { Plus, AlertCircle } from 'lucide-react';
import { PartnerKeyPoint } from '@/types/database.types';
import KeyPointForm from './components/KeyPointForm';
import KeyPointsList from './components/KeyPointsList';

export default function PartnerKeyPointsPage() {
  const router = useRouter();
  const [keyPoints, setKeyPoints] = useState<PartnerKeyPoint[]>([]);
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
        
        // Fetch key points
        const { data: keyPointsData, error: keyPointsError } = await supabase
          .from('PartnerKeyPoints')
          .select('*')
          .eq('partner_id', currentUser.id)
          .order('position', { ascending: true });

        if (keyPointsError) {
          console.error('Error fetching key points:', keyPointsError);
          setError('Failed to load key points');
          return;
        }

        setKeyPoints((keyPointsData as unknown as PartnerKeyPoint[]) || []);
      } catch (err) {
        console.error('Error in checkAuthAndFetchData:', err);
        setError('Failed to load key points');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchData();
  }, [router, supabase]);

  const refreshKeyPoints = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('PartnerKeyPoints')
        .select('*')
        .eq('partner_id', user.id)
        .order('position', { ascending: true });

      if (error) {
        console.error('Error fetching key points:', error);
        return;
      }

      setKeyPoints((data as unknown as PartnerKeyPoint[]) || []);
    } catch (err) {
      console.error('Error in refreshKeyPoints:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className=" mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Header Key Points</h1>
          <p className="mt-2 text-gray-600">
            Manage the 4 key points that appear below your header to highlight your main benefits.
          </p>
        </div>

        <KeyPointsList 
          initialKeyPoints={keyPoints}
          onRefresh={refreshKeyPoints}
        />
      </div>
    </div>
  );
}
