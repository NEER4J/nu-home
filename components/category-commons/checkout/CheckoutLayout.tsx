'use client'

import { useMemo, useState, type ReactNode, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Info, Calculator, Loader2 } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import StripePaymentForm from './StripePaymentForm'
import KandaFinanceForm from './KandaFinanceForm'
import OrderSummarySidebar from './OrderSummarySidebar'
import FinanceCalculator from '@/components/FinanceCalculator'
import CheckoutFAQ from './CheckoutFAQ'

// Initialize Stripe (this will be overridden by the actual keys from partner settings)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')

type BundleDiscountType = 'fixed' | 'percent'

export interface AddonLite {
  addon_id: string
  title: string
  description: string
  price: number
  image_link: string | null
  allow_multiple: boolean
  max_count: number | null
  addon_type_id: string
}

export interface BundleAddonItemLite {
  bundle_addon_id: string
  bundle_id: string
  addon_id: string
  quantity: number
  Addons?: AddonLite
}

export interface BundleLite {
  bundle_id: string
  partner_id: string
  title: string
  description: string | null
  discount_type: BundleDiscountType
  discount_value: number
  service_category_id: string | null
  BundlesAddons?: BundleAddonItemLite[]
}

export interface SelectedProductLite {
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
}

export interface SelectedAddonItem extends AddonLite { quantity: number }
export interface SelectedBundleItem { bundle: BundleLite; quantity: number; unitPrice: number }

export interface CustomerDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
  postcode: string
  notes: string
}

export interface CheckoutLayoutProps {
  selectedProduct: SelectedProductLite | null
  selectedAddons: SelectedAddonItem[]
  selectedBundles: SelectedBundleItem[]
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
  paymentSettings?: {
    is_stripe_enabled: boolean
    is_kanda_enabled: boolean
    is_monthly_payment_enabled: boolean
    is_pay_after_installation_enabled: boolean
    stripe_settings: any
    kanda_settings: any
  }
  submissionId?: string
  onCalculatorPlanChange?: (plan: { months: number; apr: number }) => void
  onCalculatorDepositChange?: (deposit: number) => void
  onCalculatorMonthlyPaymentUpdate?: (monthlyPayment: number) => void
  onSubmitBooking: (details: CustomerDetails & { date: string }) => void
  backHref?: string
  backLabel?: string
  showBack?: boolean
  showMobileCard?: boolean
}

function getImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return url
  return `/${url}`
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }

