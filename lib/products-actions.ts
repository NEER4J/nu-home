'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/products';
import { ProductFormData } from '@/types/product.types';

export async function createProduct(formData: FormData) {
  const product: ProductFormData = {
    name: formData.get('name') as string,
    service_category_id: formData.get('service_category_id') as string,
    slug: formData.get('slug') as string,
    description: formData.get('description') as string,
    price: formData.get('price') ? parseFloat(formData.get('price') as string) : undefined,
    image_url: formData.get('image_url') as string || undefined,
    specifications: {},
    product_fields: {}, // Initialize empty product fields
    is_featured: formData.get('is_featured') === 'on',
    is_active: formData.get('is_active') === 'on',
  };
  
  // Extract specifications from form data
  // Assuming specification fields are prefixed with 'spec_'
  Array.from(formData.entries()).forEach(([key, value]) => {
    if (key.startsWith('spec_')) {
      const specKey = key.replace('spec_', '');
      product.specifications[specKey] = value;
    }
  });
  
  // Parse the product_fields JSON
  const productFieldsJson = formData.get('product_fields');
  if (productFieldsJson) {
    try {
      product.product_fields = JSON.parse(productFieldsJson as string);
    } catch (error) {
      console.error('Error parsing product fields:', error);
    }
  }
  
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('Products')
      .insert([product])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating product:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/admin/products');
    revalidatePath(`/services/${data.ServiceCategory.slug}/products`);
    redirect('/admin/products');
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Failed to create product' };
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  // Initialize specifications as an empty object to avoid undefined errors
  const specifications: Record<string, any> = {};
  
  // Extract specifications from form data first
  Array.from(formData.entries()).forEach(([key, value]) => {
    if (key.startsWith('spec_')) {
      const specKey = key.replace('spec_', '');
      specifications[specKey] = value;
    }
  });
  
  // Initialize product fields
  let product_fields = {};
  
  // Parse the product_fields JSON
  const productFieldsJson = formData.get('product_fields');
  if (productFieldsJson) {
    try {
      product_fields = JSON.parse(productFieldsJson as string);
    } catch (error) {
      console.error('Error parsing product fields:', error);
    }
  }
  
  const product: Partial<ProductFormData> = {
    name: formData.get('name') as string,
    service_category_id: formData.get('service_category_id') as string,
    slug: formData.get('slug') as string,
    description: formData.get('description') as string,
    price: formData.get('price') ? parseFloat(formData.get('price') as string) : undefined,
    image_url: formData.get('image_url') as string || undefined,
    specifications, // Use the pre-populated specifications object
    product_fields, // Include the dynamic fields
    is_featured: formData.get('is_featured') === 'on',
    is_active: formData.get('is_active') === 'on',
  };
  
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('Products')
      .update(product)
      .eq('product_id', productId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating product:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/admin/products');
    revalidatePath(`/services/${data.ServiceCategory.slug}/products`);
    redirect('/admin/products');
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Failed to update product' };
  }
}

export async function deleteProduct(productId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase
      .from('Products')
      .delete()
      .eq('product_id', productId);
    
    if (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/admin/products');
    return { success: true };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Failed to delete product' };
  }
}