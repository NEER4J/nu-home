import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { AlertTriangle, Package } from "lucide-react";
import AdminProductsDisplay from "@/components/partner/AdminProductsDisplay";
import { addAdminProductToMyList } from "./actions";

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return <div>Loading...</div>;
  }
  
  // Get partner's approved category access
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
  
  // Get the selected category from query, or default to all
  const params = await searchParams;
  const selectedCategoryId = params?.category || 'all';
  
  // Get categories the partner has access to
  const categoryIds = approvedCategories?.map(cat => cat.service_category_id) || [];
  
  // Fetch admin products to display
  let adminProductsQuery = supabase
    .from("Products")
    .select(`
      *,
      ServiceCategories:service_category_id(
        name
      )
    `)
    .eq("is_active", true);
    
  // Filter by partner's accessible categories
  if (selectedCategoryId !== 'all') {
    adminProductsQuery = adminProductsQuery.eq('service_category_id', selectedCategoryId);
  } else if (categoryIds.length > 0) {
    adminProductsQuery = adminProductsQuery.in('service_category_id', categoryIds);
  } else {
    // If no approved categories, don't show any products
    adminProductsQuery = adminProductsQuery.eq('service_category_id', 'none');
  }
  
  const { data: adminProducts, error: productsError } = await adminProductsQuery.order('name');
  
  if (productsError) {
    console.error("Error fetching admin products:", productsError);
    return <div>Error loading products</div>;
  }
  
  // Get the products that the partner has already added to their list
  const { data: partnerProducts } = await supabase
    .from("PartnerProducts")
    .select("base_product_id")
    .eq("partner_id", user.id);
  
  // Create a set of already added product IDs for quick lookup
  const addedProductIds = new Set(partnerProducts?.map(p => p.base_product_id) || []);
  
  return (
    <div className="max-w-[1500px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products Catalogue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse products from our database and add them to your list
          </p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <Link
            href="/partner/my-products"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to My Products
          </Link>
        </div>
      </div>
      
      {/* Category filter tabs */}
      {approvedCategories && approvedCategories.length > 0 && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex overflow-x-auto pb-px" aria-label="Tabs">
            <Link
              href="/partner/admin-products"
              className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
                selectedCategoryId === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Categories
            </Link>
            
            {approvedCategories.map((category) => (
              <Link
                key={category.service_category_id}
                href={`/partner/admin-products?category=${category.service_category_id}`}
                className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
                  selectedCategoryId === category.service_category_id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {category.ServiceCategories?.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
      
      {/* Display admin products */}
      {!approvedCategories || approvedCategories.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-100 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">No category access</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You need to request category access before you can view admin products.
                </p>
              </div>
              <div className="mt-4">
                <Link
                  href="/partner/category-access"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
                >
                  Request Access
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <AdminProductsDisplay 
          products={adminProducts || []} 
          addedProductIds={addedProductIds}
          onAddProduct={addAdminProductToMyList}
        />
      )}
    </div>
  );
} 