"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Update partner account status
export async function updatePartnerStatus(formData: FormData) {
  const supabase = await createClient();
  
  // Check if admin is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/sign-in");
  }
  
  // Verify admin role
  const { data: adminProfile } = await supabase
    .from("UserProfiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
    
  if (!adminProfile || adminProfile.role !== 'admin') {
    console.error("Unauthorized access attempt");
    return redirect("/admin");
  }
  
  const partnerId = formData.get("partner_id") as string;
  const status = formData.get("status") as string;
  
  if (!partnerId || !status || !['active', 'pending', 'suspended'].includes(status)) {
    console.error("Invalid form data");
    return;
  }
  
  // Update partner status
  const { error } = await supabase
    .from("UserProfiles")
    .update({ status })
    .eq("user_id", partnerId);
    
  if (error) {
    console.error("Error updating partner status:", error);
    return;
  }
  
  // Get partner data for notification
  const { data: partner } = await supabase
    .from("UserProfiles")
    .select("company_name")
    .eq("user_id", partnerId)
    .single();
    
  // Create notification for the partner
  await supabase
    .from("CategoryNotifications")
    .insert({
      user_id: partnerId,
      service_category_id: null, // General notification
      type: "account_status_change",
      message: `Your account status has been changed to ${status}.`,
      is_read: false
    });
    
  revalidatePath("/admin/partners");
}

// Update category access status for a partner
export async function updateCategoryAccess(formData: FormData): Promise<void> {
  const supabase = await createClient();
  
  // Check if admin is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/sign-in");
  }
  
  // Verify admin role
  const { data: adminProfile } = await supabase
    .from("UserProfiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
    
  if (!adminProfile || adminProfile.role !== 'admin') {
    console.error("Unauthorized access attempt");
    return redirect("/admin");
  }
  
  const accessId = formData.get("access_id") as string;
  const status = formData.get("status") as string;
  const notes = formData.get("notes") as string;
  const partnerId = formData.get("partner_id") as string;
  const categoryId = formData.get("category_id") as string;
  
  if (!status || !['approved', 'pending', 'rejected'].includes(status) || !partnerId || !categoryId) {
    console.error("Invalid form data");
    return;
  }
  
  // Get category info for notification
  const { data: categoryData } = await supabase
    .from("ServiceCategories")
    .select("name")
    .eq("service_category_id", categoryId)
    .single();
  
  const categoryName = categoryData?.name || "requested";
  
  // If accessId is provided, update existing access
  if (accessId) {
    // Prepare update data
    const updateData: Record<string, any> = { status };
    
    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    } else if (status === 'rejected') {
      updateData.rejected_at = new Date().toISOString();
      updateData.admin_notes = notes;
    }
    
    // Update category access status
    const { error } = await supabase
      .from("UserCategoryAccess")
      .update(updateData)
      .eq("access_id", accessId);
      
    if (error) {
      console.error("Error updating category access:", error);
      return;
    }
  } 
  // If no accessId is provided, create new category access
  else {
    // Check if access for this category already exists
    const { data: existingAccess } = await supabase
      .from("UserCategoryAccess")
      .select("access_id")
      .eq("user_id", partnerId)
      .eq("service_category_id", categoryId)
      .single();
      
    if (existingAccess) {
      console.error("Category access already exists");
      return;
    }
    
    // Create new category access
    const { error } = await supabase
      .from("UserCategoryAccess")
      .insert({
        user_id: partnerId,
        service_category_id: categoryId,
        status: status,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
        is_primary: false
      });
      
    if (error) {
      console.error("Error creating category access:", error);
      return;
    }
  }
  
  // Create notification for the partner
  await supabase
    .from("CategoryNotifications")
    .insert({
      user_id: partnerId,
      service_category_id: categoryId,
      type: "category_access_status",
      message: `Your request for access to the ${categoryName} category has been ${status}.`,
      is_read: false
    });
    
  // If approved, create initial metrics entry
  if (status === 'approved') {
    await supabase
      .from("PartnerMetrics")
      .insert({
        user_id: partnerId,
        service_category_id: categoryId
      }).then(null, (error) => {
        console.error("Error creating partner metrics:", error);
      });
  }
    
  revalidatePath(`/admin/partners/${partnerId}`);
}

// Assign lead to a partner
export async function assignLeadToPartner(formData: FormData) {
  const supabase = await createClient();
  
  // Check if admin is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/sign-in");
  }
  
  // Verify admin role
  const { data: adminProfile } = await supabase
    .from("UserProfiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
    
  if (!adminProfile || adminProfile.role !== 'admin') {
    console.error("Unauthorized access attempt");
    return redirect("/admin");
  }
  
  const leadId = formData.get("lead_id") as string;
  const partnerId = formData.get("partner_id") as string;
  
  if (!leadId || !partnerId) {
    console.error("Invalid form data");
    return;
  }
  
  // Update lead with partner assignment
  const { error } = await supabase
    .from("QuoteSubmissions")
    .update({
      assigned_partner_id: partnerId,
      assignment_date: new Date().toISOString(),
      partner_response_status: 'pending'
    })
    .eq("submission_id", leadId);
    
  if (error) {
    console.error("Error assigning lead:", error);
    return;
  }
  
  // Get lead and category info for notification
  const { data: lead } = await supabase
    .from("QuoteSubmissions")
    .select(`
      service_category_id,
      first_name,
      last_name,
      postcode,
      ServiceCategories(name)
    `)
    .eq("submission_id", leadId)
    .single();
    
  // Create notification for the partner
  await supabase
    .from("CategoryNotifications")
    .insert({
      user_id: partnerId,
      service_category_id: lead?.service_category_id,
      type: "new_lead",
      message: `You have been assigned a new lead for ${lead?.ServiceCategories?.name} in ${lead?.postcode}.`,
      is_read: false
    });
    
  revalidatePath("/admin/quote-submissions");
  return { success: true };
} 