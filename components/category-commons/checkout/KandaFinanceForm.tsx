'use client'

import { useState } from 'react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'

interface KandaFinanceFormProps {
  amount: number
  companyColor?: string | null
  kandaSettings: any
  customerDetails: {
    firstName: string
    lastName: string
    email: string
    phone: string
    postcode: string
    notes: string
  }
  productDescription: string
  onApplicationSubmitted: () => void
  submissionId?: string
}

export default function KandaFinanceForm({
  amount,
  companyColor = null,
  kandaSettings,
  customerDetails,
  productDescription,
  onApplicationSubmitted,
  submissionId,
}: KandaFinanceFormProps) {
  const classes = useDynamicStyles(companyColor)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateKandaRequest = async () => {
    if (!kandaSettings) {
      setError('Kanda Finance is not configured for this partner')
      return
    }

    if (!kandaSettings.KANDA_ENTERPRISE_ID) {
      setError('Kanda Enterprise ID not configured. Please contact the partner to set up Kanda Finance.')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Generate the payload similar to the PHP implementation
      const payload = {
        price: Math.round(amount * 100), // Convert to pence
        email: customerDetails.email,
        first_name: customerDetails.firstName,
        last_name: customerDetails.lastName,
        mobile: customerDetails.phone,
        description_of_goods: productDescription,
        enterprise_id: kandaSettings.KANDA_ENTERPRISE_ID,
        work_type: 'boiler_swap',
      }

      // Create the signed request
      const response = await fetch('/api/kanda/generate-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload,
          enterpriseId: kandaSettings.KANDA_ENTERPRISE_ID,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate Kanda request')
      }

      const signedRequest = await response.text()
      
      console.log('Kanda API Response:', { signedRequest })
      console.log('Redirecting to:', `https://finance.kanda.co.uk/apply?signed_request=${encodeURIComponent(signedRequest)}`)

      // Set payment status to processing before redirecting
      if (submissionId) {
        try {
          await fetch('/api/partner-leads/update-payment', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              submissionId,
              paymentMethod: 'kanda',
              paymentStatus: 'processing',
              progressStep: 'checkout'
            }),
          })
          console.log('Payment status updated to processing')
        } catch (err) {
          console.error('Failed to update payment status to processing:', err)
          // Continue with redirect even if DB update fails
        }
      }

      // Redirect to Kanda portal with the signed request
      const kandaUrl = `https://finance.kanda.co.uk/apply?signed_request=${encodeURIComponent(signedRequest)}`
      window.location.href = kandaUrl

      // Call the callback to update the database
      onApplicationSubmitted()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate Kanda request'
      setError(errorMessage)
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-medium text-blue-800">Finance Application</h3>
        </div>
        <p className="text-sm text-blue-700">
          You'll be redirected to Kanda Finance to complete your application. 
          The form will be pre-filled with your details and the loan amount.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Finance Amount:</span>
              <span className="ml-2 font-semibold text-lg">£{amount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">Reference:</span>
              <span className="ml-2 font-medium font-mono">{customerDetails.firstName}-{Math.floor(Math.random() * 14501) + 500}</span>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>Your details will be pre-filled:</strong></p>
          <ul className="mt-2 space-y-1">
            <li>• Name: {customerDetails.firstName} {customerDetails.lastName}</li>
            <li>• Email: {customerDetails.email}</li>
            <li>• Phone: {customerDetails.phone}</li>
            <li>• Service: {productDescription}</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-yellow-800">
              <p><strong>Note:</strong> You'll be redirected to Kanda Finance's secure portal to complete your application.</p>
              <p className="mt-1">Your information will be pre-filled, and you can review and submit your finance application there.</p>
              <p className="mt-1"><strong>Status:</strong> Your application will be marked as "Processing" while you complete it on Kanda's portal.</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={generateKandaRequest}
        disabled={isProcessing || !kandaSettings?.KANDA_ENTERPRISE_ID}
        className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating Application...
          </div>
        ) : !kandaSettings?.KANDA_ENTERPRISE_ID ? (
          'Kanda Finance Not Configured'
        ) : (
          'Apply for Finance with Kanda'
        )}
      </button>

      <div className="text-xs text-gray-500 text-center">
        <p>Powered by Kanda Finance</p>
        <p className="mt-1">You'll be redirected to complete your application</p>
      </div>
    </div>
  )
}
