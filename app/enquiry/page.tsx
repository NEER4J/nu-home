'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle, Mail, Phone, MapPin } from 'lucide-react'

interface PartnerInfo {
  user_id: string
  company_name: string
  company_color: string | null
  logo_url: string | null
}

function EnquiryContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null)
  const [submissionData, setSubmissionData] = useState<any>(null)

  // Read submission id to persist context (if present)
  const submissionId = searchParams?.get('submission') ?? null

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        if (submissionId) {
          // Get submission data
          const { data: submissionData, error: submissionError } = await supabase
            .from('partner_leads')
            .select('*')
            .eq('submission_id', submissionId)
            .single()

          if (!submissionError && submissionData) {
            setSubmissionData(submissionData)

                         // Get partner info from UserProfiles table
             const { data: partnerData, error: partnerError } = await supabase
               .from('UserProfiles')
               .select('user_id, company_name, company_color, logo_url')
               .eq('user_id', submissionData.assigned_partner_id)
               .single()

            if (!partnerError && partnerData) {
              setPartnerInfo(partnerData)
            }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Thank you for your enquiry!
            </h1>
            <p className="text-gray-600">
              We've received your information and will be in touch with you shortly.
            </p>
          </div>

          {partnerInfo && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="font-medium text-gray-900 mb-2">
                {partnerInfo.company_name}
              </h2>
              <p className="text-sm text-gray-600">
                Our team will review your requirements and contact you within 24 hours.
              </p>
            </div>
          )}

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              <span>Check your email for confirmation</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              <span>We'll call you within 24 hours</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Local installation team will contact you</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button 
              onClick={() => window.location.href = '/boiler/products'} 
              className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
            >
              Browse More Products
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EnquiryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <EnquiryContent />
    </Suspense>
  )
}
