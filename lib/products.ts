// lib/products.ts
import { createClient } from '@/utils/supabase/server';
import { Product, ProductFormData } from '@/types/product.types';
import { QuoteSubmission } from '@/types/database.types';

// Use the existing createClient function instead of creating our own
export async function createServerSupabaseClient() {
  return createClient();
}

export async function getProducts(
  categoryId?: string, 
  isActive: boolean = true,
  filters?: Record<string, string | string[]>
): Promise<Product[]> {
  const supabase = await createServerSupabaseClient();
  
  let query = supabase
    .from('Products')
    .select('*, ServiceCategory:service_category_id(name, slug)');
  
  if (categoryId) {
    query = query.eq('service_category_id', categoryId);
  }
  
  if (isActive) {
    query = query.eq('is_active', true);
  }
  
  // Apply custom field filters if provided
  if (filters && Object.keys(filters).length > 0) {
    // Get all products first, then filter manually
    const { data, error } = await query.order('name');
    
    if (error) {
      console.error('Error fetching products:', error);
      throw new Error('Failed to fetch products');
    }
    
    return data as Product[];
  }
  
  const { data, error } = await query.order('name');
  
  if (error) {
    console.error('Error fetching products:', error);
    throw new Error('Failed to fetch products');
  }
  
  return data as Product[];
}

export async function getProductById(productId: string): Promise<Product | null> {
  const supabase = await createServerSupabaseClient();
  
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
  const supabase = await createServerSupabaseClient();
  
  try {
    // First try to get from partner products
    let { data: partnerProduct, error: partnerError } = await supabase
      .from('PartnerProducts')
      .select(`
        *,
        ServiceCategory:service_category_id(name, slug)
      `)
      .eq('slug', slug)
      .single();

    if (partnerProduct) {
      // Get the user profile for this partner product
      const { data: userProfile, error: profileError } = await supabase
        .from('UserProfiles')
        .select('*')
        .eq('user_id', partnerProduct.partner_id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError.message);
        console.error('Error details:', profileError);
        throw new Error(`Failed to fetch user profile: ${profileError.message}`);
      }

      // Transform the product to include partner info
      return {
        ...partnerProduct,
        Partner: userProfile ? {
          id: partnerProduct.partner_id,
          company_name: userProfile.company_name,
          logo_url: userProfile.logo_url,
          website_url: userProfile.website_url
        } : null
      } as Product;
    }

    // If no partner product found, try regular products
    const { data: product, error } = await supabase
      .from('Products')
      .select('*, ServiceCategory:service_category_id(name, slug)')
      .eq('slug', slug)
      .single();
    
    if (error) {
      console.error('Error fetching product by slug:', error.message);
      console.error('Error details:', error);
      throw new Error('Failed to fetch product');
    }
    
    return product as Product;
  } catch (error) {
    console.error('Unexpected error in getProductBySlug:', error);
    throw error;
  }
}

export async function getSubmission(submissionId: string): Promise<QuoteSubmission | null> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('QuoteSubmissions')
    .select('*')
    .eq('submission_id', submissionId)
    .single();
  
  if (error) {
    console.error('Error fetching submission:', error);
    return null;
  }
  
  return data;
}

// Get available filters for a category
export async function getProductFilters(categoryId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('ProductFields')
    .select('*')
    .eq('service_category_id', categoryId)
    .eq('is_filter', true)
    .order('order');
  
  if (error) {
    console.error('Error fetching product filters:', error);
    return [];
  }
  
  return data || [];
}

