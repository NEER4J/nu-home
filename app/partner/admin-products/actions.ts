'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Add an admin product to partner's list
 */
export async function addAdminProductToMyList(adminProductId: string) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient();
    
    // Explicitly check the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("User error:", userError);
      return { error: "Authentication error: User verification failed. Please refresh and try again." };
    }
    
    if (!user) {
      return { error: "Authentication error: You need to be logged in to create a product." };
    }
    
    // User is already available from getUser() above
    
    // Fetch the admin product details
    const { data: adminProduct, error: productError } = await supabase
      .from("Products")
      .select("*")
      .eq("product_id", adminProductId)
      .single();
    
    if (productError) {
      console.error("Product fetch error:", productError);
      return { error: `Could not find the product: ${productError.message}` };
    }
    
    if (!adminProduct) {
      return { error: "Product not found" };
    }
    
    // Check if partner has access to this category
    const { data: categoryAccess, error: categoryError } = await supabase
      .from("UserCategoryAccess")
      .select("*")
      .eq("user_id", user.id)
      .eq("service_category_id", adminProduct.service_category_id)
      .eq("status", "approved")
      .single();
      
    if (categoryError && !categoryError.message.includes("No rows found")) {
      console.error("Category access check error:", categoryError);
    }
    
    if (!categoryAccess) {
      return { error: "You don't have access to this product's category" };
    }
    
    // Check if product already exists for this partner
    const { data: existingProduct } = await supabase
      .from("PartnerProducts")
      .select("partner_product_id")
      .eq("partner_id", user.id)
      .eq("base_product_id", adminProductId)
      .single();
      
    if (existingProduct) {
      return { error: "You have already added this product to your list" };
    }
    
    // Create a unique slug
    const timestamp = new Date().getTime().toString().slice(-6);
    const slug = `${adminProduct.slug}-${timestamp}`;
    
    // Create a new partner product based on the admin product
    const { error: insertError } = await supabase
      .from("PartnerProducts")
      .insert({
        partner_id: user.id,
        base_product_id: adminProductId,
        name: adminProduct.name,
        slug: slug,
        description: adminProduct.description,
        price: adminProduct.price,
        image_url: adminProduct.image_url,
        product_fields: adminProduct.product_fields,
        service_category_id: adminProduct.service_category_id,
        is_active: true
      });
    
    if (insertError) {
      console.error("Insert error:", insertError);
      
      // Better error messages for specific issues
      if (insertError.message.includes("duplicate key")) {
        return { error: "A product with this slug already exists. Try again." };
      }
      
      if (insertError.message.includes("permission denied") || 
          insertError.message.includes("policy")) {
        return { error: "You don't have permission to add this product. Please refresh and try again." };
      }
      
      throw insertError;
    }
    
    revalidatePath("/partner/admin-products");
    revalidatePath("/partner/my-products");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error adding admin product:", error);
    return { error: error.message || "Failed to add product" };
  }
} 