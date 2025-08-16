import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const submissionId = params.id

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Fetch the partner lead with all the JSONB data
    const { data: lead, error: leadError } = await supabase
      .from('partner_leads')
      .select('*')
      .eq('submission_id', submissionId)
      .single()

    if (leadError || !lead) {
      console.error('Lead fetch error:', leadError)
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    console.log('Lead data fetched:', {
      submission_id: lead.submission_id,
      first_name: lead.first_name,
      product_info: lead.product_info,
      addon_info: lead.addon_info,
      bundle_info: lead.bundle_info
    })

    // Extract data from JSONB columns
    const productInfo = lead.product_info || {}
    const addonInfo = lead.addon_info || []
    const bundleInfo = lead.bundle_info || []

    // Calculate total amount
    let totalAmount = 0
    
    // Add product price
    if (productInfo.price) {
      totalAmount += parseFloat(productInfo.price)
    }

    // Add addons total
    addonInfo.forEach((addon: any) => {
      if (addon.price && addon.quantity) {
        totalAmount += (parseFloat(addon.price) * parseInt(addon.quantity))
      }
    })

    // Add bundles total
    bundleInfo.forEach((bundle: any) => {
      if (bundle.price && bundle.quantity) {
        totalAmount += (parseFloat(bundle.price) * parseInt(bundle.quantity))
      }
    })

    // Format the response for the success page
    const orderDetails = {
      submissionId: lead.submission_id,
      productName: productInfo.name || 'Boiler Installation',
      productPrice: parseFloat(productInfo.price) || 0,
      addons: addonInfo.map((addon: any) => ({
        title: addon.title || 'Unknown Addon',
        quantity: parseInt(addon.quantity) || 1,
        price: parseFloat(addon.price) || 0
      })),
      bundles: bundleInfo.map((bundle: any) => ({
        title: bundle.title || 'Unknown Bundle',
        quantity: parseInt(bundle.quantity) || 1,
        unitPrice: parseFloat(bundle.price) || 0
      })),
      totalAmount,
      customerDetails: {
        firstName: lead.first_name || '',
        lastName: lead.last_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        postcode: lead.postcode || '',
        notes: lead.notes || ''
      },
      paymentMethod: lead.payment_method || 'unknown',
      paymentStatus: lead.payment_status || 'pending',
      progressStep: lead.progress_step || 'checkout',
      createdAt: lead.created_at || new Date().toISOString(),
      partnerInfo: {
        companyName: 'Partner Company', // Default value
        companyColor: null
      },
      serviceCategory: 'Boiler Service' // Default value
    }

    console.log('Order details prepared:', {
      submissionId: orderDetails.submissionId,
      productName: orderDetails.productName,
      totalAmount: orderDetails.totalAmount,
      addonsCount: orderDetails.addons.length,
      bundlesCount: orderDetails.bundles.length
    })

    return NextResponse.json(orderDetails)
  } catch (error) {
    console.error('Error fetching partner lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
