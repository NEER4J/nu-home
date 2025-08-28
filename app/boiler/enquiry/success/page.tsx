'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle, Phone, Clock } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'

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

function EnquirySuccessContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null)
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null)

  const submissionId = searchParams?.get('submission') ?? null

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      
      // If no submission ID, show generic success
      if (!submissionId) {
        console.warn('No submission ID provided, showing generic success page')
        setLoading(false)
        return
      }

      try {
        // Load submission data
        const { data: submissionData, error: submissionError } = await supabase
          .from('partner_leads')
          .select('assigned_partner_id, first_name, last_name, email, phone, postcode, notes')
          .eq('submission_id', submissionId)
          .single()

        if (submissionError || !submissionData) {
          console.warn('Failed to load submission, showing generic success page')
          setLoading(false)
          return
        }

        // Set customer details
        setCustomerDetails({
          first_name: submissionData.first_name || '',
          last_name: submissionData.last_name || '',
          email: submissionData.email || '',
          phone: submissionData.phone || '',
          postcode: submissionData.postcode || '',
          notes: submissionData.notes || ''
        })

        // Load partner data if available
        if (submissionData.assigned_partner_id) {
          try {
            const { data: partnerData, error: partnerError } = await supabase
              .from('UserProfiles')
              .select('user_id, company_name, company_color, logo_url, phone')
              .eq('user_id', submissionData.assigned_partner_id)
              .single()

            if (!partnerError && partnerData) {
              setPartnerInfo(partnerData)
            }
          } catch (partnerErr) {
            console.warn('Failed to load partner info:', partnerErr)
          }
        }
      } catch (err) {
        console.error('Error in loadData:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [submissionId, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="bg-green-100 rounded-full p-4 mx-auto mb-6 w-20 h-20 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-semibold text-gray-900 mb-4">
            Thank you, {customerDetails?.first_name || 'valued customer'}!
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Your enquiry has been submitted successfully.
          </p>
          <p className="text-gray-600">
            We've received your details and uploaded images. Our team will review your requirements and be in touch soon.
          </p>
        </div>

        {/* Reference Number */}
        {submissionId && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Reference Number</h3>
            <div className="bg-gray-100 rounded-lg p-4 font-mono text-lg font-medium text-gray-800">
              {submissionId}
            </div>
            <p className="text-sm text-gray-600 mt-2">Please keep this reference number for your records</p>
          </div>
        )}

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Phone</p>
                <p className="text-blue-600 hover:text-blue-800">
                  <a href={`tel:${partnerInfo?.phone || '0330 113 1333'}`}>
                    {partnerInfo?.phone || '0330 113 1333'}
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Response Time</p>
                <p className="text-gray-600">We'll contact you within 24-48 hours</p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        {partnerInfo?.company_name && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <div className="flex items-center gap-4 mb-4">
              {partnerInfo.logo_url && (
                <img 
                  src={partnerInfo.logo_url} 
                  alt={partnerInfo.company_name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{partnerInfo.company_name}</h3>
                <p className="text-gray-600">Your trusted boiler installation partner</p>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">What happens next?</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                1
              </div>
              <p className="text-blue-800">We'll review your enquiry and uploaded images</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                2
              </div>
              <p className="text-blue-800">Our technical team will assess your requirements</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                3
              </div>
              <p className="text-blue-800">We'll contact you within 24-48 hours to discuss details</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                4
              </div>
              <p className="text-blue-800">We'll arrange a site survey at your convenience</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                5
              </div>
              <p className="text-blue-800">You'll receive a detailed quote and installation plan</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => window.location.href = '/boiler/products'} 
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Products
          </button>
          <button 
            onClick={() => window.location.href = '/'} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EnquirySuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <EnquirySuccessContent />
    </Suspense>
  )
}