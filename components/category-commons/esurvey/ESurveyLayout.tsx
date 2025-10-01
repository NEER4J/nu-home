'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Camera, Phone, ChevronLeft, LucideIcon, Image, X } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import { uploadMultipleEnquiryImages, saveEnquiryImageRecord } from '@/lib/image-upload'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface ESurveyImageUploadArea {
  title: string
  description: string
  icon: LucideIcon
  required?: boolean
}

export interface ESurveyLayoutProps {
  // Partner info
  companyColor?: string | null | undefined
  partnerPhone?: string | null
  
  // Customer details
  customerName: string
  customerDetails: {
    name: string
    phone: string
    email: string
    postcode: string
  }
  
  // Navigation
  onBack: () => void
  backLabel: string
  
  // Content configuration
  category: string // e.g., "boiler", "solar"
  imageUploadAreas: ESurveyImageUploadArea[]
  submissionId: string // Required for image uploads
  
  // Handlers
  onImageUpload: (areaIndex: number, files: FileList) => void
  onFormSubmit: (uploadedImages: Record<number, File[]>, uploadedImageUrls: Record<number, string[]>) => Promise<void>
  
  // State
  isSubmitting?: boolean
  isOpen?: boolean
  onClose?: () => void
}

export default function ESurveyLayout({
  companyColor,
  partnerPhone,
  customerName,
  customerDetails,
  onBack,
  backLabel,
  category,
  imageUploadAreas,
  submissionId,
  onImageUpload,
  onFormSubmit,
  isSubmitting = false,
  isOpen = false,
  onClose
}: ESurveyLayoutProps) {
  const classes = useDynamicStyles(companyColor || null)
  const [uploadedImages, setUploadedImages] = useState<Record<number, File[]>>({})
  const [imagePreviews, setImagePreviews] = useState<Record<number, string[]>>({})
  const [uploadedImageUrls, setUploadedImageUrls] = useState<Record<number, string[]>>({})
  const [isUploading, setIsUploading] = useState<Record<number, boolean>>({})
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleImageUpload = async (areaIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setUploadedImages(prev => ({ ...prev, [areaIndex]: fileArray }))
    setIsUploading(prev => ({ ...prev, [areaIndex]: true }))
    
    // Create preview URLs for immediate feedback
    const previewUrls = fileArray.map(file => URL.createObjectURL(file))
    setImagePreviews(prev => ({ ...prev, [areaIndex]: previewUrls }))
    
    try {
      // Upload to Supabase
      const uploadResults = await uploadMultipleEnquiryImages(
        fileArray,
        category,
        submissionId,
        areaIndex
      )

      // Extract successful URLs
      const successfulUploads = uploadResults.filter(result => result.success)
      const imageUrls = successfulUploads.map(result => result.url!).filter(Boolean)
      
      if (imageUrls.length > 0) {
        setUploadedImageUrls(prev => ({ ...prev, [areaIndex]: imageUrls }))

        // Save image records to database
        const areaTitle = imageUploadAreas[areaIndex]?.title || `Area ${areaIndex}`
        for (let i = 0; i < successfulUploads.length; i++) {
          const result = successfulUploads[i]
          const file = fileArray[i]
          if (result.success && result.url && result.path) {
            await saveEnquiryImageRecord(
              submissionId,
              category,
              areaIndex,
              areaTitle,
              result.path,
              result.url,
              file.name,
              file.size,
              file.type
            )
          }
        }
      }

      // Check for any failed uploads
      const failedUploads = uploadResults.filter(result => !result.success)
      if (failedUploads.length > 0) {
        console.error('Some uploads failed:', failedUploads)
      }
      
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(prev => ({ ...prev, [areaIndex]: false }))
    }
    
    onImageUpload(areaIndex, files)
  }

  const handleSubmit = async () => {
    await onFormSubmit(uploadedImages, uploadedImageUrls)
  }


  // Cleanup effect for object URLs
  useEffect(() => {
    return () => {
      // Cleanup all preview URLs when component unmounts
      Object.values(imagePreviews).flat().forEach(url => {
        URL.revokeObjectURL(url)
      })
    }
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl  overflow-y-auto" variant="sidebar">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">Request eSurvey</DialogTitle>
          <DialogDescription>
            Help us provide better quotes by uploading photos of your setup
          </DialogDescription>
        </DialogHeader>

        {/* Image Upload Section */}
        <div className="space-y-6">
        
          <p className="text-sm">If you need help, give us a call <a href={`tel:${partnerPhone}`} className="text-blue-600 underline">{partnerPhone}</a></p>
          
          {/* Image Upload Areas */}
          <div className="space-y-4">
            {imageUploadAreas.map((area, index) => {
                const IconComponent = area.icon
                const hasFiles = uploadedImages[index]?.length > 0
                const uploading = isUploading[index]
                
                return (
                  <div key={index} className={`transition-colors cursor-pointer ${hasFiles ? 'border-gray-400' : 'border-gray-300 hover:border-gray-400'}`}>
                    <input
                      type="file"
                      ref={(el) => {
                        fileInputRefs.current[index] = el
                      }}
                      onChange={(e) => handleImageUpload(index, e.target.files)}
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploading}
                    />
                    <div 
                      className="flex items-center gap-3"
                      onClick={() => !uploading && fileInputRefs.current[index]?.click()}
                    >
                      <div className="w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden relative border-2 border-dashed p-2">
                        {uploading ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                        ) : hasFiles && imagePreviews[index]?.[0] ? (
                          <img 
                            src={imagePreviews[index][0]} 
                            alt="Preview"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Upload className="w-6 h-6 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{area.title}</h4>
                        <p className="text-sm text-gray-600">{area.description}</p>
                        {uploading && (
                          <p className="text-sm mt-1 text-blue-600">
                            Uploading...
                          </p>
                        )}
                        {!uploading && hasFiles && (
                          <p className="text-sm mt-1 text-green-600">
                            {uploadedImages[index].length} file(s) uploaded
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-6 border-t">
          <button 
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 py-3 rounded-full font-medium ${classes.button} ${classes.buttonText} disabled:opacity-50`}
          >
            {isSubmitting ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              'Submit eSurvey'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
