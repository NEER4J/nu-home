'use client'

import { useMemo, useState, type ReactNode, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import StripePaymentForm from './StripePaymentForm'
import KandaFinanceForm from './KandaFinanceForm'

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
  onSubmitBooking: (details: CustomerDetails & { date: string }) => void
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
  prefillUserInfo,
  paymentSettings,
  submissionId,
  onSubmitBooking,
}: CheckoutLayoutProps) {
  const classes = useDynamicStyles(companyColor)
  const [step, setStep] = useState<1 | 2>(1)
  const [cursor, setCursor] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
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

  const basePrice = useMemo(() => (typeof selectedProduct?.price === 'number' ? selectedProduct.price : 0), [selectedProduct?.price])
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
    <div className="container mx-auto px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{step === 1 ? 'Book your install' : 'Complete your order'}</h1>
        {/* Stepper */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step >= 1 ? 'bg-gray-900' : 'bg-gray-300'}`}>1</div>
          <div className={`h-1 flex-1 ${step > 1 ? classes.progress : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step >= 2 ? 'bg-gray-900' : 'bg-gray-300'}`}>2</div>
        </div>

        {step === 1 && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="bg-white rounded-xl border p-4">
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
            <div className="bg-white rounded-xl border p-4">
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
                    onClick={() => window.history.back()} 
                    className="flex-1 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Go Back
                  </button>
                  <button 
                    onClick={handleBookInstall} 
                    disabled={!selectedDate || !details.firstName || !details.lastName || !details.email || !details.phone || !details.postcode}
                    className={`flex-1 py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText} disabled:opacity-50`}
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
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Complete your payment</h2>
            
            {/* Payment Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                {selectedProduct && (
                  <div className="flex justify-between">
                    <span>{selectedProduct.name}</span>
                    <span className="font-medium">£{selectedProduct.price?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                {selectedAddons.map(addon => (
                  <div key={addon.addon_id} className="flex justify-between text-gray-600">
                    <span>{addon.title} × {addon.quantity}</span>
                    <span>£{(addon.price * addon.quantity).toFixed(2)}</span>
                    </div>
                ))}
                {selectedBundles.map(({ bundle, quantity, unitPrice }) => (
                  <div key={bundle.bundle_id} className="flex justify-between text-gray-600">
                    <span>{bundle.title} × {quantity}</span>
                    <span>£{(unitPrice * quantity).toFixed(2)}</span>
                    </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>£{orderTotal.toFixed(2)}</span>
                    </div>
                    </div>
                  </div>
                </div>
            
            {/* Payment Options */}
            <div className="space-y-4">
              {/* Stripe Payment */}
              {paymentSettings?.is_stripe_enabled && paymentSettings?.stripe_settings && (
                <div className={`bg-white rounded-xl border p-4 ${selectedPaymentMethod === 'stripe' ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">S</span>
                    </div>
                    <h3 className="font-medium text-gray-900">Pay by Card</h3>
                    {paymentSettings.stripe_settings.enabled_environment === 'test' && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Test Mode
                      </span>
                    )}
                  </div>
                  
                  {selectedPaymentMethod === 'stripe' ? (
                    // Show Stripe form when selected
                    (() => {
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
                            onPaymentSuccess={(paymentIntent) => {
                              console.log('Payment successful:', paymentIntent)
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
                    })()
                  ) : (
                    // Show selection button when not selected
                    <button
                      onClick={() => handlePaymentMethodSelect('stripe')}
                      className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText}`}
                    >
                      Pay with Card
                    </button>
                  )}
                </div>
              )}

              {/* Kanda Finance */}
              {paymentSettings?.is_kanda_enabled && paymentSettings?.kanda_settings && (
                <div className={`bg-white rounded-xl border p-4 ${selectedPaymentMethod === 'kanda' ? 'ring-2 ring-purple-500' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">K</span>
                    </div>
                    <h3 className="font-medium text-gray-900">Finance Your Purchase</h3>
                  </div>
                  
                  {selectedPaymentMethod === 'kanda' ? (
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
                  ) : (
                    <button
                      onClick={() => handlePaymentMethodSelect('kanda')}
                      className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText}`}
                    >
                      Apply for Finance
                    </button>
                  )}
                </div>
              )}

              {/* Monthly Payment Plans */}
              {paymentSettings?.is_monthly_payment_enabled && (
                <div className={`bg-white rounded-xl border p-4 ${selectedPaymentMethod === 'monthly' ? 'ring-2 ring-green-500' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">M</span>
                    </div>
                    <h3 className="font-medium text-gray-900">Monthly Payment Plans</h3>
                  </div>
                  
                  {selectedPaymentMethod === 'monthly' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Pay in monthly installments with flexible payment terms.
                      </p>
                      <button 
                        onClick={async () => {
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
                        className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText}`}
                      >
                        Set Up Monthly Payments
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePaymentMethodSelect('monthly')}
                      className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText}`}
                    >
                      Set Up Monthly Payments
                    </button>
                  )}
                </div>
              )}

              {/* Pay After Installation */}
              {paymentSettings?.is_pay_after_installation_enabled && (
                <div className={`bg-white rounded-xl border p-4 ${selectedPaymentMethod === 'pay-later' ? 'ring-2 ring-orange-500' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-orange-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">P</span>
                    </div>
                    <h3 className="font-medium text-gray-900">Pay After Installation</h3>
                  </div>
                  
                  {selectedPaymentMethod === 'pay-later' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Pay for your service after it's completed and you're satisfied.
                      </p>
                      <button 
                        onClick={async () => {
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
                        className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText}`}
                      >
                        Book with Pay Later
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePaymentMethodSelect('pay-later')}
                      className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText}`}
                    >
                      Book with Pay Later
                    </button>
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
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border p-5 h-max">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Fixed price (inc. VAT)</div>
          <div className="text-2xl font-semibold">£{orderTotal.toFixed(2)}</div>
        </div>
        <div className="mt-4">
          {selectedProduct && (
            <div className="flex items-center gap-3 py-3 border-b">
              <div className="relative h-12 w-12 bg-gray-50 rounded-md overflow-hidden">
                <Image src={getImageUrl(selectedProduct.image_url) || '/placeholder-image.jpg'} alt={selectedProduct.name} fill className="object-contain" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{selectedProduct.name}</div>
                <div className="text-xs text-gray-500">{typeof selectedProduct.price === 'number' ? `£${selectedProduct.price.toFixed(2)}` : 'Contact for price'}</div>
              </div>
            </div>
          )}
          {selectedBundles.map(({ bundle, quantity, unitPrice }) => (
            <div key={bundle.bundle_id} className="py-3 border-b">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900 truncate">{bundle.title}</div>
                <div className="text-sm text-gray-700">{quantity} × £{unitPrice.toFixed(2)}</div>
              </div>
              <div className="mt-2 space-y-1">
                {(bundle.BundlesAddons || []).map(i => (
                  <div key={i.bundle_addon_id} className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{i.Addons?.title || 'Addon'}</span>
                    {i.quantity > 1 ? <span>×{i.quantity}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {selectedAddons.map(a => (
            <div key={a.addon_id} className="py-3 border-b flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{a.title}</div>
                <div className="text-xs text-gray-500 truncate">{a.quantity} × £{a.price.toFixed(2)}</div>
              </div>
              <div className="text-sm">£{(a.quantity * a.price).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


