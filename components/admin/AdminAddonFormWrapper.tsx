"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import AddonForm from "@/app/partner/addons/components/addon-form";

interface AdminAddonFormWrapperProps {
  initialData?: any;
  isEditing?: boolean;
}

export default function AdminAddonFormWrapper({ initialData, isEditing = false }: AdminAddonFormWrapperProps) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

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
      } catch (err) {
        console.error("Exception in auth check:", err);
        router.push('/auth/signin');
      }
    };
    
    getUser();
  }, []);

  // Custom submit handler that saves to AdminAddons table instead of Addons
  const handleAdminAddonSubmit = async (formData: any) => {
    if (!user) return;

    try {
      // Generate slug from title
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const addonData = {
        title: formData.title,
        slug: slug,
        description: formData.description,
        price: formData.price,
        image_link: formData.image_link || null,
        service_category_id: formData.service_category_id,
        addon_type_id: formData.addon_type_id,
        allow_multiple: formData.allow_multiple,
        max_count: formData.allow_multiple && formData.max_count ? formData.max_count : null,
        is_featured: false, // Default to false for admin addons
        is_active: true, // Default to true for admin addons
        created_by_admin_id: user.id,
      };

      if (isEditing && initialData?.admin_addon_id) {
        const { error } = await supabase
          .from('AdminAddons')
          .update(addonData)
          .eq('admin_addon_id', initialData.admin_addon_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('AdminAddons')
          .insert([addonData]);

        if (error) throw error;
      }

      // Redirect back to admin addons page
      router.push('/admin/addons');
      router.refresh();
    } catch (error) {
      console.error('Error saving admin addon:', error);
      throw error; // Let the AddonForm component handle the error display
    }
  };

  if (!user) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
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
    <AddonForm
      initialData={initialData}
      onSuccess={() => router.push('/admin/addons')}
      customSubmitHandler={handleAdminAddonSubmit}
      isAdminMode={true}
    />
  );
}
