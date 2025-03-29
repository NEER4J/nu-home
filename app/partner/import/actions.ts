'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Helper function to get nested value from an object using a path string
const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Helper function to detect field type
function detectFieldType(value: any): string {
  if (value === null || value === undefined) return 'string';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array';
    if (typeof value[0] === 'object') return 'repeater';
    return 'array';
  }
  if (typeof value === 'object') return 'object';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

// Helper function to transform field values based on detected type
function transformFieldValue(value: any, fieldType: string): any {
  if (!value) return null;

  switch (fieldType) {
    case 'repeater':
      if (!Array.isArray(value)) return [];
      // If the repeater items have a common key, use that
      const sampleItem = value[0];
      const commonKeys = Object.keys(sampleItem || {});
      if (commonKeys.length === 1) {
        // If there's only one key (like description_item), extract just those values
        const key = commonKeys[0];
        return value.map(item => item[key]).filter(Boolean);
      }
      // Otherwise return the array as is
      return value;

    case 'array':
      return Array.isArray(value) ? value : [value].filter(Boolean);

    case 'object':
      if (typeof value !== 'object' || value === null) return {};
      // Clean up the object by removing null/undefined values
      return Object.entries(value).reduce((acc, [key, val]) => ({
        ...acc,
        [key]: val || ''
      }), {});

    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? null : num;

    case 'boolean':
      return Boolean(value);

    case 'string':
    default:
      return String(value);
  }
}

export async function importProducts(
  products: any[],
  mapping: Record<string, string>,
  serviceCategoryId: string,
  wordpressBaseUrl: string
) {
  const supabase = await createClient();

  // Get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Authentication required');
  }

  // Separate global fields from custom fields
  const globalFields = ['name', 'slug', 'description', 'price', 'image_url', 'specifications', 'is_active'];
  
  // Transform products
  const transformedProducts = await Promise.all(products.map(async (product) => {
    // Initialize the base product object with global fields
    const baseProduct: any = {
      partner_id: session.user.id,
      service_category_id: serviceCategoryId,
      is_active: true, // Default to active
      specifications: {}, // Initialize empty specifications
      product_fields: {} // Initialize empty product_fields
    };

    // Process each mapped field
    for (const [dbField, wpPath] of Object.entries(mapping)) {
      const value = getNestedValue(product, wpPath);
      const fieldType = detectFieldType(value);
      
      if (globalFields.includes(dbField)) {
        // Handle global fields
        switch (dbField) {
          case 'name':
            baseProduct.name = value || product.title.rendered;
            break;
          case 'slug':
            baseProduct.slug = value || product.slug;
            break;
          case 'description':
            if (fieldType === 'repeater') {
              // If description is a repeater field, join the items
              const items = transformFieldValue(value, fieldType);
              baseProduct.description = Array.isArray(items) 
                ? items.join('\n\n')
                : String(items || '');
            } else {
              baseProduct.description = String(value || '');
            }
            break;
          case 'price':
            baseProduct.price = parseFloat(value) || 0;
            break;
          case 'image_url':
            // Handle featured media ID
            if (product.featured_media) {
              try {
                // Fetch media details from WordPress
                const mediaResponse = await fetch(`${wordpressBaseUrl}/wp-json/wp/v2/media/${product.featured_media}`);
                if (mediaResponse.ok) {
                  const mediaData = await mediaResponse.json();
                  baseProduct.image_url = mediaData.source_url;
                }
              } catch (error) {
                console.error('Failed to fetch media:', error);
                baseProduct.image_url = null;
              }
            } else {
              baseProduct.image_url = value || null;
            }
            break;
          case 'specifications':
            // Transform specifications into a clean object
            const specs: Record<string, any> = {};
            
            // Handle any object or array fields in specifications
            if (typeof value === 'object' && value !== null) {
              Object.entries(value).forEach(([key, val]) => {
                const valType = detectFieldType(val);
                specs[key] = transformFieldValue(val, valType);
              });
            }

            baseProduct.specifications = specs;
            break;
          case 'is_active':
            baseProduct.is_active = value === 'publish';
            break;
        }
      } else {
        // Handle custom fields - store in product_fields
        const transformedValue = transformFieldValue(value, fieldType);
        if (transformedValue !== null) {
          baseProduct.product_fields[dbField] = transformedValue;
        }
      }
    }

    return baseProduct;
  }));

  // Insert products
  const { error: insertError } = await supabase
    .from('PartnerProducts')
    .insert(transformedProducts);

  if (insertError) {
    throw new Error(`Failed to insert products: ${insertError.message}`);
  }

  revalidatePath('/partner/my-products');
  return { success: true, count: transformedProducts.length };
} 