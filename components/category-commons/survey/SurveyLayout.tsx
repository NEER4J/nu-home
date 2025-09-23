'use client'

import { useMemo, useState, type ReactNode, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import { useRouter } from 'next/navigation'
import OrderSummarySidebar from '@/components/category-commons/checkout/OrderSummarySidebar'
import FinanceCalculator from '@/components/FinanceCalculator'
import CheckoutFAQ from '@/components/category-commons/checkout/CheckoutFAQ'

export interface CustomerDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
  postcode: string
  notes: string
}

export interface SurveyLayoutProps {
  selectedProduct: {
    partner_product_id: string
    partner_id: string
    name: string
    price: number | null
    image_url: string | null
    calculator_settings?: {
      selected_plan?: {
        apr: number
        months: number
      }
      selected_deposit?: number
    } | null
    selected_power?: {
      power: string
      price: number
      additional_cost: number
    } | null
  } | null
  selectedAddons?: any[]
  selectedBundles?: any[]
  companyColor?: string | null
  partnerSettings?: {
    apr_settings: Record<number, number> | null
  } | null
  currentCalculatorSettings?: {
    selected_plan?: { months: number; apr: number } | null
    selected_deposit?: number
  } | null
  prefillUserInfo?: {
    first_name: string
    last_name: string
    email: string
    phone: string
    postcode: string
    notes: string
  }
  submissionId?: string
  onSurveySubmit?: (surveyDetails: any) => void
  backHref?: string
  backLabel?: string
  showBack?: boolean
}

function getImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return url
  return `/${url}`
}

