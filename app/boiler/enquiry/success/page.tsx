'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resolvePartnerByHost } from '@/lib/partner'

function EnquirySuccessContent() {
  const searchParams = useSearchParams()
  const submissionId = searchParams?.get('submission_id') || searchParams?.get('submission')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyColor, setCompanyColor] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const hostname = window.location.hostname
        const partner = await resolvePartnerByHost(supabase, hostname)
        if (partner) {
          setCompanyColor(partner.company_color || null)
        }
        
        // Simulate a brief loading time for better UX
        setTimeout(() => {
          setLoading(false)
        }, 1000)
      } catch (err) {
        console.error('Error loading partner info:', err)
        setLoading(false)
      }
    }
    
    init()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: companyColor || '#3B82F6' }}
          ></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-3 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.history.back()} 
            className="px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: companyColor || '#3B82F6' }}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        {/* Success Checkbox */}
        <div 
          className="rounded-full p-4 mx-auto mb-6 w-20 h-20 flex items-center justify-center"
          style={{ backgroundColor: companyColor || '#3B82F6' }}
        >
          <Check className="w-12 h-12 text-white" />
        </div>

        {/* Big Thank You Message */}
        <h1 
          className="text-4xl font-bold mb-4"
          style={{ color: companyColor || '#3B82F6' }}
        >
          Thank You!
        </h1>

        {/* Simple Message */}
        <p className="text-lg text-gray-600 mb-8">
          Your enquiry has been successfully submitted. We'll be in touch with you shortly to discuss your requirements.
        </p>

        {/* Order ID (if available) */}
        {submissionId && (
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border hidden ">
            <p className="text-sm text-gray-500 mb-1">Reference Number</p>
            <p className="font-mono text-sm font-medium text-gray-700">{submissionId}</p>
          </div>
        )}

        {/* Return Home Button */}
        <button 
          onClick={() => window.location.href = '/'} 
          className="px-8 py-3 rounded-full text-white font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: companyColor || '#3B82F6' }}
        >
          Return Home
        </button>
      </div>
    </div>
  )
}

export default function EnquirySuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <EnquirySuccessContent />
    </Suspense>
  )
}