'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Gauge, Home, Droplets, Thermometer, Settings, Building } from 'lucide-react'
import EnquiryLayout, { ImageUploadArea, FormField } from '@/components/category-commons/enquiry/EnquiryLayout'

interface PartnerInfo {
  user_id: string
  company_name: string
  company_color: string | null
  logo_url: string | null
  phone: string | null
}

interface CustomerDetails {
  first_name: string
  last_name: string
  email: string
  phone: string
  postcode: string
  notes: string
}

// Configuration for boiler enquiry
const boilerImageUploadAreas: ImageUploadArea[] = [
  { title: "Gas meter area", description: "Showing the meter and space around it", icon: Gauge, required: true },
  { title: "Front of property (stood back)", description: "Showing as much of it as possible", icon: Home, required: true },
  { title: "Hot water tank", description: "Showing the space and pipework around it", icon: Droplets, required: true },
  { title: "Existing controls/thermostat", description: "Showing the make/model if possible", icon: Thermometer, required: false },
  { title: "Existing pump/valves", description: "Usually found in your airing cupboard", icon: Settings, required: false },
  { title: "Rear of property (stood back)", description: "Showing as much of it as possible", icon: Building, required: false }
]

const boilerFormFields: FormField[] = [
  {
    name: "currentBoilerMake",
    label: "Current boiler make/model",
    description: "You'll usually find this on the front or side",
    placeholder: "e.g. Vaillant, Bosch, Worcester",
    required: true
  },
  {
    name: "currentBoilerLocation",
    label: "Current boiler location",
    description: "Kitchen, garage, airing cupboard etc",
    placeholder: "Enter answer here",
    required: true
  },
  {
    name: "flueLocation",
    label: "Is your flue in a void?",
    description: "i.e are sections of it boxed in",
    placeholder: "Enter answer here",
    required: false
  },
  {
    name: "loftAccess",
    label: "Does your loft have a light/ladder?",
    description: "Both need to be permanent (fixed)",
    placeholder: "Enter answer here",
    required: false
  },
  {
    name: "newBoilerLocation",
    label: "Proposed new boiler location",
    description: "Where would you like it installing?",
    placeholder: "e.g Kitchen, loft etc",
    required: true
  },
  {
    name: "showersCount",
    label: "How many showers do you have?",
    description: "Fixed shower heads only (not bath taps)",
    placeholder: "e.g 1 shower",
    required: false
  },
  {
    name: "hasHeatingHotWater",
    label: "Do you currently have heating/hot water?",
    description: "This helps us to prepare for your install",
    placeholder: "Enter answer here",
    required: false
  }
]

function EnquiryContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null)
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submissionId = searchParams?.get('submission') ?? null

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        let partnerId: string | null = null

        if (submissionId) {
          const { data: submissionData, error: submissionError } = await supabase
            .from('partner_leads')
            .select('assigned_partner_id, first_name, last_name, email, phone, postcode, notes')
            .eq('submission_id', submissionId)
            .single()

          if (submissionError) {
            console.error('Error loading submission:', submissionError)
            setError('Failed to load submission data')
            return
          }

          if (submissionData) {
            partnerId = submissionData.assigned_partner_id
            setCustomerDetails({
              first_name: submissionData.first_name || '',
              last_name: submissionData.last_name || '',
              email: submissionData.email || '',
              phone: submissionData.phone || '',
              postcode: submissionData.postcode || '',
              notes: submissionData.notes || ''
            })
          }
        }

        if (!partnerId) {
          setError('No partner information found')
          return
        }

        const { data: partnerData, error: partnerError } = await supabase
          .from('UserProfiles')
          .select('user_id, company_name, company_color, logo_url, phone')
          .eq('user_id', partnerId as string)
          .single()

        if (partnerError) {
          console.error('Error loading partner:', partnerError)
          setError('Failed to load partner information')
          return
        }

        setPartnerInfo(partnerData)

        // Update progress to 'enquiry' when user reaches enquiry page
        if (submissionId) {
          try {
            await fetch('/api/partner-leads/update-enquiry', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                submissionId,
                progressStep: 'enquiry'
              }),
            })
          } catch (progressError) {
            console.error('Failed to update progress to enquiry:', progressError)
          }
        }
      } catch (err) {
        console.error('Error in loadData:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [submissionId, supabase])

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    } else {
      window.location.href = '/boiler/survey' + (submissionId ? `?submission=${submissionId}` : '')
    }
  }

  const handleImageUpload = (areaIndex: number, files: FileList) => {
    console.log(`Uploaded ${files.length} files for area ${areaIndex}`)
  }

  const handleFormSubmit = async (formData: Record<string, any>, uploadedImages: Record<number, File[]>, uploadedImageUrls: Record<number, string[]>) => {
    setIsSubmitting(true)

    try {
      // Send enquiry submission email
      try {
        await fetch('/api/email/boiler/enquiry-submitted', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first_name: customerDetails?.first_name,
            last_name: customerDetails?.last_name,
            email: customerDetails?.email,
            phone: customerDetails?.phone,
            postcode: customerDetails?.postcode,
            enquiry_details: formData,
            submission_id: submissionId,
            category: 'boiler',
            uploaded_image_urls: uploadedImageUrls
          }),
        })
      } catch (emailError) {
        console.error('Failed to send enquiry email:', emailError)
      }

      // Update partner_leads progress to enquiry_completed
      if (submissionId) {
        try {
          await fetch('/api/partner-leads/update-enquiry', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              submissionId,
              enquiryDetails: formData,
              progressStep: 'enquiry_completed'
            }),
          })
        } catch (progressError) {
          console.error('Failed to update progress:', progressError)
        }
      }

      // Images are already uploaded to Supabase storage and tracked in database
      console.log('Enquiry submitted successfully', { 
        formData, 
        uploadedImages: Object.keys(uploadedImages).length,
        uploadedImageUrls: Object.keys(uploadedImageUrls).length
      })

      // Redirect to enquiry success page
      const successUrl = new URL('/boiler/enquiry/success', window.location.origin)
      if (submissionId) {
        successUrl.searchParams.set('submission', submissionId)
      }
      window.location.href = successUrl.toString()
      
    } catch (error) {
      console.error('Failed to submit enquiry:', error)
      alert('Failed to submit enquiry. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading enquiry...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.href = '/boiler/products'} 
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Back to Products
          </button>
        </div>
      </div>
    )
  }

  if (!partnerInfo || !customerDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Information Not Found</div>
          <p className="text-gray-600">Unable to find enquiry information.</p>
          <button 
            onClick={() => window.location.href = '/boiler/products'} 
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Back to Products
          </button>
        </div>
      </div>
    )
  }

  return (
    <EnquiryLayout
      companyColor={partnerInfo.company_color}
      partnerPhone={partnerInfo.phone}
      customerName={customerDetails.first_name}
      customerDetails={{
        name: `${customerDetails.first_name} ${customerDetails.last_name}`,
        phone: customerDetails.phone,
        email: customerDetails.email,
        postcode: customerDetails.postcode
      }}
      onBack={handleBack}
      backLabel={currentStep === 2 ? 'Back to Step 1' : 'Back to Survey'}
      category="boiler"
      imageUploadAreas={boilerImageUploadAreas}
      formFields={boilerFormFields}
      submissionId={submissionId || 'temp-' + Date.now()}
      onImageUpload={handleImageUpload}
      onFormSubmit={handleFormSubmit}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      isSubmitting={isSubmitting}
    />
  )
}

export default function EnquiryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading enquiry...</p>
        </div>
      </div>
    }>
      <EnquiryContent />
    </Suspense>
  )
}