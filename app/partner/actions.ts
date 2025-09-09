"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Request access to a service category for a partner
 */
export async function requestCategoryAccess(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("You must be logged in to request category access");
  }
  
  // Get the category ID from the form data
  const categoryId = formData.get("categoryId") as string;
  const notes = formData.get("notes") as string;
  
  if (!categoryId) {
    throw new Error("Category ID is required");
  }
  
  try {
    // Check if a request already exists
    const { data: existingRequest } = await supabase
      .from("UserCategoryAccess")
      .select("*")
      .eq("user_id", user.id)
      .eq("service_category_id", categoryId)
      .single();
    
    if (existingRequest) {
      // If already approved, no need to request again
      if (existingRequest.status === "approved") {
        throw new Error("You already have access to this category");
      }
      
      // If rejected or pending, update the request
      const { error: updateError } = await supabase
        .from("UserCategoryAccess")
        .update({
          notes: notes,
          status: "pending",
          updated_at: new Date().toISOString()
        })
        .eq("access_id", existingRequest.access_id);
      
      if (updateError) throw updateError;
    } else {
      // Create a new request
      const { error: insertError } = await supabase
        .from("UserCategoryAccess")
        .insert({
          user_id: user.id,
          service_category_id: categoryId,
          status: "pending",
          notes: notes
        });
      
      if (insertError) throw insertError;
    }
    
    revalidatePath("/partner/category-access");
  } catch (error: any) {
    console.error("Error requesting category access:", error);
    throw error;
  }
}

/**
 * Create a new product for a partner
 */
export async function createPartnerProduct(formData: FormData) {
  const supabase = await createClient();
  
  // Get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("Session error:", sessionError);
    return { error: "Authentication error: Session verification failed. Please refresh and try again." };
  }
  
  if (!session) {
    return { error: "Authentication error: You need to be logged in to create a product." };
  }
  
  const user = session.user;
  
  try {
    // Get the form data
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const slug = formData.get("slug") as string;
    const price = parseFloat(formData.get("price") as string) || null;
    const categoryId = formData.get("categoryId") as string;
    const productFields = JSON.parse(formData.get("product_fields") as string || "{}");
    const imageUrl = formData.get("imageUrl") as string || null;
    const isActive = formData.get("isActive") === "true";
    const fromTemplateId = formData.get("fromTemplateId") as string || null;
    
    // Validate required fields
    if (!name || !slug || !categoryId) {
      return { error: "Name, slug, and category are required" };
    }
    
    // Check if user has access to this category
    const { data: categoryAccess } = await supabase
      .from("UserCategoryAccess")
      .select("*")
      .eq("user_id", user.id)
      .eq("service_category_id", categoryId)
      .eq("status", "approved")
      .single();
    
    if (!categoryAccess) {
      return { error: "You don't have access to this category" };
    }
    
    // Create the partner product
    const { error: insertError } = await supabase
      .from("PartnerProducts")
      .insert({
        partner_id: user.id,
        name,
        slug,
        description,
        price,
        service_category_id: categoryId,
        product_fields: productFields,
        image_url: imageUrl,
        is_active: isActive,
        base_product_id: fromTemplateId
      });
    
    if (insertError) {
      console.error("Insert error:", insertError);
      
      if (insertError.message.includes("duplicate key")) {
        return { error: "A product with this slug already exists. Try again." };
      }
      
      if (insertError.message.includes("permission denied") || 
          insertError.message.includes("policy")) {
        return { error: "You don't have permission to create this product. Please refresh and try again." };
      }
      
      throw insertError;
    }
    
    revalidatePath("/partner/my-products");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating product:", error);
    return { error: error.message || "Failed to create product" };
  }
}

/**
 * Update an existing partner product
 */
export async function updatePartnerProduct(formData: FormData) {
  const supabase = await createClient();
  
  // Get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("Session error:", sessionError);
    return { error: "Authentication error: Session verification failed. Please refresh and try again." };
  }
  
  if (!session) {
    return { error: "Authentication error: You need to be logged in to update a product." };
  }
  
  const user = session.user;
  
  try {
    // Get the form data
    const productId = formData.get("productId") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const slug = formData.get("slug") as string;
    const price = parseFloat(formData.get("price") as string) || null;
    const categoryId = formData.get("categoryId") as string;
    const productFields = JSON.parse(formData.get("product_fields") as string || "{}");
    const imageUrl = formData.get("imageUrl") as string || null;
    const isActive = formData.get("isActive") === "true";
    
    // Validate required fields
    if (!productId || !name || !slug || !categoryId) {
      return { error: "Product ID, name, slug, and category are required" };
    }
    
    // Check if user has access to this category
    const { data: categoryAccess } = await supabase
      .from("UserCategoryAccess")
      .select("*")
      .eq("user_id", user.id)
      .eq("service_category_id", categoryId)
      .eq("status", "approved")
      .single();
    
    if (!categoryAccess) {
      return { error: "You don't have access to this category" };
    }
    
    // Update the partner product
    const { error: updateError } = await supabase
      .from("PartnerProducts")
      .update({
        name,
        slug,
        description,
        price,
        service_category_id: categoryId,
        product_fields: productFields,
        image_url: imageUrl,
        is_active: isActive
      })
      .eq("partner_product_id", productId)
      .eq("partner_id", user.id); // Important: Add this to ensure RLS policy works
    
    if (updateError) {
      console.error("Update error:", updateError);
      
      if (updateError.message.includes("duplicate key")) {
        return { error: "A product with this slug already exists. Try again." };
      }
      
      if (updateError.message.includes("permission denied") || 
          updateError.message.includes("policy")) {
        return { error: "You don't have permission to update this product. Please refresh and try again." };
      }
      
      throw updateError;
    }
    
    revalidatePath("/partner/my-products");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating product:", error);
    return { error: error.message || "Failed to update product" };
  }
}

/**
 * Delete a partner product
 */
export async function deletePartnerProduct(formData: FormData) {
  const supabase = await createClient();
  
  try {
    // Explicitly check the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Session error:", sessionError);
      return { error: "Authentication error: Session verification failed. Please refresh and try again." };
    }
    
    if (!session) {
      return { error: "Authentication error: You need to be logged in to delete a product." };
    }
    
    const user = session.user;
    
    // Get the product ID from the form data
    const productId = formData.get("productId") as string;
    
    if (!productId) {
      return { error: "Product ID is required" };
    }
    
    // Check if product belongs to this user
    const { data: product, error: productError } = await supabase
      .from("PartnerProducts")
      .select("*")
      .eq("partner_product_id", productId)
      .eq("partner_id", user.id)
      .single();
    
    if (productError && !productError.message.includes("No rows found")) {
      console.error("Product fetch error:", productError);
      return { error: `Could not verify product ownership: ${productError.message}` };
    }
    
    if (!product) {
      return { error: "Product not found or you don't have permission to delete it" };
    }
    
    // Delete the product
    const { error: deleteError } = await supabase
      .from("PartnerProducts")
      .delete()
      .eq("partner_product_id", productId);
    
    if (deleteError) {
      console.error("Delete error:", deleteError);
      
      if (deleteError.message.includes("permission denied") || 
          deleteError.message.includes("policy")) {
        return { error: "You don't have permission to delete this product. Please refresh and try again." };
      }
      
      throw deleteError;
    }
    
    revalidatePath("/partner/my-products");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return { error: error.message || "Failed to delete product" };
  }
} 