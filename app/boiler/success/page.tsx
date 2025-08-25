'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { CheckCircle, MapPin, User, Phone, Mail, Calendar, Package, CreditCard } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'

interface OrderDetails {
  submissionId: string
  productName: string
  productPrice: number
  addons: Array<{
    title: string
    quantity: number
    price: number
  }>
  bundles: Array<{
    title: string
    quantity: number
    unitPrice: number
  }>
  totalAmount: number
  customerDetails: {
    firstName: string
    lastName: string
    email: string
    phone: string
    postcode: string
    notes: string
  }
  paymentMethod: string
  paymentStatus: string
  progressStep: string
  createdAt: string
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const submissionId = searchParams?.get('submission_id')
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const classes = useDynamicStyles(null)

  useEffect(() => {
    if (submissionId) {
      loadOrderDetails()
    } else {
      setError('No submission ID provided')
      setLoading(false)
    }
  }, [submissionId])

  const loadOrderDetails = async () => {
    try {
      const response = await fetch(`/api/partner-leads/${submissionId}`)
      if (!response.ok) {
        throw new Error('Failed to load order details')
      }
      
      const data = await response.json()
      setOrderDetails(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order details...</p>
        </div>
      </div>
    )
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-3 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-4">{error || 'Unable to load order details'}</p>
          <button 
            onClick={() => window.history.back()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPaymentMethodDisplay = (method: string) => {
    const methods: Record<string, string> = {
      'stripe': 'Credit/Debit Card',
      'kanda': 'Kanda Finance',
      'monthly_plans': 'Monthly Payment Plans',
      'pay_after_installation': 'Pay After Installation'
    }
    return methods[method] || method
  }

  const getPaymentStatusDisplay = (status: string) => {
    const statuses: Record<string, string> = {
      'pending': 'Pending',
      'processing': 'Processing',
      'completed': 'Completed',
      'failed': 'Failed',
      'cancelled': 'Cancelled'
    }
    return statuses[status] || status
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="bg-green-100 rounded-full p-3 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-lg text-gray-600">
            Thank you for your order. We've received your payment and will be in touch soon.
          </p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Summary
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Details */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Product Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Main Product:</span>
                    <span className="font-medium">{orderDetails.productName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Product Price:</span>
                    <span className="font-medium">£{orderDetails.productPrice.toFixed(2)}</span>
                  </div>
                  
                  {orderDetails.addons.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Add-ons:</p>
                      {orderDetails.addons.map((addon, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">{addon.title} × {addon.quantity}</span>
                          <span>£{(addon.price * addon.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {orderDetails.bundles.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Bundles:</p>
                      {orderDetails.bundles.map((bundle, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">{bundle.title} × {bundle.quantity}</span>
                          <span>£{(bundle.unitPrice * bundle.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total Amount:</span>
                      <span className="text-blue-600">£{orderDetails.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Payment Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium">{getPaymentMethodDisplay(orderDetails.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      orderDetails.paymentStatus === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : orderDetails.paymentStatus === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getPaymentStatusDisplay(orderDetails.paymentStatus)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Order Date:</span>
                    <span className="font-medium">{formatDate(orderDetails.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-mono text-sm text-gray-500">{orderDetails.submissionId}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Information
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium">{orderDetails.customerDetails.firstName} {orderDetails.customerDetails.lastName}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Email Address</p>
                    <p className="font-medium">{orderDetails.customerDetails.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="font-medium">{orderDetails.customerDetails.phone}</p>
                  </div>
                </div>
              </div>

              {/* Address & Notes */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Postcode</p>
                    <p className="font-medium">{orderDetails.customerDetails.postcode}</p>
                  </div>
                </div>

                {orderDetails.customerDetails.notes && (
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Additional Notes</p>
                      <p className="font-medium">{orderDetails.customerDetails.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps Card */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">What happens next?</h3>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm">We'll review your order and contact you within 24 hours to confirm installation details.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm">Our team will schedule a convenient installation date and time for you.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm">You'll receive updates via email and SMS throughout the process.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <button 
            onClick={() => window.print()} 
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Order
          </button>
          <button 
            onClick={() => window.location.href = '/'} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order details...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
