// app/services/[slug]/products/page.tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  getProducts, 
  getSubmission, 
  getRecommendedProducts,
  createServerSupabaseClient 
} from '@/lib/products';
import { Product } from '@/types/product.types';

// Product card component
const ProductCard = ({ product }: { product: Product }) => (
  <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
    {product.image_url ? (
      <div className="relative h-40 mb-4">
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          className="object-contain rounded-md"
        />
      </div>
    ) : (
      <div className="h-40 bg-gray-100 flex items-center justify-center mb-4 rounded-md">
        <span className="text-gray-400">No image</span>
      </div>
    )}
    <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
    {product.price ? (
      <p className="text-lg font-bold mb-4">£{product.price.toFixed(2)}</p>
    ) : (
      <p className="text-sm italic text-gray-500 mb-4">Price on request</p>
    )}
    <Link
      href={`/services/${product.ServiceCategory?.slug}/products/${product.slug}`}
      className="block text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
    >
      View Details
    </Link>
  </div>
);

export default async function ProductsPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submission?: string }>;
}) {
  // Resolve the promises
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const supabase = createServerSupabaseClient();
  
  // Get the service category based on the slug
  const { data: category, error: categoryError } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .single();
  
  if (categoryError || !category) {
    notFound();
  }
  
  let products: Product[] = [];
  let isRecommended = false;
  let customerName = '';
  
  // If there's a submission ID, get recommended products
  if (resolvedSearchParams.submission) {
    try {
      const submission = await getSubmission(resolvedSearchParams.submission);
      if (submission) {
        products = await getRecommendedProducts(
          category.service_category_id, 
          submission.form_answers
        );
        isRecommended = true;
        customerName = `${submission.first_name} ${submission.last_name}`;
      }
    } catch (error) {
      console.error('Error getting recommended products:', error);
      // Fallback to all products if there's an error
      products = await getProducts(category.service_category_id);
    }
  } else {
    // Otherwise, get all products for this category
    products = await getProducts(category.service_category_id);
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {isRecommended ? 'Your Recommended Products' : `${category.name} Products`}
        </h1>
        {isRecommended && customerName && (
          <p className="text-lg text-gray-600 mb-4">
            Hi {customerName}, here are products that match your requirements
          </p>
        )}
        <p className="text-gray-600">
          {isRecommended 
            ? `Based on your answers, we've selected these ${products.length} products for you.`
            : `Browse our selection of ${products.length} products in the ${category.name} category.`
          }
        </p>
      </div>
      
      {products.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">No Products Found</h2>
          <p className="text-gray-600">
            We couldn't find any products that match your requirements in the {category.name} category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.product_id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}