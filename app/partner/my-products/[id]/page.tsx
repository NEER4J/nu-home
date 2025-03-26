import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import PartnerProductForm from "@/components/partner/PartnerProductForm";
import { ArrowLeft } from "lucide-react";

export default async function EditProductPage({
  params
}: {
  params: { id: string }
}) {
  const supabase = await createClient();
  
  // Check if user is authenticated and is a partner
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }
  
  // Get partner profile to verify their status
  const { data: profile } = await supabase
    .from("UserProfiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  
  if (!profile || profile.role !== "partner") {
    redirect("/");
  }
  
  if (profile.status === "pending") {
    redirect("/partner/pending");
  }
  
  if (profile.status === "suspended") {
    redirect("/partner/suspended");
  }
  
  // Get product to edit, ensuring it belongs to this partner
  const { data: product, error } = await supabase
    .from("PartnerProducts")
    .select(`
      *,
      ServiceCategories:service_category_id(
        service_category_id,
        name
      )
    `)
    .eq("partner_product_id", params.id)
    .eq("partner_id", user.id)
    .single();
  
  if (error || !product) {
    notFound();
  }
  
  // Get partner's approved categories
  const { data: approvedCategories } = await supabase
    .from("UserCategoryAccess")
    .select(`
      *,
      ServiceCategories(
        service_category_id,
        name
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "approved");
  
  if (!approvedCategories || approvedCategories.length === 0) {
    redirect("/partner/category-access");
  }
  
  // Verify this product's category is still approved for this partner
  const isApprovedCategory = approvedCategories.some(
    cat => cat.service_category_id === product.service_category_id
  );
  
  if (!isApprovedCategory) {
    // Handle case where partner no longer has access to this category
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <div className="mb-6">
          <Link href="/partner/my-products" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Products
          </Link>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <h1 className="text-lg font-medium text-red-600 mb-2">Category Access Required</h1>
          <p className="text-gray-700">
            You no longer have access to the category "{product.ServiceCategories?.name}".
            Please request access to this category before editing this product.
          </p>
          <div className="mt-4">
            <Link
              href="/partner/category-access"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Request Category Access
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Format the product object to match the expected format in PartnerProductForm
  const formattedProduct = {
    ...product,
    product_id: product.partner_product_id // Use partner_product_id as product_id for compatibility
  };
  
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6">
        <Link href="/partner/my-products" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Products
        </Link>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h1 className="text-lg font-medium leading-6 text-gray-900">
            Edit Product: {product.name}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Update your product details and specifications.
          </p>
        </div>
        
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <PartnerProductForm
            product={formattedProduct}
            categories={approvedCategories?.map(cat => ({
              id: cat.ServiceCategories.service_category_id,
              name: cat.ServiceCategories.name
            }))}
            isEditing={true}
          />
        </div>
      </div>
    </div>
  );
} 