// Simple filtering function to recommend products based on form answers
export async function getRecommendedProducts(
  categoryId: string,
  formAnswers: Record<string, any>
): Promise<Product[]> {
  const supabase = await createServerSupabaseClient();
  
  // Get all products for the category
  const products = await getPartnerProducts(categoryId, true);
  
  // Filter products based on form answers
  return products.filter(product => {
    if (!product.product_fields) return false;
    
    // Check if product matches form answers
    return Object.entries(formAnswers).every(([key, value]) => {
      const productValue = product.product_fields[key];
      
      // Skip if the product doesn't have this field
      if (productValue === undefined || productValue === null) return false;
      
      // Handle array of values
      if (Array.isArray(value)) {
        if (value.length === 0) return true; // Empty array means include all
        
        // If product value is array (multi-select field)
        if (Array.isArray(productValue)) {
          return value.some(val => 
            productValue.map(String).includes(String(val))
          );
        }
        
        // If product value is string/number/boolean
        return value.map(String).includes(String(productValue));
      }
      
      // Handle single value
      if (Array.isArray(productValue)) {
        return productValue.map(String).includes(String(value));
      }
      
      return String(productValue) === String(value);
    });
  });
}

export async function getPartnerProducts(
  categoryId?: string, 
  isActive: boolean = true,
  filters?: Record<string, string | string[]>
): Promise<Product[]> {
  const supabase = await createServerSupabaseClient();
  
  try {
    // First verify if we can access the PartnerProducts table
    const { error: tableCheckError } = await supabase
      .from('PartnerProducts')
      .select('count')
      .limit(1);
    
    if (tableCheckError) {
      console.error('Error accessing PartnerProducts table:', tableCheckError.message);
      console.error('Error details:', tableCheckError);
      if (tableCheckError.code === 'PGRST116') {
        throw new Error('PartnerProducts table does not exist');
      }
      throw new Error(`Cannot access PartnerProducts table: ${tableCheckError.message}`);
    }
    
    // First get all partner products
    let query = supabase
      .from('PartnerProducts')
      .select(`
        *,
        ServiceCategory:service_category_id(name, slug)
      `);
    
    if (categoryId) {
      query = query.eq('service_category_id', categoryId);
    }
    
    if (isActive) {
      query = query.eq('is_active', true);
    }
    
    // Get the products first
    const { data: products, error: productsError } = await query.order('name');
    
    if (productsError) {
      console.error('Error fetching partner products:', productsError.message);
      console.error('Error details:', productsError);
      throw new Error(`Failed to fetch partner products: ${productsError.message}`);
    }
    
    if (!products || products.length === 0) {
      console.warn('No partner products found');
      return [];
    }

    // Then get the user profiles for these products
    const { data: userProfiles, error: profilesError } = await supabase
      .from('UserProfiles')
      .select('*')
      .in('user_id', products.map(p => p.partner_id));

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError.message);
      console.error('Error details:', profilesError);
      throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
    }

    // Transform products to include partner info
    const transformedProducts = products.map(product => {
      const partnerProfile = userProfiles?.find(profile => profile.user_id === product.partner_id);
      
      return {
        ...product,
        Partner: partnerProfile ? {
          id: product.partner_id,
          company_name: partnerProfile.company_name,
          logo_url: partnerProfile.logo_url,
          website_url: partnerProfile.website_url
        } : null
      };
    });
    
    // Apply custom field filters if provided
    if (filters && Object.keys(filters).length > 0) {
      return transformedProducts.filter((product: Product) => {
        // Skip products without product_fields
        if (!product.product_fields) return false;
        
        // Check if product matches all filters
        return Object.entries(filters).every(([key, filterValue]) => {
          const productValue = product.product_fields[key];
          
          // Skip if the product doesn't have this field
          if (productValue === undefined || productValue === null) return false;
          
          // Handle array of filter values (OR logic)
          if (Array.isArray(filterValue)) {
            if (filterValue.length === 0) return true; // Empty filter means include all
            
            // If product value is array (multi-select field)
            if (Array.isArray(productValue)) {
              return filterValue.some(val => 
                productValue.map(String).includes(String(val))
              );
            }
            
            // If product value is string/number/boolean
            return filterValue.map(String).includes(String(productValue));
          }
          
          // Handle single filter value
          if (Array.isArray(productValue)) {
            return productValue.map(String).includes(String(filterValue));
          }
          
          return String(productValue) === String(filterValue);
        });
      });
    }
    
    return transformedProducts as Product[];
  } catch (error) {
    console.error('Unexpected error in getPartnerProducts:', error);
    throw error;
  }
}