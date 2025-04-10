// app/admin/products/[id]/page.tsx
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/products';
import { ProductForm } from '@/components/shared/ProductForm';
import { Product } from '@/types/product.types';
import { ServiceCategory } from '@/types/database.types';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  // Resolve the params Promise
  const resolvedParams = await params;
  const productId = resolvedParams.id;
  
  const supabase = await createServerSupabaseClient();
  
  // Get the product
  const { data: product, error: productError } = await supabase
    .from('Products')
    .select('*')
    .eq('product_id', productId)
    .single();
  
  if (productError || !product) {
    notFound();
  }
  
  // Get active service categories
  const { data: categories, error: categoriesError } = await supabase
    .from('ServiceCategories')
    .select('service_category_id, name, slug')
    .order('name');
  
  if (categoriesError) {
    throw new Error('Failed to fetch categories');
  }
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Product: {product.name}</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <ProductForm 
          product={product as Product} 
          categories={categories as ServiceCategory[]} 
          isEditing={true}
          isPartner={false}
        />
      </div>
    </div>
  );
}