export default function CheckoutLayout({
  selectedProduct,
  selectedAddons,
  selectedBundles,
  companyColor = null,
  partnerSettings = null,
  currentCalculatorSettings = null,
  prefillUserInfo,
  paymentSettings,
  submissionId,
  onCalculatorPlanChange,
  onCalculatorDepositChange,
  onCalculatorMonthlyPaymentUpdate,
  onSubmitBooking,
  backHref = '/boiler/addons',
  backLabel = 'Back to Add-ons',
  showBack = true,
  showMobileCard = false,
}: CheckoutLayoutProps) {
  const classes = useDynamicStyles(companyColor)
  const [step, setStep] = useState<1 | 2>(1)
  const [cursor, setCursor] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [showFinanceCalculator, setShowFinanceCalculator] = useState(false)
  const [loadingPaymentMethod, setLoadingPaymentMethod] = useState<string | null>(null)
  const [calculatorSettings, setCalculatorSettings] = useState<{
    selected_plan?: { months: number; apr: number } | null
    selected_deposit?: number
  } | null>(null)
  const [details, setDetails] = useState<CustomerDetails>({
    firstName: '', lastName: '', email: '', phone: '', postcode: '', notes: ''
  })

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

  // Initialize calculator settings from selected product
  useEffect(() => {
    if (selectedProduct?.calculator_settings) {
      setCalculatorSettings(selectedProduct.calculator_settings)
    }
  }, [selectedProduct?.calculator_settings])

  // Calculator handlers
  const handleCalculatorPlanChange = (plan: { months: number; apr: number }) => {
    setCalculatorSettings(prev => ({
      ...prev,
      selected_plan: plan
    }))
  }

  const handleCalculatorDepositChange = (deposit: number) => {
    setCalculatorSettings(prev => ({
      ...prev,
      selected_deposit: deposit
    }))
  }

  const handleCalculatorMonthlyPaymentUpdate = (monthlyPayment: number) => {
    // This is handled by the calculator itself, but we can use it for logging if needed
    console.log('Monthly payment updated:', monthlyPayment)
  }

  const basePrice = useMemo(() => {
    if (selectedProduct?.selected_power?.price) {
      return selectedProduct.selected_power.price
    }
    return (typeof selectedProduct?.price === 'number' ? selectedProduct.price : 0)
  }, [selectedProduct?.price, selectedProduct?.selected_power?.price])
  const addonsTotal = useMemo(() => selectedAddons.reduce((s, a) => s + a.price * a.quantity, 0), [selectedAddons])
  const bundlesTotal = useMemo(() => selectedBundles.reduce((s, b) => s + b.quantity * b.unitPrice, 0), [selectedBundles])
  const orderTotal = useMemo(() => Math.max(0, basePrice + addonsTotal + bundlesTotal), [basePrice, addonsTotal, bundlesTotal])

  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor)
    const end = endOfMonth(cursor)
    const days: Date[] = []
    for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      days.push(d)
    }
    return days
  }, [cursor])

  const handleBookInstall = () => {
    if (!selectedDate) return
    setStep(2)
  }

  const handlePay = () => {
    if (!selectedDate) { setStep(1); return }
    onSubmitBooking({ ...details, date: selectedDate })
  }

  const handlePaymentMethodSelect = async (method: string) => {
    setSelectedPaymentMethod(method)
    
    // Save payment method selection to database if submissionId exists
    if (submissionId) {
      try {
        await fetch('/api/partner-leads/update-payment', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            submissionId,
            paymentMethod: method,
            paymentStatus: 'pending',
            progressStep: 'checkout'
          }),
        })
      } catch (err) {
        console.error('Failed to save payment method selection:', err)
        // Don't fail the flow if saving to DB fails
      }
    }
  }

  const sendCheckoutEmail = async (paymentMethod: 'stripe' | 'monthly' | 'pay-later', additionalData: any = {}) => {
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const subdomain = hostname || null

      // Extract payment plan fields for monthly payment method
      let paymentPlanFields = {}
      if (paymentMethod === 'monthly' && additionalData.payment_plan) {
        const plan = additionalData.payment_plan
        paymentPlanFields = {
          monthlyPayment: plan.monthly_amount ? `£${plan.monthly_amount.toFixed(2)}` : undefined,
          paymentDuration: plan.duration_months ? `${plan.duration_months} months` : undefined,
          deposit: plan.deposit_amount !== undefined ? `£${plan.deposit_amount.toFixed(2)}` : (plan.deposit_percentage !== undefined ? `${plan.deposit_percentage}%` : '£0.00'),
          apr: plan.apr ? `${plan.apr}%` : undefined,
          totalAmount: plan.total_amount ? `£${plan.total_amount.toFixed(2)}` : undefined,
        }
      }

      // Detect if running in iframe
      const isIframe = window.self !== window.top;

      const emailData = {
        first_name: details.firstName,
        last_name: details.lastName,
        email: details.email,
        phone: details.phone,
        postcode: details.postcode,
        order_details: {
          product: selectedProduct ? {
            id: selectedProduct.partner_product_id,
            name: selectedProduct.name,
            price: basePrice
          } : null,
          addons: selectedAddons.map(addon => ({
            title: addon.title,
            quantity: addon.quantity,
            price: addon.price
          })),
          bundles: selectedBundles.map(bundle => ({
            title: bundle.bundle.title,
            quantity: bundle.quantity,
            unitPrice: bundle.unitPrice
          })),
          total: orderTotal
        },
        installation_date: selectedDate,
        submission_id: submissionId,
        subdomain,
        is_iframe: isIframe,
        ...paymentPlanFields,
        ...additionalData
      }

      const apiEndpoints = {
        stripe: '/api/email/boiler/checkout-stripe',
        monthly: '/api/email/boiler/checkout-monthly',
        'pay-later': '/api/email/boiler/checkout-pay-later'
      }

      const res = await fetch(apiEndpoints[paymentMethod], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.warn(`Failed to send ${paymentMethod} checkout email:`, data?.error || 'Unknown error')
      }
    } catch (err: any) {
      console.warn(`Failed to send ${paymentMethod} checkout email:`, err?.message || 'Unknown error')
    }
  }

  const generateProductDescription = () => {
    let description = selectedProduct?.name || 'Boiler Installation'
    
    if (selectedAddons.length > 0) {
      const addonNames = selectedAddons.map(a => `${a.title} (x${a.quantity})`).join(', ')
      description += ` with ${addonNames}`
    }
    
    if (selectedBundles.length > 0) {
      const bundleNames = selectedBundles.map(b => `${b.bundle.title} (x${b.quantity})`).join(', ')
      description += ` and ${bundleNames}`
    }
    
    return description
  }

  return (
    <div className="container mx-auto px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-8 ">
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
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-5">{step === 1 ? 'Book your install' : 'Complete your order'}</h1>
        

        {step === 1 && (
          <div className="grid lg:grid-cols-2 gap-8 bg-transparent md:bg-white rounded-xl p-0 md:p-8 mb-20">
            {/* Calendar */}
            <div className="bg-gray-100 rounded-xl p-4 md:p-6 md:bg-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium">{cursor.toLocaleString('default', { month: 'long' })} {cursor.getFullYear()}</div>
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-md border flex items-center justify-center" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></button>
                  <button className="w-8 h-8 rounded-md border flex items-center justify-center" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-xs text-gray-500 mt-3">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="py-2">{d}</div>)}
              </div>
              {/* days */}
              <div className="grid grid-cols-7 gap-2 mt-2">
                {(() => {
                  const firstWeekday = (startOfMonth(cursor).getDay() + 6) % 7 // make Monday=0
                  const blanks = Array.from({ length: firstWeekday })
                  const cells: ReactNode[] = []
                  blanks.forEach((_, i) => cells.push(<div key={`b-${i}`} />))
                  monthDays.forEach(d => {
                    const key = d.toISOString().slice(0,10)
                    const selected = selectedDate === key
                    const disabled = d < new Date(new Date().toDateString())
                    cells.push(
                      <button key={key} disabled={disabled} onClick={() => setSelectedDate(key)} className={`h-12 rounded-lg border text-sm ${selected ? `${classes.button} ${classes.buttonText}` : 'bg-gray-50'} disabled:opacity-50`}>{d.getDate()}</button>
                    )
                  })
                  return cells
                })()}
              </div>
              <div className="mt-4 text-sm text-gray-600 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5" />
                <div>Your installation should take 1-2 days to complete, and our installers will be on site between 8-10am.</div>
              </div>
            </div>

            {/* Details form */}
            <div className="">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">First name *</label>
                  <input value={details.firstName} onChange={e => setDetails({ ...details, firstName: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} placeholder="e.g. Sam" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Last name *</label>
                  <input value={details.lastName} onChange={e => setDetails({ ...details, lastName: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} placeholder="e.g. Doe" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Email address *</label>
                  <input type="email" value={details.email} onChange={e => setDetails({ ...details, email: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} placeholder="e.g. sam.doe@example.com" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Contact number *</label>
                  <input value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} placeholder="e.g. 07234 123456" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Postcode *</label>
                  <input value={details.postcode} onChange={e => setDetails({ ...details, postcode: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Notes, or comments</label>
                  <textarea value={details.notes} onChange={e => setDetails({ ...details, notes: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} rows={3} placeholder="e.g. My property has..." />
                </div>
                <div className="col-span-2 flex gap-3">
                 
                  <button 
                    onClick={handleBookInstall} 
                    disabled={!selectedDate || !details.firstName || !details.lastName || !details.email || !details.phone || !details.postcode}
                    className={`flex-1 py-3 rounded-full font-medium ${classes.button} ${classes.buttonText} disabled:opacity-50`}
                  >
                    Book install
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">By submitting your details, you agree to our privacy policy.</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid lg:grid-cols-2 gap-8 bg-transparent md:bg-white rounded-xl p-0 md:p-8">
            {/* FAQ Section */}
            <div className="hidden lg:block">
              <CheckoutFAQ />
            </div>
            
            {/* Payment Section */}
            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-700">Pay by card, or spread the cost with low monthly payments</h2>
              
              {/* Payment Options */}
              <div className="space-y-4">
              {/* Stripe Payment */}
              {paymentSettings?.is_stripe_enabled && paymentSettings?.stripe_settings && (
                <div 
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedPaymentMethod === 'stripe' ? 'ring-2 ring-[#646ede] bg-[#646ede]/5' : 'hover:border-[#646ede]'}`}
                  onClick={() => handlePaymentMethodSelect('stripe')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === 'stripe' ? 'bg-[#646ede] border-[#646ede]' : 'border-gray-300'}`}>
                      {selectedPaymentMethod === 'stripe' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center justify-between flex-1">
                      <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">Pay by Card</h3>
                    {paymentSettings.stripe_settings.enabled_environment === 'test' && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Test Mode
                      </span>
                    )}
                  </div>
                      <div className="flex items-center">
                        <Image 
                          src="/stripe.png" 
                          alt="Stripe" 
                          width={120} 
                          height={35} 
                          className="h-6 w-auto"
                        />
                    </div>
                    </div>
                  </div>
                  
                  {selectedPaymentMethod === 'stripe' && (
                    <div className="space-y-4 mt-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 mt-0.5 text-blue-600" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Secure Card Payment</p>
                            <p>Your payment is processed securely through Stripe. We accept all major credit and debit cards including Visa, Mastercard, and American Express.</p>
                          </div>
                    </div>
                  </div>
                  
                                            {/* Show Stripe form when selected */}
                      {(() => {
                        const partnerStripePromise = loadStripe(
                          paymentSettings.stripe_settings.enabled_environment === 'live' 
                            ? paymentSettings.stripe_settings.STRIPE_PUBLISHABLE_KEY_LIVE
                            : paymentSettings.stripe_settings.STRIPE_PUBLISHABLE_KEY_TEST
                        )
                        
                        return (
                          <Elements stripe={partnerStripePromise}>
                            <StripePaymentForm
                              amount={orderTotal}
                              companyColor={companyColor}
                              stripeSecretKey={
                                paymentSettings.stripe_settings.enabled_environment === 'live' 
                                  ? paymentSettings.stripe_settings.STRIPE_SECRET_KEY_LIVE
                                  : paymentSettings.stripe_settings.STRIPE_SECRET_KEY_TEST
                              }
                              submissionId={submissionId || ''}
                              onPaymentSuccess={async (paymentIntent) => {
                                console.log('Payment successful:', paymentIntent)
                                // Send checkout email
                                await sendCheckoutEmail('stripe', {
                                  payment_details: {
                                    payment_intent_id: paymentIntent.id,
                                    amount: paymentIntent.amount,
                                    payment_method: 'stripe'
                                  }
                                })
                                // Redirect to success page
                                if (submissionId) {
                                  window.location.href = `/boiler/success?submission_id=${submissionId}`
                                } else {
                                  window.location.href = '/boiler/success'
                                }
                              }}
                              onPaymentError={(error) => {
                                console.error('Payment failed:', error)
                                // Handle payment error
                              }}
                            />
                          </Elements>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Kanda Finance */}
              {paymentSettings?.is_kanda_enabled && paymentSettings?.kanda_settings && (
                <div 
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedPaymentMethod === 'kanda' ? 'ring-2 ring-[#27e6c3]' : 'hover:border-[#27e6c3]'}`}
                  onClick={() => handlePaymentMethodSelect('kanda')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === 'kanda' ? 'bg-[#27e6c3] border-[#27e6c3]' : 'border-gray-300'}`}>
                      {selectedPaymentMethod === 'kanda' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center justify-between flex-1">
                      <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">Finance Your Purchase</h3>
                  </div>
                      <div className="flex items-center">
                        <Image 
                          src="/kanda.png" 
                          alt="Kanda" 
                          width={80} 
                          height={24} 
                          className="h-6 w-auto"
                        />
                    </div>
                    </div>
                  </div>
                  
                                    {selectedPaymentMethod === 'kanda' && (
                    <div className="mt-4">
                      <KandaFinanceForm
                        amount={orderTotal}
                        companyColor={companyColor}
                        kandaSettings={paymentSettings.kanda_settings}
                        customerDetails={details}
                        productDescription={generateProductDescription()}
                        submissionId={submissionId}
                        onApplicationSubmitted={async () => {
                          // Payment status is already updated to 'processing' in the form
                          // This callback is called after successful redirect
                          console.log('Kanda application submitted successfully')
                          handlePay()
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Monthly Payment Plans */}
              {paymentSettings?.is_monthly_payment_enabled && (
                <div 
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedPaymentMethod === 'monthly' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:border-green-300'}`}
                  onClick={() => handlePaymentMethodSelect('monthly')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === 'monthly' ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                      {selectedPaymentMethod === 'monthly' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center justify-between flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">Monthly Payment</h3>
                  </div>
                      <div className="flex items-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    </div>
                  </div>
                  
                  {selectedPaymentMethod === 'monthly' && (
                    <div className="space-y-4 mt-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 mt-0.5 text-green-600" />
                          <div className="text-sm text-green-800">
                            <p className="font-medium mb-1">Flexible Monthly Payment Plans</p>
                            <p>Spread the cost of your installation over manageable monthly payments. You can choose your preferred payment term and deposit amount to suit your budget.</p>
                          </div>
                    </div>
                  </div>
                  
                      {(() => {
                        // Use currentCalculatorSettings if available, otherwise fall back to calculatorSettings
                        const currentSettings = currentCalculatorSettings || calculatorSettings
                        
                        if (!currentSettings?.selected_plan) {
                          return (
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                              <div className="text-sm text-gray-700">
                                <p className="font-medium mb-2">No Payment Plan Selected</p>
                                <p className="text-gray-600">Click the calculator button to set up your monthly payment plan.</p>
                              </div>
                            </div>
                          )
                        }
                        
                        const { months, apr } = currentSettings.selected_plan
                        const depositPercentage = currentSettings.selected_deposit || 0
                        
                        // Calculate monthly payment using the same formula as OrderSummarySidebar
                        const calculateMonthlyPayment = (price: number, months: number, apr: number, depositPercentage: number): number => {
                          if (depositPercentage > 0) {
                            const depositAmount = (price * depositPercentage) / 100
                            const loanAmount = price - depositAmount
                            const monthlyRate = apr / 100 / 12
                            return (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                                   (Math.pow(1 + monthlyRate, months) - 1)
                          } else {
                            const monthlyRate = apr / 100 / 12
                            return (price * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                                   (Math.pow(1 + monthlyRate, months) - 1)
                          }
                        }
                        
                        const monthlyPayment = calculateMonthlyPayment(orderTotal, months, apr, depositPercentage)
                        const depositAmount = (orderTotal * depositPercentage) / 100
                        
                        return (
                          <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <div className="text-sm text-gray-700">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium">Your Payment Plan:</p>
                                <button
                                  onClick={() => setShowFinanceCalculator(true)}
                                  className="text-xs text-green-600 hover:text-green-700 underline flex items-center gap-1"
                                >
                                  <Calculator size={12} />
                                  Adjust
                                </button>
                              </div>
                              <div className="space-y-1">
                                <p>• Monthly payment: £{monthlyPayment.toFixed(2)}</p>
                                <p>• Duration: {months} months</p>
                                <p>• Deposit: £{depositAmount.toFixed(2)} ({depositPercentage}%)</p>
                                <p>• APR: {apr}%</p>
                                <p>• Total amount: £{orderTotal.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                      
                      <p className="text-sm text-gray-600">
                        Pay in monthly installments with flexible payment terms.
                      </p>
                                            <button 
                        onClick={async () => {
                          setLoadingPaymentMethod('monthly')
                          
                          // Send checkout email first
                          await sendCheckoutEmail('monthly', {
                            payment_plan: (() => {
                              // Use currentCalculatorSettings if available, otherwise fall back to calculatorSettings
                              const currentSettings = currentCalculatorSettings || calculatorSettings
                              
                              if (!currentSettings?.selected_plan) {
                                return null
                              }
                              
                              const { months, apr } = currentSettings.selected_plan
                              const depositPercentage = currentSettings.selected_deposit || 0
                              
                              // Calculate monthly payment using the same formula as OrderSummarySidebar
                              const calculateMonthlyPayment = (price: number, months: number, apr: number, depositPercentage: number): number => {
                                if (depositPercentage > 0) {
                                  const depositAmount = (price * depositPercentage) / 100
                                  const loanAmount = price - depositAmount
                                  const monthlyRate = apr / 100 / 12
                                  return (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                                         (Math.pow(1 + monthlyRate, months) - 1)
                                } else {
                                  const monthlyRate = apr / 100 / 12
                                  return (price * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                                         (Math.pow(1 + monthlyRate, months) - 1)
                                }
                              }
                              
                              const monthlyPayment = calculateMonthlyPayment(orderTotal, months, apr, depositPercentage)
                              const depositAmount = (orderTotal * depositPercentage) / 100
                              
                              return {
                                monthly_amount: monthlyPayment,
                                duration_months: months,
                                deposit_amount: depositAmount,
                                deposit_percentage: depositPercentage,
                                total_amount: orderTotal,
                                apr: apr,
                                loan_amount: orderTotal - depositAmount
                              }
                            })()
                          })
                          
                          // Save payment completion for Monthly Plans
                          if (submissionId) {
                            try {
                              await fetch('/api/partner-leads/update-payment', {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  submissionId,
                                  paymentMethod: 'monthly_plans',
                                  paymentStatus: 'completed',
                                  progressStep: 'payment_completed'
                                }),
                              })
                              
                              // Redirect to success page
                              window.location.href = `/boiler/success?submission_id=${submissionId}`
                            } catch (err) {
                              console.error('Failed to save Monthly Plans payment completion:', err)
                              // Still redirect even if DB update fails
                              window.location.href = `/boiler/success?submission_id=${submissionId}`
                            }
                          } else {
                            // Fallback redirect if no submission ID
                            window.location.href = '/boiler/success'
                          }
                        }} 
                        disabled={loadingPaymentMethod === 'monthly'}
                        className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                      >
                        {loadingPaymentMethod === 'monthly' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Setting up payments...
                          </>
                        ) : (
                          'Set Up Monthly Payments'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Pay After Installation */}
              {paymentSettings?.is_pay_after_installation_enabled && (
                <div 
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedPaymentMethod === 'pay-later' ? 'ring-2 ring-orange-500' : 'hover:border-orange-300'}`}
                  onClick={() => handlePaymentMethodSelect('pay-later')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === 'pay-later' ? 'bg-orange-600 border-orange-600' : 'border-gray-300'}`}>
                      {selectedPaymentMethod === 'pay-later' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center justify-between flex-1">
                      <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">Pay After Installation</h3>
                  </div>
                      <div className="flex items-center">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    </div>
                  </div>
                  
                  {selectedPaymentMethod === 'pay-later' && (
                    <div className="space-y-4 mt-4">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 mt-0.5 text-orange-600" />
                          <div className="text-sm text-orange-800">
                            <p className="font-medium mb-1">Pay After Installation</p>
                            <p>Book your installation with confidence knowing you only pay after the work is completed and you're fully satisfied. No upfront payment required.</p>
                          </div>
                    </div>
                  </div>
                  
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="text-sm text-gray-700">
                          <p className="font-medium mb-2">How it works:</p>
                          <div className="space-y-1">
                            <p>• Book your installation date</p>
                            <p>• Our team completes the work</p>
                            <p>• You inspect and approve the installation</p>
                            <p>• Pay the full amount of £{orderTotal.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        Pay for your service after it's completed and you're satisfied.
                      </p>
                      <button 
                        onClick={async () => {
                          setLoadingPaymentMethod('pay-later')
                          
                          // Send checkout email first
                          await sendCheckoutEmail('pay-later')
                          
                          // Save payment completion for Pay After Installation
                          if (submissionId) {
                            try {
                              await fetch('/api/partner-leads/update-payment', {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  submissionId,
                                  paymentMethod: 'pay_after_installation',
                                  paymentStatus: 'completed',
                                  progressStep: 'payment_completed'
                                }),
                              })
                              
                              // Redirect to success page
                              window.location.href = `/boiler/success?submission_id=${submissionId}`
                            } catch (err) {
                              console.error('Failed to save Pay After Installation status:', err)
                              // Still redirect even if DB update fails
                              window.location.href = `/boiler/success?submission_id=${submissionId}`
                            }
                          } else {
                            // Fallback redirect if no submission ID
                            window.location.href = '/boiler/success'
                          }
                        }} 
                        disabled={loadingPaymentMethod === 'pay-later'}
                        className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                      >
                        {loadingPaymentMethod === 'pay-later' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Booking installation...
                          </>
                        ) : (
                          'Book with Pay Later'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* No Payment Methods Available */}
              {(!paymentSettings?.is_stripe_enabled && 
                !paymentSettings?.is_kanda_enabled && 
                !paymentSettings?.is_monthly_payment_enabled && 
                !paymentSettings?.is_pay_after_installation_enabled) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-sm font-medium text-yellow-800">Payment Methods Not Available</h3>
                </div>
                  <p className="text-sm text-yellow-700 mt-2">
                    No payment methods are currently configured for this service. Please contact the service provider for payment options.
                  </p>
              </div>
              )}
            </div>

            <button onClick={() => setStep(1)} className="text-sm text-gray-600">Back to booking</button>
            
            {/* Change Payment Method Button */}
            {selectedPaymentMethod && (
              <button 
                onClick={() => setSelectedPaymentMethod(null)} 
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Change payment method
              </button>
            )}

            {/* Mobile FAQ Section */}
            <div className="lg:hidden mt-8">
              <CheckoutFAQ />
            </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Summary Sidebar */}
      <OrderSummarySidebar
        selectedProduct={selectedProduct}
        selectedAddons={selectedAddons}
        selectedBundles={selectedBundles}
        companyColor={companyColor}
        partnerSettings={partnerSettings}
        currentCalculatorSettings={currentCalculatorSettings}
        onContinue={() => {
          if (step === 1) {
            handleBookInstall()
          } else {
            handlePay()
          }
        }}
        onOpenFinanceCalculator={() => setShowFinanceCalculator(true)}
        continueButtonText={step === 1 ? "Book install" : "Complete payment"}
        showContinueButton={false}
        showInstallationIncluded={true}
        showMobileCard={showMobileCard}
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
          selectedPlan={currentCalculatorSettings?.selected_plan || selectedProduct?.calculator_settings?.selected_plan || undefined}
          selectedDeposit={currentCalculatorSettings?.selected_deposit ?? selectedProduct?.calculator_settings?.selected_deposit ?? 0}
          onPlanChange={onCalculatorPlanChange}
          onDepositChange={onCalculatorDepositChange}
          onMonthlyPaymentUpdate={onCalculatorMonthlyPaymentUpdate}
        />
      )}
    </div>
  )
}


