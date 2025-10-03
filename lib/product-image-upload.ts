import { createClient } from '@/utils/supabase/client';

export interface ProductImageUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export async function uploadProductImage(
  file: File,
  productId?: string,
  fieldKey?: string
): Promise<ProductImageUploadResult> {
  try {
    const supabase = createClient();
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `${productId || 'temp'}_${fieldKey || 'image'}_${timestamp}_${randomId}.${fileExt}`;
    const filePath = `products/${fileName}`;

    // Upload the file to Supabase storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function uploadMultipleProductImages(
  files: File[],
  productId?: string,
  fieldKey?: string
): Promise<ProductImageUploadResult[]> {
  const uploadPromises = files.map(file => 
    uploadProductImage(file, productId, fieldKey)
  );
  
  return Promise.all(uploadPromises);
}
