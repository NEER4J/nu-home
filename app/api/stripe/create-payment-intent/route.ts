import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'gbp', secretKey } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    if (!secretKey) {
      return NextResponse.json(
        { error: 'Stripe secret key is required' },
        { status: 400 }
      )
    }

    // Initialize Stripe with the partner's secret key
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-07-30.basil',
    })

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        // Add any additional metadata you want to track
        source: 'nu-home-checkout',
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
