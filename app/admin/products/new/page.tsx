// app/admin/products/new/page.tsx
import { createServerSupabaseClient } from '@/lib/products';
import { ProductForm } from '@/components/admin/ProductForm';
import { ServiceCategory } from '@/types/database.types';
import { redirect } from 'next/navigation';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const supabase = createServerSupabaseClient();
  
  // Get active service categories
  const { data: categories, error } = await supabase
    .from('ServiceCategories')
    .select('service_category_id, name, slug')
    .eq('is_active', true)
    .order('name');
  
  if (error) {
    throw new Error('Failed to fetch categories');
  }
  
  // Redirect if no categories exist
  if (categories.length === 0) {
    redirect('/admin/service-categories');
  }
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add New Product</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <ProductForm categories={categories as ServiceCategory[]} />
      </div>
    </div>
  );
}