// app/services/[slug]/products/[productSlug]/page.tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getProductBySlug, createServerSupabaseClient } from '@/lib/products';
import ProductFieldsSection from '@/components/products/ProductFieldsSection';
import { CategoryField } from '@/types/product.types';

export default async function ProductDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  // Resolve the params Promise
  const resolvedParams = await params;
  
  // Get the product
  const product = await getProductBySlug(resolvedParams.productSlug);
  
  if (!product) {
    notFound();
  }

  // Get the category fields and category info
  const supabase = await createServerSupabaseClient();
  const { data: categoryFields } = await supabase
    .from('CategoryFields')
    .select('*')
    .eq('service_category_id', product.service_category_id)
    .order('display_order');
    
  // Get category layout preference
  const { data: category } = await supabase
    .from('ServiceCategories')
    .select('fields_layout')
    .eq('service_category_id', product.service_category_id)
    .single();
    
  const layoutType = category?.fields_layout || 'default';
  
  // Ensure product_fields is an object
  const productFields = typeof product.product_fields === 'string' 
    ? JSON.parse(product.product_fields) 
    : (product.product_fields || {});

  // Ensure specifications is an object
  const specifications = typeof product.specifications === 'string'
    ? JSON.parse(product.specifications)
    : (product.specifications || {});
  
  // Filter to only include fields that have values in this product
  const fieldsWithValues = (categoryFields || []).filter(
    (field: CategoryField) => 
      productFields && 
      productFields[field.key] !== undefined && 
      productFields[field.key] !== null &&
      productFields[field.key] !== ''
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href={`/services/${resolvedParams.slug}/products`}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 19l-7-7 7-7" 
            />
          </svg>
          Back to all products
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div>
          {product.image_url ? (
            <div className="relative h-80 w-full rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="h-80 w-full bg-gray-100 flex items-center justify-center rounded-lg">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>
        
        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          
          {/* Partner Information */}
          {product.Partner && (
            <div className="mb-4">
              <div className="flex items-center gap-3">
                {product.Partner.logo_url && (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={product.Partner.logo_url}
                      alt={product.Partner.company_name}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    by {product.Partner.company_name}
                  </p>
                  {product.Partner.website_url && (
                    <a 
                      href={product.Partner.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Visit Partner Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {product.price ? (
            <p className="text-2xl font-bold text-blue-600 mb-4">
              £{product.price.toFixed(2)}
            </p>
          ) : (
            <p className="text-lg italic text-gray-500 mb-4">
              Price on request
            </p>
          )}
          
          {product.is_featured && (
            <div className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 text-sm rounded mb-4">
              Featured Product
            </div>
          )}
          
          <div className="prose max-w-none mb-8">
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <div dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
          
          {/* Dynamic Fields */}
          {fieldsWithValues.length > 0 && (
            <ProductFieldsSection 
              fields={fieldsWithValues} 
              values={productFields} 
              layoutType={layoutType as any}
            />
          )}
          
          {/* Specifications */}
          {Object.keys(specifications).length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Specifications</h2>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(specifications).map(([key, value]) => (
                      <tr key={key}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-100">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {String(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Contact or Call-to-Action Section */}
          <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <h3 className="text-lg font-semibold mb-2">Interested in this product?</h3>
            <p className="mb-4">Contact us to learn more about this product and get a personalized quote.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href="tel:+44123456789" 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-center"
              >
                Call Us
              </a>
              <a 
                href={`mailto:info@example.com?subject=Inquiry about ${product.name}`}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors text-center"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}