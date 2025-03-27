'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

interface SubField {
  key: string;
  label: string;
  type: string;
}

interface WordPressField {
  path: string;
  label: string;
  type: string;
  options?: string[];
  subfields?: SubField[];
}

// Define WordPress fields structure
const wordpressFields: WordPressField[] = [
  { path: 'title.rendered', label: 'Product Name', type: 'string' },
  { path: 'slug', label: 'Slug', type: 'string' },
  { path: 'status', label: 'Status', type: 'select', options: ['publish', 'draft'] },
  { 
    path: 'acf.boiler_description', 
    label: 'Description', 
    type: 'repeater',
    subfields: [
      { key: 'description_item', label: 'Description Item', type: 'text' }
    ]
  },
  { path: 'acf.boiler_fixed_price', label: 'Price', type: 'number' },
  { path: 'featured_media', label: 'Image ID', type: 'number' },
  { 
    path: 'acf.boiler_dimetions', 
    label: 'Dimensions', 
    type: 'object',
    subfields: [
      { key: 'height', label: 'Height', type: 'string' },
      { key: 'width', label: 'Width', type: 'string' },
      { key: 'depth', label: 'Depth', type: 'string' }
    ]
  },
  { path: 'acf.year_warranty', label: 'Warranty (Years)', type: 'number' },
  { path: 'acf.select_brand', label: 'Brand', type: 'select' },
  { 
    path: 'acf.boiler_details', 
    label: 'Additional Details', 
    type: 'repeater',
    subfields: [
      { key: 'detail_item', label: 'Detail Item', type: 'text' }
    ]
  },
  { 
    path: 'boilertype', 
    label: 'Boiler Type', 
    type: 'checkbox',
    options: ['Combi', 'System', 'Regular', 'Electric']
  },
  { 
    path: 'bedroom_fits_boiler', 
    label: 'Suitable Bedrooms', 
    type: 'select',
    options: ['1-2', '3-4', '5+']
  },
  { 
    path: 'acf.boiler_power_price', 
    label: 'Power & Price Options', 
    type: 'repeater',
    subfields: [
      { key: 'power', label: 'Power Rating', type: 'string' },
      { key: 'price', label: 'Option Price', type: 'number' }
    ]
  },
  { path: 'acf.boiler_flow_rate', label: 'Flow Rate', type: 'string' },
];

interface WordPressProduct {
  id: number;
  slug: string;
  status: string;
  type: string;
  title: {
    rendered: string;
  };
  featured_media: number;
  boilertype: number[];
  bedroom_fits_boiler: number[];
  acf: {
    subtitle_1: string;
    year_warranty: string;
    select_brand: string;
    boiler_description: Array<{ description_item: string }>;
    boiler_fixed_price: number;
    boiler_power_price: Array<{
      price: number;
      power: string;
      flow_rate: string;
    }>;
    boiler_flow_rate: string;
    boiler_dimetions: {
      height: string;
      width: string;
      depth: string;
    };
    boiler_details: Array<{
      icon: number;
      text: string;
    }>;
  };
}

interface FieldMapping {
  [key: string]: string;
}

// Helper function to get nested value from an object using a path string
const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Helper function to transform field values based on their type
const transformFieldValue = (value: any, field: any) => {
  if (!value) return null;

  switch (field.type) {
    case 'repeater':
      if (!Array.isArray(value)) return [];
      return value.map(item => {
        const transformed: any = {};
        field.subfields.forEach((subfield: any) => {
          transformed[subfield.key] = item[subfield.key];
        });
        return transformed;
      });

    case 'object':
      const transformed: any = {};
      field.subfields.forEach((subfield: any) => {
        transformed[subfield.key] = value[subfield.key];
      });
      return transformed;

    case 'checkbox':
      return Array.isArray(value) ? value : [value];

    case 'select':
      return value;

    case 'number':
      return parseFloat(value) || 0;

    default:
      return value;
  }
};

export async function importProducts(
  products: any[],
  mapping: Record<string, string>,
  serviceCategoryId: string,
  wordpressBaseUrl: string
) {
  const cookieStore = cookies();
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
            if (Array.isArray(value)) {
              baseProduct.description = value.map(item => item.description_item).join('\n');
            } else {
              baseProduct.description = value || '';
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
            baseProduct.specifications = {
              dimensions: product.acf?.boiler_dimetions || {},
              warranty: product.acf?.year_warranty || '',
              brand: product.acf?.select_brand || '',
              details: product.acf?.boiler_details || []
            };
            break;
          case 'is_active':
            baseProduct.is_active = value === 'publish';
            break;
        }
      } else {
        // Handle custom fields - store in product_fields
        const wpField = wordpressFields.find(f => f.path === wpPath);
        if (wpField) {
          baseProduct.product_fields[dbField] = transformFieldValue(value, wpField);
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