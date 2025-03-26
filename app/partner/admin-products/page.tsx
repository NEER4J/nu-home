import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Package, AlertTriangle } from "lucide-react";
import AddToMyProductsButton from "@/components/partner/AddToMyProductsButton";
import { addAdminProductToMyList } from "./actions";

interface PageProps {
  searchParams: { category?: string };
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
  const selectedCategoryId = searchParams?.category || 'all';
  
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
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Products</h1>
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
      ) : adminProducts?.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products available</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are no products available in the selected category.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {adminProducts.map((product) => {
            const isAlreadyAdded = addedProductIds.has(product.product_id);
            
            return (
              <div key={product.product_id} className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                <div className="h-48 w-full relative bg-gray-100">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {product.ServiceCategories?.name}
                    </span>
                  </div>
                  
                  <p className="mt-2 text-sm text-gray-500 line-clamp-3">
                    {product.description}
                  </p>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {product.price ? `£${product.price}` : 'Price on request'}
                    </span>
                    
                    {isAlreadyAdded ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                        Added to your products
                      </span>
                    ) : (
                      <AddToMyProductsButton productId={product.product_id} onAdd={addAdminProductToMyList} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 