// app/admin/products/new/page.tsx
import { createServerSupabaseClient } from '@/lib/products';
import { ProductForm } from '@/components/shared/ProductForm';
import { ServiceCategory } from '@/types/database.types';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const supabase = await createServerSupabaseClient();
  
  // Get active service categories
  const { data: categories, error } = await supabase
    .from('ServiceCategories')
    .select('*')
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
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-6">
        <Link href="/admin/products" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Products
        </Link>
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Product</h1>
      </div>
      
      <ProductForm categories={categories as ServiceCategory[]} />
    </div>
  );
}