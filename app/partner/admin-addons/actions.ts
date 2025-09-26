"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addAdminAddonToMyList(adminAddonId: string) {
  const supabase = await createClient();
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // Get the admin addon details
  const { data: adminAddon, error: adminAddonError } = await supabase
    .from("AdminAddons")
    .select("*")
    .eq("admin_addon_id", adminAddonId)
    .eq("is_active", true)
    .single();

  if (adminAddonError || !adminAddon) {
    throw new Error("Admin addon not found or inactive");
  }

  // Check if the partner already has this addon
  const { data: existingAddon } = await supabase
    .from("Addons")
    .select("addon_id")
    .eq("partner_id", user.id)
    .eq("base_admin_addon_id", adminAddonId)
    .single();

  if (existingAddon) {
    throw new Error("You have already added this addon to your list");
  }

  // Create a new addon for the partner based on the admin addon
  const { error: insertError } = await supabase
    .from("Addons")
    .insert({
      partner_id: user.id,
      base_admin_addon_id: adminAddonId,
      title: adminAddon.title,
      description: adminAddon.description,
      price: adminAddon.price,
      image_link: adminAddon.image_link,
      service_category_id: adminAddon.service_category_id,
      addon_type_id: adminAddon.addon_type_id,
      allow_multiple: adminAddon.allow_multiple,
      max_count: adminAddon.max_count,
    });

  if (insertError) {
    console.error("Error adding admin addon to partner list:", insertError);
    throw new Error("Failed to add addon to your list");
  }

  // Revalidate the pages to show the updated state
  revalidatePath("/partner/admin-addons");
  revalidatePath("/partner/addons");
  
  return { success: true };
}
