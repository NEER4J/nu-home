import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/shared/ProductForm";
import { Product } from "@/types/product.types";
import { ServiceCategory } from "@/types/database.types";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function NewProductPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect("/login");
  }
  
  // Get partner's approved categories
  const { data: approvedCategories, error: categoriesError } = await supabase
    .from("UserCategoryAccess")
    .select(`
      *,
      ServiceCategories (
        service_category_id,
        name,
        description,
        icon_url,
        is_active,
        created_at,
        updated_at,
        slug,
        form_style,
        show_thank_you,
        redirect_to_products,
        products_list_layout
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "approved");
  
  if (categoriesError) {
    console.error("Categories error:", categoriesError);
    throw new Error("Failed to fetch categories");
  }
  
  if (!approvedCategories || approvedCategories.length === 0) {
    redirect("/partner/category-access");
  }
  
  // Get template product if templateId is provided
  let templateProduct: Product | null = null;
  const params = await searchParams;
  const templateId = params.template as string;
  
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
  
  // Map the categories to the correct type
  const categories: ServiceCategory[] = approvedCategories.map(cat => cat.ServiceCategories);
  
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
          <ProductForm
            template={templateProduct}
            categories={categories}
            isPartner={true}
          />
        </div>
      </div>
    </div>
  );
} 