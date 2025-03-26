import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PartnerProductForm from "@/components/partner/PartnerProductForm";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  searchParams: { template?: string };
}

export default async function NewProductPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  
  // Check if user is authenticated and is a partner using getSession for better security
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("Session error:", sessionError);
    redirect("/auth/login?error=session_error");
  }
  
  if (!session) {
    redirect("/auth/login?error=no_session");
  }
  
  const user = session.user;
  
  // Get partner profile to verify their status
  const { data: profile, error: profileError } = await supabase
    .from("UserProfiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  
  if (profileError) {
    console.error("Profile error:", profileError);
    redirect("/auth/login?error=profile_error");
  }
  
  if (!profile || profile.role !== "partner") {
    redirect("/");
  }
  
  if (profile.status === "pending") {
    redirect("/partner/pending");
  }
  
  if (profile.status === "suspended") {
    redirect("/partner/suspended");
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
  
  // Initialize with template if provided
  let templateProduct = null;
  const templateId = searchParams?.template;
  
  if (templateId) {
    const { data: template, error: templateError } = await supabase
      .from("Products")
      .select("*")
      .eq("product_id", templateId)
      .eq("is_template", true)
      .single();
    
    if (templateError) {
      console.error("Template error:", templateError);
    } else {
      templateProduct = template;
    }
  }
  
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
            {templateProduct 
              ? `Customize Template: ${templateProduct.name}`
              : "Add New Product"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {templateProduct
              ? "Modify this template to create your own product."
              : "Create a new product for your approved categories."}
          </p>
        </div>
        
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <PartnerProductForm
            template={templateProduct}
            categories={approvedCategories?.map(cat => ({
              id: cat.ServiceCategories.service_category_id,
              name: cat.ServiceCategories.name
            }))}
          />
        </div>
      </div>
    </div>
  );
} 