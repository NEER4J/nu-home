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

export async function getProducts(
  categoryId?: string, 
  isActive: boolean = true,
  filters?: Record<string, string | string[]>
): Promise<Product[]> {
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
  
  // Apply custom field filters if provided
  if (filters && Object.keys(filters).length > 0) {
    // Get all products first, then filter manually
    const { data, error } = await query.order('name');
    
    if (error) {
      console.error('Error fetching products:', error);
      throw new Error('Failed to fetch products');
    }
    
    // Filter products based on custom fields
    return data.filter((product: Product) => {
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
  
  // If no filters, just return the query results
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

// Get available filters for a category
export async function getProductFilters(categoryId: string) {
  const supabase = createServerSupabaseClient();
  
  // Get all custom fields for this category
  const { data: fields, error: fieldsError } = await supabase
    .from('CategoryFields')
    .select('*')
    .eq('service_category_id', categoryId)
    .order('display_order');
  
  if (fieldsError) {
    console.error('Error fetching category fields:', fieldsError);
    throw new Error('Failed to fetch category fields');
  }
  
  // Get all products in this category to calculate filter counts
  const { data: products, error: productsError } = await supabase
    .from('Products')
    .select('*')
    .eq('service_category_id', categoryId)
    .eq('is_active', true);
  
  if (productsError) {
    console.error('Error fetching products for filters:', productsError);
    throw new Error('Failed to fetch products for filters');
  }
  
  // Filter out field types that aren't filterable
  const filterableFields = fields.filter(field => 
    ['select', 'checkbox'].includes(field.field_type)
  );
  
  // For each field, calculate the count of products for each option
  filterableFields.forEach(field => {
    if (field.field_type === 'select' && field.options?.values) {
      const filterOptions = field.options.values.map((value: any) => {
        // Count products that have this value
        const count = products.filter(product => {
          if (!product.product_fields) return false;
          
          const fieldValue = product.product_fields[field.key];
          
          if (Array.isArray(fieldValue)) {
            return fieldValue.map(String).includes(String(value));
          }
          
          return String(fieldValue) === String(value);
        }).length;
        
        return { value, count };
      });
      
      // Only include options that have at least one product
      field.filterOptions = filterOptions.filter((option: { count: number; }) => option.count > 0);
    }
    
    if (field.field_type === 'checkbox') {
      const yesCount = products.filter(product => {
        if (!product.product_fields) return false;
        const fieldValue = product.product_fields[field.key];
        return fieldValue === true || fieldValue === 'true' || fieldValue === 'Yes';
      }).length;
      
      const noCount = products.filter(product => {
        if (!product.product_fields) return false;
        const fieldValue = product.product_fields[field.key];
        return fieldValue === false || fieldValue === 'false' || fieldValue === 'No';
      }).length;
      
      field.filterOptions = [
        { value: 'Yes', count: yesCount },
        { value: 'No', count: noCount }
      ].filter(option => option.count > 0);
    }
  });
  
  // Only return fields that have filter options
  return filterableFields.filter(field => 
    field.filterOptions && field.filterOptions.length > 0
  );
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

export async function getPartnerProducts(
  categoryId?: string, 
  isActive: boolean = true,
  filters?: Record<string, string | string[]>
): Promise<Product[]> {
  const supabase = createServerSupabaseClient();
  
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

    // Create a map of partner_id to profile for easy lookup
    const profileMap = new Map(
      userProfiles?.map(profile => [profile.user_id, profile]) || []
    );
    
    // Transform the data to include partner info
    const transformedProducts = products.map(product => ({
      ...product,
      Partner: profileMap.get(product.partner_id) ? {
        id: product.partner_id,
        company_name: profileMap.get(product.partner_id)?.company_name,
        logo_url: profileMap.get(product.partner_id)?.logo_url,
        website_url: profileMap.get(product.partner_id)?.website_url
      } : null
    }));
    
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