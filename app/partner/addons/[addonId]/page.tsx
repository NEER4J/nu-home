"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import AddonForm from "../components/addon-form";
import { ArrowLeft } from "lucide-react";

export default function AddonPage() {
  const router = useRouter();
  const params = useParams();
  const [addon, setAddon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  
  if (!params?.addonId) {
    router.push("/partner/addons");
    return null;
  }
  
  const isNew = params.addonId === "new";

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        
        if (error || !data.user) {
          console.error("Authentication error:", error);
          router.push('/auth/signin');
          return;
        }
        
        setUser(data.user);
        
        if (!isNew && data.user) {
          await fetchAddon(data.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Exception in auth check:", err);
        router.push('/auth/signin');
      }
    };
    
    getUser();
  }, [params.addonId, isNew]);

  const fetchAddon = async (partnerId: string) => {
    try {
      console.log("Fetching addon with ID:", params.addonId, "for partner:", partnerId);
      
      const { data, error } = await supabase
        .from("Addons")
        .select("*")
        .eq("addon_id", params.addonId)
        .eq("partner_id", partnerId)
        .single();

      if (error) {
        console.error("Error fetching addon:", error);
        throw error;
      }
      
      console.log("Fetched addon data:", data);
      setAddon(data);
    } catch (error) {
      console.error("Error fetching addon:", error);
      router.push("/partner/addons");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 px-4">
      <button
        onClick={() => router.push("/partner/addons")}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Addons
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isNew ? "Add New Addon" : "Edit Addon"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Update your addon details and specifications.
        </p>
      </div>

      <AddonForm
        initialData={addon}
        onSuccess={() => router.push("/partner/addons")}
      />
    </div>
  );
} 