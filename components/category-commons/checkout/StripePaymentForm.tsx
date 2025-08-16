'use client'

import { useState, useEffect } from 'react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'

interface StripePaymentFormProps {
  amount: number
  companyColor?: string | null
  stripeSecretKey: string
  submissionId: string
  onPaymentSuccess: (paymentIntent: any) => void
  onPaymentError: (error: string) => void
  isProcessing?: boolean
}

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      iconColor: '#424770',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    invalid: {
      color: '#9e2146',
      iconColor: '#9e2146',
    },
  },
  hidePostalCode: true, // Hide postal code as we collect it separately
}

export default function StripePaymentForm({
  amount,
  companyColor = null,
  stripeSecretKey,
  submissionId,
  onPaymentSuccess,
  onPaymentError,
  isProcessing = false,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const classes = useDynamicStyles(companyColor)
  
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(true)

  useEffect(() => {
    if (stripe && elements) {
      setStripeLoading(false)
    }
  }, [stripe, elements])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      setError('Stripe is not ready. Please wait a moment and try again.')
      return
    }

    setProcessing(true)
    setError(null)

    // Save processing status to database
    try {
      await fetch('/api/partner-leads/update-payment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId,
          paymentMethod: 'stripe',
          paymentStatus: 'processing',
          progressStep: 'checkout'
        }),
      })
    } catch (err) {
      console.error('Failed to save processing status:', err)
    }

    try {
      // Create payment intent on the server
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'gbp',
          secretKey: stripeSecretKey,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create payment intent')
      }

      const { clientSecret } = await response.json()

      // Confirm the payment with Stripe
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              // You can add billing details here if needed
            },
          },
        }
      )

      if (paymentError) {
        setError(paymentError.message || 'Payment failed')
        setProcessing(false)
        
        // Save failed payment status to database
        try {
          await fetch('/api/partner-leads/update-payment', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              submissionId,
              paymentMethod: 'stripe',
              paymentStatus: 'failed',
              progressStep: 'checkout'
            }),
          })
        } catch (err) {
          console.error('Failed to save failed payment status:', err)
        }
        
        onPaymentError(paymentError.message || 'Payment failed')
      } else if (paymentIntent.status === 'succeeded') {
        setSucceeded(true)
        setProcessing(false)
        
        // Save payment information to the database
        try {
          await fetch('/api/partner-leads/update-payment', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              submissionId,
              paymentMethod: 'stripe',
              paymentStatus: 'completed',
              progressStep: 'payment_completed'
            }),
          })
        } catch (err) {
          console.error('Failed to save payment information:', err)
          // Don't fail the payment if saving to DB fails
        }
        
        onPaymentSuccess(paymentIntent)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed'
      setError(errorMessage)
      setProcessing(false)
      onPaymentError(errorMessage)
    }
  }

  const handleCardChange = (event: any) => {
    setError(event.error ? event.error.message : null)
  }

  if (stripeLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-gray-600">
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
          Loading payment form...
        </div>
      </div>
    )
  }

  if (succeeded) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="text-sm font-medium text-green-800">Payment Successful!</h3>
        </div>
        <p className="text-sm text-green-700 mt-2">
          Your payment has been processed successfully. You will receive a confirmation email shortly.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <label className="block text-sm text-gray-700 mb-1">Card Details</label>
        <div className={`border rounded-md p-3 ${error ? 'border-red-300' : 'border-gray-300'}`}>
          <CardElement
            options={cardElementOptions}
            onChange={handleCardChange}
          />
        </div>
        {error && (
          <div className="text-sm text-red-600 flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || processing || isProcessing}
        className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {processing ? (
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
            Processing...
          </div>
        ) : (
          `Pay £${amount.toFixed(2)}`
        )}
      </button>

      {/* Cancel Button */}
      {processing && (
        <button
          type="button"
          onClick={async () => {
            setProcessing(false)
            setError('Payment cancelled')
            
            // Save cancelled status to database
            try {
              await fetch('/api/partner-leads/update-payment', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  submissionId,
                  paymentMethod: 'stripe',
                  paymentStatus: 'cancelled',
                  progressStep: 'checkout'
                }),
              })
            } catch (err) {
              console.error('Failed to save cancelled status:', err)
            }
          }}
          className="w-full py-2 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancel Payment
        </button>
      )}

      <div className="text-xs text-gray-500 text-center">
        <p>Your payment is secured by Stripe</p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>PCI DSS compliant</span>
        </div>
      </div>
    </form>
  )
}
