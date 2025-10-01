'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Camera, Phone, ChevronLeft, LucideIcon, Image } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import { uploadMultipleEnquiryImages, saveEnquiryImageRecord } from '@/lib/image-upload'

export interface ImageUploadArea {
  title: string
  description: string
  icon: LucideIcon
  required?: boolean
}

export interface FormField {
  name: string
  label: string
  description?: string
  placeholder?: string
  type?: 'text' | 'textarea' | 'select'
  required?: boolean
  options?: string[]
}

export interface EnquiryLayoutProps {
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
  imageUploadAreas: ImageUploadArea[]
  formFields: FormField[]
  submissionId: string // Required for image uploads
  
  // Handlers
  onImageUpload: (areaIndex: number, files: FileList) => void
  onFormSubmit: (formData: Record<string, any>, uploadedImages: Record<number, File[]>, uploadedImageUrls: Record<number, string[]>) => Promise<void>
  
  // State
  currentStep: number
  onStepChange: (step: number) => void
  isSubmitting?: boolean
}

export default function EnquiryLayout({
  companyColor,
  partnerPhone,
  customerName,
  customerDetails,
  onBack,
  backLabel,
  category,
  imageUploadAreas,
  formFields,
  submissionId,
  onImageUpload,
  onFormSubmit,
  currentStep,
  onStepChange,
  isSubmitting = false
}: EnquiryLayoutProps) {
  const classes = useDynamicStyles(companyColor || null)
  const [formData, setFormData] = useState<Record<string, any>>({})
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

  const handleFormChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
  }

  const handleSubmit = async () => {
    await onFormSubmit(formData, uploadedImages, uploadedImageUrls)
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
    <div className="min-h-[calc(100vh-100px)]">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {backLabel}
        </button>

        {/* Header Section */}
        <div className="mb-8">
          <div className="mb-4">
            <div>
              <h1 className="text-xl md:text-4xl mb-2 font-semibold text-gray-900">
                Thanks, {customerName}
              </h1>
              <p className="text-gray-600">
                To help us provide you with the best quote, please complete the form below by uploading images and filling in the details. If you have any questions, contact our team on {partnerPhone || '0330 113 1333'}.
              </p>
            </div>
          </div>
        </div>


        {/* Main Content - Image Upload and Form */}
        <div className="space-y-8">
          {/* Image Upload Section */}
          <div className="space-y-6 bg-white rounded-xl p-4 md:p-8">
            <div className="flex items-center gap-2"> 
              <h3 className="bg-slate-900 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">1</h3>
              <h3 className="text-lg font-semibold text-gray-900">Upload your images</h3>
            </div>
            <p className="text-gray-600">
              From the pictures, we'll have a better understanding of your setup, allowing us to order the correct materials and prevent delays on the day.
            </p>
            <p className="text-sm">If you're stuck or need some help, give us a call <a href={`tel:${partnerPhone}`} className="text-blue-600 underline">{partnerPhone}</a></p>
            
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

          {/* Form Section */}
          <div className="space-y-4 bg-white rounded-xl p-4 md:p-8">
            <div className="flex items-center gap-2"> 
              <h3 className="bg-slate-900 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">2</h3>
              <h3 className="text-lg font-semibold text-gray-900">Fill in your details</h3>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 md:gap-8 gap-4">
              {formFields.map((field, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.description && (
                    <p className="text-sm text-gray-600 mb-2">{field.description}</p>
                  )}
                  
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFormChange(field.name, e.target.value)}
                      className={`w-full border border-gray-300 rounded-md px-3 py-2 ${classes.inputFocus}`}
                      placeholder={field.placeholder}
                      rows={3}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFormChange(field.name, e.target.value)}
                      className={`w-full border border-gray-300 rounded-md px-3 py-2 ${classes.inputFocus}`}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((option, optIndex) => (
                        <option key={optIndex} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFormChange(field.name, e.target.value)}
                      className={`w-full border border-gray-300 rounded-md px-3 py-2 ${classes.inputFocus}`}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-3 rounded-full mt-4 font-medium ${classes.button} ${classes.buttonText} disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Enquiry'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}