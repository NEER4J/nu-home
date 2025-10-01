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

  const removeImage = (areaIndex: number, imageIndex: number) => {
    setUploadedImages(prev => {
      const newImages = { ...prev }
      if (newImages[areaIndex]) {
        newImages[areaIndex] = newImages[areaIndex].filter((_, index) => index !== imageIndex)
        if (newImages[areaIndex].length === 0) {
          delete newImages[areaIndex]
        }
      }
      return newImages
    })
    
    setImagePreviews(prev => {
      const newPreviews = { ...prev }
      if (newPreviews[areaIndex]) {
        URL.revokeObjectURL(newPreviews[areaIndex][imageIndex])
        newPreviews[areaIndex] = newPreviews[areaIndex].filter((_, index) => index !== imageIndex)
        if (newPreviews[areaIndex].length === 0) {
          delete newPreviews[areaIndex]
        }
      }
      return newPreviews
    })
    
    setUploadedImageUrls(prev => {
      const newUrls = { ...prev }
      if (newUrls[areaIndex]) {
        newUrls[areaIndex] = newUrls[areaIndex].filter((_, index) => index !== imageIndex)
        if (newUrls[areaIndex].length === 0) {
          delete newUrls[areaIndex]
        }
      }
      return newUrls
    })
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">eSurvey - Upload Photos</DialogTitle>
          <DialogDescription>
            Help us provide better quotes by uploading photos of your setup
          </DialogDescription>
        </DialogHeader>

        {/* Customer Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Customer Information</h3>
          <div className="text-sm text-gray-600">
            <p><strong>Name:</strong> {customerDetails.name}</p>
            <p><strong>Email:</strong> {customerDetails.email}</p>
            <p><strong>Phone:</strong> {customerDetails.phone}</p>
            <p><strong>Postcode:</strong> {customerDetails.postcode}</p>
          </div>
        </div>

        {/* Image Upload Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2"> 
            <h3 className="bg-slate-900 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">1</h3>
            <h3 className="text-lg font-semibold text-gray-900">Upload your photos</h3>
          </div>
          <p className="text-gray-600">
            Upload photos to help us understand your current setup and provide more accurate quotes.
          </p>
          <p className="text-sm">If you need help, give us a call <a href={`tel:${partnerPhone}`} className="text-blue-600 underline">{partnerPhone}</a></p>
          
          {/* Image Upload Areas */}
          <div className="space-y-4">
            {imageUploadAreas.map((area, index) => {
                const IconComponent = area.icon
                const hasFiles = uploadedImages[index]?.length > 0
                const uploading = isUploading[index]
                const previews = imagePreviews[index] || []
                
                return (
                  <div key={index} className={`border-2 border-dashed rounded-lg p-4 transition-colors ${hasFiles ? 'border-gray-400' : 'border-gray-300 hover:border-gray-400'}`}>
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
                      className="cursor-pointer"
                      onClick={() => !uploading && fileInputRefs.current[index]?.click()}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden relative border-2 border-dashed p-2">
                          {uploading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                          ) : hasFiles && previews[0] ? (
                            <img 
                              src={previews[0]} 
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
                      
                      {/* Image Previews */}
                      {previews.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                          {previews.map((preview, imgIndex) => (
                            <div key={imgIndex} className="relative">
                              <img 
                                src={preview} 
                                alt={`Preview ${imgIndex + 1}`}
                                className="w-full h-20 object-cover rounded-lg border"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeImage(index, imgIndex)
                                }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
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
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText} disabled:opacity-50`}
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
