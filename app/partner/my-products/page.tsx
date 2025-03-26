import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { PlusCircle, Package, Edit, ArrowUpRight, AlertTriangle, Tag } from "lucide-react";
import DeleteProductButton from "@/components/partner/DeleteProductButton";

interface PageProps {
  searchParams: { category?: string };
}

export default async function PartnerProductsPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return <div>Loading...</div>;
  }
  
  // Get partner profile
  const { data: profile } = await supabase
    .from("UserProfiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  
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
  
  // Fetch partner's products
  let productsQuery = supabase
    .from("PartnerProducts")
    .select(`
      *,
      ServiceCategories:service_category_id(
        name
      )
    `)
    .eq("partner_id", user.id);
  
  // Apply category filter if not 'all'
  if (selectedCategoryId !== 'all') {
    productsQuery = productsQuery.eq('service_category_id', selectedCategoryId);
  }
  
  const { data: partnerProducts, error: productsError } = await productsQuery.order('created_at', { ascending: false });
  
  if (productsError) {
    console.error("Error fetching products:", productsError);
    return <div>Error loading products</div>;
  }
  
  // Fetch admin template products for categories partner has access to
  const categoryIds = approvedCategories?.map(cat => cat.service_category_id) || [];
  
  let templateQuery = supabase
    .from("Products")
    .select(`
      *,
      ServiceCategories:service_category_id(
        name
      )
    `)
    .eq("is_template", true)
    .eq("is_active", true);
  
  // Filter by accessible categories
  if (categoryIds.length > 0) {
    templateQuery = templateQuery.in('service_category_id', categoryIds);
  } else {
    // If no approved categories, don't show any templates
    templateQuery = templateQuery.eq('service_category_id', 'none');
  }
  
  const { data: templateProducts, error: templatesError } = await templateQuery.order('name');
  
  if (templatesError) {
    console.error("Error fetching templates:", templatesError);
  }
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your product catalog</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/partner/admin-products"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Tag className="mr-1.5 h-4 w-4 text-gray-500" />
            Browse Admin Products
          </Link>
          <Link
            href="/partner/my-products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Add New Product
          </Link>
        </div>
      </div>
      
      {/* Category filter tabs */}
      {approvedCategories && approvedCategories.length > 0 && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex overflow-x-auto pb-px" aria-label="Tabs">
            <Link
              href="/partner/my-products"
              className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
                selectedCategoryId === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Products
            </Link>
            
            {approvedCategories.map((category) => (
              <Link
                key={category.service_category_id}
                href={`/partner/my-products?category=${category.service_category_id}`}
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
      
      {/* Your products section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Your Products</h2>
        
        {partnerProducts?.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new product or customizing a template.
            </p>
            {approvedCategories && approvedCategories.length > 0 && (
              <div className="mt-6">
                <Link
                  href="/partner/my-products/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Product
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {partnerProducts.map((product) => (
                <li key={product.partner_product_id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 relative">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover rounded-md"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gray-100 rounded-md flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            {product.ServiceCategories?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.price 
                              ? `£${product.price.toFixed(2)}`
                              : 'No price set'}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          href={`/partner/my-products/${product.partner_product_id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/product/${product.slug}`}
                          target="_blank"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                        <DeleteProductButton productId={product.partner_product_id} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Template products section */}
      {(templateProducts && templateProducts.length > 0) && (
        <div className="mt-12">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Available Templates</h2>
          <p className="text-sm text-gray-500 mb-6">
            Use these templates to quickly create new products for your approved categories.
          </p>
          
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {templateProducts.map((template) => (
              <div key={template.product_id} className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                <div className="h-48 w-full relative bg-gray-100">
                  {template.image_url ? (
                    <Image
                      src={template.image_url}
                      alt={template.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="px-4 py-4">
                  <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {template.ServiceCategories?.name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="mt-4">
                    <Link
                      href={`/partner/my-products/new?template=${template.product_id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Use Template
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 