export default function SurveyLayout({
  selectedProduct,
  selectedAddons = [],
  selectedBundles = [],
  companyColor = null,
  partnerSettings = null,
  currentCalculatorSettings = null,
  prefillUserInfo,
  submissionId,
  onSurveySubmit,
  backHref = '/boiler/products',
  backLabel = 'Back to Products',
  showBack = true,
}: SurveyLayoutProps) {
  const classes = useDynamicStyles(companyColor)
  const router = useRouter()
  const [details, setDetails] = useState<CustomerDetails>({
    firstName: '', lastName: '', email: '', phone: '', postcode: '', notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showFinanceCalculator, setShowFinanceCalculator] = useState(false)
  const [calculatorSettings, setCalculatorSettings] = useState<{
    selected_plan?: { months: number; apr: number } | null
    selected_deposit?: number
  } | null>(null)

  // Pre-fill user info when component mounts
  useEffect(() => {
    if (prefillUserInfo) {
      setDetails({
        firstName: prefillUserInfo.first_name || '',
        lastName: prefillUserInfo.last_name || '',
        email: prefillUserInfo.email || '',
        phone: prefillUserInfo.phone || '',
        postcode: prefillUserInfo.postcode || '',
        notes: prefillUserInfo.notes || ''
      })
    }
  }, [prefillUserInfo])

  // Initialize calculator settings from selected product or current settings
  useEffect(() => {
    if (currentCalculatorSettings) {
      setCalculatorSettings(currentCalculatorSettings)
    } else if (selectedProduct?.calculator_settings) {
      setCalculatorSettings(selectedProduct.calculator_settings)
    }
  }, [currentCalculatorSettings, selectedProduct?.calculator_settings])

  // Calculator handlers
  const handleCalculatorPlanChange = (plan: { months: number; apr: number }) => {
    const newSettings = {
      ...calculatorSettings,
      selected_plan: plan
    }
    setCalculatorSettings(newSettings)
    console.log('Survey: Calculator plan changed:', newSettings)
  }

  const handleCalculatorDepositChange = (deposit: number) => {
    const newSettings = {
      ...calculatorSettings,
      selected_deposit: deposit
    }
    setCalculatorSettings(newSettings)
    console.log('Survey: Calculator deposit changed:', newSettings)
  }

  const handleCalculatorMonthlyPaymentUpdate = (monthlyPayment: number) => {
    // This is handled by the calculator itself, but we can use it for logging if needed
    console.log('Survey: Monthly payment updated:', monthlyPayment)
  }

  // Calculate order total
  const basePrice = useMemo(() => {
    if (selectedProduct?.selected_power?.price) {
      return selectedProduct.selected_power.price
    }
    return (typeof selectedProduct?.price === 'number' ? selectedProduct.price : 0)
  }, [selectedProduct?.price, selectedProduct?.selected_power?.price])
  
  const addonsTotal = useMemo(() => selectedAddons.reduce((s, a) => s + a.price * a.quantity, 0), [selectedAddons])
  const bundlesTotal = useMemo(() => selectedBundles.reduce((s, b) => s + b.quantity * b.unitPrice, 0), [selectedBundles])
  const orderTotal = useMemo(() => Math.max(0, basePrice + addonsTotal + bundlesTotal), [basePrice, addonsTotal, bundlesTotal])

  const handleSubmit = async () => {
    if (!details.firstName || !details.lastName || !details.email || !details.phone || !details.postcode) {
      return
    }

    setIsSubmitting(true)

    try {
      // Use custom survey submit handler if provided
      if (onSurveySubmit) {
        await onSurveySubmit(details)
      } else {
        // Fallback to original behavior
        // Save survey submission to database if submissionId exists
        if (submissionId) {
          await fetch('/api/partner-leads/update-payment', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              submissionId,
              surveyDetails: details,
              progressStep: 'survey_completed'
            }),
          })
        }

        // Send survey submission email and wait for completion
        try {
          console.log('Sending survey email...')
          const emailResponse = await fetch('/api/email/boiler/survey-submitted-v2', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              first_name: details.firstName,
              last_name: details.lastName,
              email: details.email,
              phone: details.phone,
              postcode: details.postcode,
              notes: details.notes,
              submission_id: submissionId
            }),
          })
          
          if (emailResponse.ok) {
            console.log('Survey email sent successfully')
          } else {
            console.warn('Failed to send survey email:', await emailResponse.text())
          }
        } catch (emailError) {
          console.error('Failed to send survey email:', emailError)
        }

        // Redirect to enquiry page after email is sent
        console.log('Redirecting to enquiry page...')
        const enquiryUrl = new URL('/boiler/enquiry', window.location.origin)
        if (submissionId) {
          enquiryUrl.searchParams.set('submission', submissionId)
        }
        router.push(enquiryUrl.toString())
      }
    } catch (error) {
      console.error('Failed to submit survey:', error)
      // Still redirect even if saving fails
      const enquiryUrl = new URL('/boiler/enquiry', window.location.origin)
      if (submissionId) {
        enquiryUrl.searchParams.set('submission', submissionId)
      }
      router.push(enquiryUrl.toString())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-8">
      <div>
        {showBack && (
          <button 
            onClick={() => {
              const url = new URL(backHref, window.location.origin)
              if (submissionId) url.searchParams.set('submission', submissionId)
              window.location.href = url.toString()
            }} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {backLabel}
          </button>
        )}
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">Tell us about your project</h1>
        
        <div className="grid lg:grid-cols-2 gap-8 bg-transparent md:bg-white rounded-xl p-0 md:p-8 mb-20">
          {/* FAQ Section */}
          <div className="hidden lg:block">
            <CheckoutFAQ />
          </div>
          
          {/* Survey Form */}
          <div className="">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">First name *</label>
              <input 
                value={details.firstName} 
                onChange={e => setDetails({ ...details, firstName: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                placeholder="e.g. Sam" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Last name *</label>
              <input 
                value={details.lastName} 
                onChange={e => setDetails({ ...details, lastName: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                placeholder="e.g. Doe" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Email address *</label>
              <input 
                type="email" 
                value={details.email} 
                onChange={e => setDetails({ ...details, email: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                placeholder="e.g. sam.doe@example.com" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Contact number *</label>
              <input 
                value={details.phone} 
                onChange={e => setDetails({ ...details, phone: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                placeholder="e.g. 07234 123456" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Postcode *</label>
              <input 
                value={details.postcode} 
                onChange={e => setDetails({ ...details, postcode: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                placeholder="e.g. SW1A 1AA" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Tell us about your project</label>
              <textarea 
                value={details.notes} 
                onChange={e => setDetails({ ...details, notes: e.target.value })} 
                className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} 
                rows={4} 
                placeholder="Tell us about your requirements, timeline, or any specific needs..." 
              />
            </div>
            <div className="col-span-2 flex gap-3">
        
              <button 
                onClick={handleSubmit} 
                disabled={!details.firstName || !details.lastName || !details.email || !details.phone || !details.postcode || isSubmitting}
                className={`flex-1 py-3 rounded-full font-medium flex items-center justify-center gap-2 ${classes.button} ${classes.buttonText} disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Survey'
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">By submitting your details, you agree to our privacy policy.</p>
        </div>
        
        {/* Mobile FAQ Section */}
        <div className="lg:hidden mt-8">
          <CheckoutFAQ />
        </div>
        </div>
      </div>

      {/* Order Summary Sidebar */}
      <OrderSummarySidebar
        selectedProduct={selectedProduct}
        selectedAddons={selectedAddons}
        selectedBundles={selectedBundles}
        companyColor={companyColor}
        partnerSettings={partnerSettings}
        currentCalculatorSettings={calculatorSettings}
        onContinue={() => {}} // No action needed for survey
        onOpenFinanceCalculator={() => setShowFinanceCalculator(true)}
        continueButtonText="Submit Survey"
        showContinueButton={false}
        showInstallationIncluded={true}
        showMobileCard={true}
      />

      {/* Finance Calculator Modal */}
      {selectedProduct && (
        <FinanceCalculator
          isOpen={showFinanceCalculator}
          onClose={() => setShowFinanceCalculator(false)}
          productPrice={orderTotal}
          productName={`${selectedProduct.name} + Add-ons`}
          productImageUrl={selectedProduct.image_url}
          aprSettings={partnerSettings?.apr_settings || null}
          brandColor={companyColor || undefined}
          selectedPlan={calculatorSettings?.selected_plan || selectedProduct?.calculator_settings?.selected_plan || undefined}
          selectedDeposit={calculatorSettings?.selected_deposit ?? selectedProduct?.calculator_settings?.selected_deposit ?? 0}
          onPlanChange={handleCalculatorPlanChange}
          onDepositChange={handleCalculatorDepositChange}
          onMonthlyPaymentUpdate={handleCalculatorMonthlyPaymentUpdate}
        />
      )}
    </div>
  )
}
