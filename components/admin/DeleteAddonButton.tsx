"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface DeleteAddonButtonProps {
  addonId: string;
  addonTitle: string;
}

export function DeleteAddonButton({ addonId, addonTitle }: DeleteAddonButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${addonTitle}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('AdminAddons')
        .delete()
        .eq('admin_addon_id', addonId);

      if (error) {
        console.error('Error deleting addon:', error);
        alert('Failed to delete addon. Please try again.');
        return;
      }

      // Refresh the page to show updated list
      router.refresh();
    } catch (error) {
      console.error('Error deleting addon:', error);
      alert('Failed to delete addon. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}
