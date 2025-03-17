// lib/products.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Product, ProductFormData } from '@/types/product.types';
import { QuoteSubmission } from '@/types/database.types';

export function createServerSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
      cookies: { 
        async get(name) {
          return (await cookies()).get(name)?.value;
        },
        async set(name, value, options) {
          (await cookies()).set(name, value, options);
        },
        async remove(name, options) {
          (await cookies()).set(name, '', options);
        }
      } 
    }
  );
}

export async function getProducts(categoryId?: string, isActive: boolean = true): Promise<Product[]> {
  const supabase = createServerSupabaseClient();
  
  let query = supabase
    .from('Products')
    .select('*, ServiceCategory:service_category_id(name, slug)');
  
  if (categoryId) {
    query = query.eq('service_category_id', categoryId);
  }
  
  if (isActive) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query.order('name');
  
  if (error) {
    console.error('Error fetching products:', error);
    throw new Error('Failed to fetch products');
  }
  
  return data as Product[];
}

export async function getProductById(productId: string): Promise<Product | null> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('Products')
    .select('*, ServiceCategory:service_category_id(name, slug)')
    .eq('product_id', productId)
    .single();
  
  if (error) {
    console.error('Error fetching product:', error);
    throw new Error('Failed to fetch product');
  }
  
  return data as Product;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('Products')
    .select('*, ServiceCategory:service_category_id(name, slug)')
    .eq('slug', slug)
    .single();
  
  if (error) {
    console.error('Error fetching product by slug:', error);
    throw new Error('Failed to fetch product');
  }
  
  return data as Product;
}

export async function getSubmission(submissionId: string): Promise<QuoteSubmission | null> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('QuoteSubmissions')
    .select('*')
    .eq('submission_id', submissionId)
    .single();
  
  if (error) {
    console.error('Error fetching submission:', error);
    throw new Error('Failed to fetch submission');
  }
  
  return data as QuoteSubmission;
}

// Simple filtering function to recommend products based on form answers
export async function getRecommendedProducts(categoryId: string, formAnswers: any[]): Promise<Product[]> {
  // First get all products for this category
  const allProducts = await getProducts(categoryId);
  
  // For this simple implementation, we'll check if any product specifications match the answers
  const filteredProducts = allProducts.filter(product => {
    // Check if product specs match any of the form answers
    return formAnswers.some(answer => {
      const answerValue = Array.isArray(answer.answer) ? answer.answer[0] : answer.answer;
      
      // Loop through product specifications to find matches
      return Object.entries(product.specifications).some(([key, value]) => {
        // Try to match by converting everything to lowercase strings for simple comparison
        const specValue = String(value).toLowerCase();
        const formValue = String(answerValue).toLowerCase();
        
        return specValue.includes(formValue) || formValue.includes(specValue);
      });
    });
  });
  
  // If no matches, return all products in that category
  return filteredProducts.length > 0 ? filteredProducts : allProducts;
}