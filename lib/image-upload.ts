import { createClient } from '@/utils/supabase/client'

export interface ImageUploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

export async function uploadEnquiryImage(
  file: File,
  category: string, // 'boiler', 'solar', etc.
  submissionId: string,
  areaIndex: number
): Promise<ImageUploadResult> {
  try {
    const supabase = createClient()
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `${submissionId}_${areaIndex}_${timestamp}.${fileExt}`
    const filePath = `${category}/${submissionId}/${fileName}`

    // Upload the file
    const { data, error } = await supabase.storage
      .from('enquiry-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('enquiry-images')
      .getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('Upload error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function uploadMultipleEnquiryImages(
  files: File[],
  category: string,
  submissionId: string,
  areaIndex: number
): Promise<ImageUploadResult[]> {
  const uploadPromises = files.map(file => 
    uploadEnquiryImage(file, category, submissionId, areaIndex)
  )
  
  return Promise.all(uploadPromises)
}

export async function deleteEnquiryImage(filePath: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.storage
      .from('enquiry-images')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

export async function saveEnquiryImageRecord(
  submissionId: string,
  category: string,
  areaIndex: number,
  areaTitle: string,
  filePath: string,
  fileUrl: string,
  fileName: string,
  fileSize: number,
  mimeType: string
) {
  try {
    // Use API route to save image record with server-side permissions
    const response = await fetch('/api/enquiry/save-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submission_id: submissionId,
        category,
        area_index: areaIndex,
        area_title: areaTitle,
        file_path: filePath,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Database insert error:', result)
      return { success: false, error: result.error || 'Failed to save image record' }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Database insert error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}