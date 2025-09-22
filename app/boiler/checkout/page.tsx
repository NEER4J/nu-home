'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CheckoutLayout, { SelectedAddonItem, SelectedBundleItem, BundleLite } from '@/components/category-commons/checkout/CheckoutLayout'
import { resolvePartnerByHost } from '@/lib/partner'
import { CheckoutLoader } from '@/components/category-commons/Loader'
import IframeNavigationTracker from '@/components/IframeNavigationTracker'

// Helper function to save data to lead_submission_data table
const saveLeadSubmissionData = async (
  supabase: any,
  submissionId: string,
  partnerId: string,
  serviceCategoryId: string,
  data: any,
  currentPage: string,
  pagesCompleted: string[] = []
) => {
  console.log('=== saveLeadSubmissionData CALLED ===')
  console.log('Parameters:', { submissionId, partnerId, serviceCategoryId, currentPage, pagesCompleted })
  
  try {
    // Validate required fields
    if (!submissionId) {
      console.error('Missing submissionId');
      return;
    }
    if (!partnerId) {
      console.error('Missing partnerId');
      return;
    }
    if (!serviceCategoryId) {
      console.error('Missing serviceCategoryId');
      return;
    }

    // Get existing form submissions to append new ones
    let existingFormSubmissions = []
    if (data.form_submissions) {
      try {
        const { data: existingData } = await supabase
          .from('lead_submission_data')
          .select('form_submissions')
          .eq('submission_id', submissionId)
          .single()
        
        if (existingData?.form_submissions) {
          existingFormSubmissions = Array.isArray(existingData.form_submissions) 
            ? existingData.form_submissions 
            : []
        }
      } catch (err) {
        console.warn('Could not fetch existing form submissions:', err)
      }
    }

    // Prepare the payload
    const payload = {
      submission_id: submissionId,
      partner_id: partnerId,
      service_category_id: serviceCategoryId,
      ...data,
      current_page: currentPage,
      pages_completed: pagesCompleted,
      last_activity_at: new Date().toISOString(),
      session_id: typeof window !== 'undefined' ? 
        (window as any).sessionStorage?.getItem('session_id') || 
        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
        `server_${Date.now()}`,
      device_info: typeof window !== 'undefined' ? {
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        platform: navigator.platform,
        cookie_enabled: navigator.cookieEnabled,
        online_status: navigator.onLine
      } : {},
      updated_at: new Date().toISOString()
    };

    // Append new form submissions to existing ones
    if (data.form_submissions && Array.isArray(data.form_submissions)) {
      payload.form_submissions = [...existingFormSubmissions, ...data.form_submissions]
      console.log('Form submissions count:', payload.form_submissions.length)
    }

    console.log('Saving lead submission data with payload:', payload);

    const { error } = await supabase
      .from('lead_submission_data')
      .upsert(payload, {
        onConflict: 'submission_id'
      });

    if (error) {
      console.error('Error saving lead submission data:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log('Successfully saved lead submission data for page:', currentPage);
    }
  } catch (error) {
    console.error('Error in saveLeadSubmissionData:', error);
  }
};

interface Addon {
  addon_id: string
  title: string
  description: string
  price: number
  image_link: string | null
  allow_multiple: boolean
  max_count: number | null
  addon_type_id: string
  partner_id: string
}

interface PartnerProduct {
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

interface BundleAddonItem { bundle_addon_id: string; bundle_id: string; addon_id: string; quantity: number; Addons?: Addon }
interface Bundle { bundle_id: string; partner_id: string; title: string; description: string | null; discount_type: 'fixed' | 'percent'; discount_value: number; service_category_id: string | null; BundlesAddons?: BundleAddonItem[] }

// User info interface matching the simplified form fields
interface UserInfo {
  first_name: string
  last_name: string
  email: string
  phone: string
  postcode: string
  notes: string
}

function BoilerCheckoutPageContent() {
  const supabase = createClient()
  const sp = useSearchParams()
  const submissionId = sp?.get('submission') || null

  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [companyColor, setCompanyColor] = useState<string | null>(null)
  const [product, setProduct] = useState<PartnerProduct | null>(null)
  const [addons, setAddons] = useState<Addon[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({})
  const [bundleQuantities, setBundleQuantities] = useState<Record<string, number>>({})
  const [userInfo, setUserInfo] = useState<UserInfo>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    postcode: '',
    notes: ''
  })
  
  // Payment settings state
  const [paymentSettings, setPaymentSettings] = useState({
    is_stripe_enabled: false,
    is_kanda_enabled: false,
    is_monthly_payment_enabled: false,
    is_pay_after_installation_enabled: false,
    stripe_settings: null as any,
    kanda_settings: null as any
  })
  
  const [partnerSettings, setPartnerSettings] = useState<{
    apr_settings: Record<number, number> | null
  } | null>(null)
  
  const [calculatorSettings, setCalculatorSettings] = useState<{
    selected_plan?: { months: number; apr: number } | null
    selected_deposit?: number
  } | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partnerInfo, setPartnerInfo] = useState<any>(null)
  const [pageStartTime, setPageStartTime] = useState<number>(Date.now())
  const [serviceCategoryId, setServiceCategoryId] = useState<string | null>(null)

  // Debug calculator settings changes
  useEffect(() => {
    console.log('Checkout: calculatorSettings state changed:', calculatorSettings)
  }, [calculatorSettings])

  // Initialize calculator settings from selected product
  useEffect(() => {
    if (product?.calculator_settings) {
      console.log('Checkout: Initializing calculator settings from product:', product.calculator_settings)
      setCalculatorSettings(product.calculator_settings)
    } else {
      console.log('Checkout: No calculator settings found in product')
      console.log('Checkout: product.calculator_settings:', product?.calculator_settings)
    }
  }, [product?.calculator_settings])

  // Initialize calculator settings from loaded data
  useEffect(() => {
    if (submissionId && !calculatorSettings) {
      // Try to load calculator settings directly from the database
      const loadCalculatorSettings = async () => {
        try {
          const { data: lead } = await supabase
            .from('partner_leads')
            .select('calculator_info')
            .eq('submission_id', submissionId)
            .single()
          
          if (lead?.calculator_info) {
            console.log('Checkout: Loading calculator settings directly from database:', lead.calculator_info)
            setCalculatorSettings(lead.calculator_info)
          }
        } catch (e) {
          console.error('Checkout: Failed to load calculator settings:', e)
        }
      }
      
      loadCalculatorSettings()
    }
  }, [submissionId, calculatorSettings, supabase])

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
    console.log('Checkout: Monthly payment updated:', monthlyPayment)
  }

  // Handle payment success (for Stripe payments)
  const handlePaymentSuccess = async (paymentIntent: any) => {
    console.log('=== handlePaymentSuccess CALLED ===')
    console.log('Payment successful:', {
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      payment_method_types: paymentIntent.payment_method_types,
      livemode: paymentIntent.livemode,
      charges_count: paymentIntent.charges?.data?.length || 0
    })
    
    // Note: Database saving is now handled by onSubmitBooking which is called
    // after this function, so we don't need to save data here to avoid duplicates
    console.log('Stripe payment success - database saving will be handled by onSubmitBooking')
  }

  const loadPaymentSettings = async (partnerUserId: string, serviceCategoryId: string) => {
    try {
      // Load partner settings for the service category
      const { data: partnerSettings } = await supabase
        .from('PartnerSettings')
        .select('is_stripe_enabled, is_kanda_enabled, is_monthly_payment_enabled, is_pay_after_installation_enabled')
        .eq('partner_id', partnerUserId)
        .eq('service_category_id', serviceCategoryId)
        .single()

      // Load partner profile for API keys
      const { data: partnerProfile } = await supabase
        .from('UserProfiles')
        .select('stripe_settings, kanda_settings')
        .eq('user_id', partnerUserId)
        .single()

      // Decrypt the settings if they exist
      let decryptedStripe = null
      let decryptedKanda = null

      if (partnerProfile?.stripe_settings && Object.keys(partnerProfile.stripe_settings).length > 0) {
        const response = await fetch('/api/partner/decrypt-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stripe_settings: partnerProfile.stripe_settings,
            kanda_settings: partnerProfile.kanda_settings || {}
          }),
        })

        if (response.ok) {
          const { stripe_settings, kanda_settings } = await response.json()
          decryptedStripe = stripe_settings
          decryptedKanda = kanda_settings
        }
      }

      setPaymentSettings({
        is_stripe_enabled: Boolean(partnerSettings?.is_stripe_enabled),
        is_kanda_enabled: Boolean(partnerSettings?.is_kanda_enabled),
        is_monthly_payment_enabled: Boolean(partnerSettings?.is_monthly_payment_enabled),
        is_pay_after_installation_enabled: Boolean(partnerSettings?.is_pay_after_installation_enabled),
        stripe_settings: decryptedStripe,
        kanda_settings: decryptedKanda
      })
    } catch (error) {
      console.error('Error loading payment settings:', error)
      // Use default settings (all disabled) on error
    }
  }

  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        setError(null)
        const hostname = window.location.hostname
        const partner = await resolvePartnerByHost(supabase, hostname)
        if (!partner) { setError('Partner not found for this domain'); return }
        const partnerUserId = partner.user_id
        setPartnerId(partnerUserId) 
        setCompanyColor(partner.company_color || null)

        // Load partner settings for APR configurations
        const { data: boilerCategory } = await supabase
          .from('ServiceCategories')
          .select('service_category_id')
          .eq('slug', 'boiler')
          .single()
        
        if (boilerCategory) {
          setServiceCategoryId(boilerCategory.service_category_id as string)
          // Load payment settings
          await loadPaymentSettings(partnerUserId, boilerCategory.service_category_id as string)
          
          // Load partner settings for APR configurations
          const { data: settingsData, error: settingsError } = await supabase
            .from('PartnerSettings')
            .select('apr_settings')
            .eq('partner_id', partnerUserId)
            .eq('service_category_id', boilerCategory.service_category_id as string)
            .single()

          if (!settingsError && settingsData) {
            // Convert APR settings keys from string to number
            const convertedSettings = {
              apr_settings: settingsData.apr_settings ? 
                Object.fromEntries(
                  Object.entries(settingsData.apr_settings).map(([key, value]) => [
                    parseInt(key),
                    typeof value === 'number' ? value : parseFloat(String(value))
                  ])
                ) : null
            }
            setPartnerSettings(convertedSettings)
          } else {
            setPartnerSettings(null)
          }
        }

        // Load cart from partner_leads.cart_state by submission id
        let cart: any = {}
        let pInfo: any = null
        let aInfo: any[] = []
        let bInfo: any[] = []
        let calculatorInfo: any = null
        let addonQuantities: Record<string, number> = {}
        let bundleQuantities: Record<string, number> = {}
        
        if (submissionId) {
          const { data: lead } = await supabase
            .from('partner_leads')
            .select('cart_state, product_info, addon_info, bundle_info, calculator_info, first_name, last_name, email, phone, postcode')
            .eq('submission_id', submissionId)
            .single()
          
          if (lead) {
            cart = (lead as any)?.cart_state || {}
            pInfo = (lead as any)?.product_info || null
            aInfo = (lead as any)?.addon_info || []
            bInfo = (lead as any)?.bundle_info || []
            calculatorInfo = (lead as any)?.calculator_info || null
            
            console.log('Checkout: Raw lead data:', lead)
            console.log('Checkout: Calculator info from database:', calculatorInfo)
            
            // Extract quantities from stored data
            const extractedAddonQuantities: Record<string, number> = {}
            const extractedBundleQuantities: Record<string, number> = {}
            
            aInfo.forEach((a: any) => {
              if (a.addon_id && a.quantity) {
                extractedAddonQuantities[a.addon_id] = Number(a.quantity)
              }
            })
            
            bInfo.forEach((b: any) => {
              if (b.bundle_id && b.quantity) {
                extractedBundleQuantities[b.bundle_id] = Number(b.quantity)
              }
            })
            
            setAddonQuantities(extractedAddonQuantities)
            setBundleQuantities(extractedBundleQuantities)
            
            // Pre-fill user info from the database
            if (lead.first_name || lead.last_name || lead.email || lead.phone || lead.postcode) {
              setUserInfo({
                first_name: String(lead.first_name || ''),
                last_name: String(lead.last_name || ''),
                email: String(lead.email || ''),
                phone: String(lead.phone || ''),
                postcode: String(lead.postcode || ''),
                notes: ''
              })
            }
            
            if (pInfo && pInfo.product_id) {
              setProduct({
                partner_product_id: pInfo.product_id,
                partner_id: partnerUserId,
                name: pInfo.name,
                price: pInfo.price ?? null,
                image_url: pInfo.image_url ?? null,
                calculator_settings: calculatorInfo ?? null,
                selected_power: pInfo.selected_power ?? null,
              } as PartnerProduct)
              console.log('Checkout: Product with settings (from database):', {
                partner_product_id: pInfo.product_id,
                partner_id: partnerUserId,
                name: pInfo.name,
                price: pInfo.price ?? null,
                image_url: pInfo.image_url ?? null,
                calculator_settings: calculatorInfo ?? null,
                selected_power: pInfo.selected_power ?? null,
              })
              console.log('Checkout: Raw pInfo from database:', pInfo)
            }
          }
        }

        if (!product && cart.product_id) {
          const { data: prod } = await supabase
            .from('PartnerProducts')
            .select('partner_product_id, partner_id, name, price, image_url, service_category_id, product_fields')
            .eq('partner_product_id', cart.product_id)
            .eq('partner_id', partnerUserId)
            .single()
          if (prod) {
            const { service_category_id: _omit, ...rest } = prod as any
            // Merge with product_info from database to include calculator settings
            const productWithSettings = {
              ...rest,
              product_fields: prod.product_fields || null,
              calculator_settings: calculatorInfo || null,
              selected_power: pInfo?.selected_power || null
            }
            console.log('Checkout: Product with settings (from URL):', productWithSettings)
            console.log('Checkout: Calculator info being set (from URL):', calculatorInfo)
            setProduct(productWithSettings as PartnerProduct)
          }
        }

        // Always fetch complete addon data from database for full information
        const addonIds = aInfo && aInfo.length > 0 
          ? aInfo.map((a: any) => a.addon_id)
          : (Array.isArray(cart.addons) ? cart.addons.map((a: any) => a.addon_id) : [])
        
        if (addonIds.length > 0) {
          const { data: rows } = await supabase
            .from('Addons')
            .select('*')
            .in('addon_id', addonIds)
            .eq('partner_id', partnerUserId)
          
          if (rows && rows.length > 0) {
            setAddons(rows as unknown as Addon[])
          }
        } else {
          setAddons([])
        }

        // Always fetch complete bundle data from database for full information
        const bundleIds = bInfo && bInfo.length > 0 
          ? bInfo.map((b: any) => b.bundle_id)
          : (Array.isArray(cart.bundles) ? cart.bundles.map((b: any) => b.bundle_id) : [])
        
        if (bundleIds.length > 0) {
            const { data: bRows } = await supabase
              .from('Bundles')
              .select('*, BundlesAddons(*, Addons(*))')
              .in('bundle_id', bundleIds)
              .eq('partner_id', partnerUserId)
          
          if (bRows && bRows.length > 0) {
            setBundles(bRows as unknown as Bundle[])
          }
        } else {
          setBundles([])
        }
      } catch (e) {
        console.error(e)
        setError('Failed to prepare checkout')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [submissionId])

  // Fetch partner info for database saving
  useEffect(() => {
    async function fetchPartnerInfo() {
      if (partnerId) {
        try {
          const { data: partner } = await supabase
            .from('UserProfiles')
            .select('user_id, company_name, company_color')
            .eq('user_id', partnerId)
            .single()
          
          if (partner) {
            setPartnerInfo(partner)
            console.log('Partner info loaded for checkout:', partner)
          }
        } catch (error) {
          console.error('Error fetching partner info:', error)
        }
      }
    }
    fetchPartnerInfo()
  }, [partnerId, supabase])

  const selectedAddons: SelectedAddonItem[] = useMemo(() => {
    return addons.map(addon => ({
      ...addon,
      quantity: addonQuantities[addon.addon_id] || 1
    }))
  }, [addons, addonQuantities])

  const selectedBundles: SelectedBundleItem[] = useMemo(() => {
    return (bundles || []).map(b => {
      const items = b.BundlesAddons || []
      const subtotal = items.reduce((s, i) => s + (i.Addons?.price || 0) * (i.quantity || 0), 0)
      const dv = Number(b.discount_value || 0)
      const discount = b.discount_type === 'percent' ? Math.min(subtotal * (dv / 100), subtotal) : Math.min(dv, subtotal)
      const unitPrice = Math.max(0, subtotal - discount)
      return { 
        bundle: b as unknown as BundleLite, 
        quantity: bundleQuantities[b.bundle_id] || 1, 
        unitPrice 
      }
    })
  }, [bundles, bundleQuantities])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <CheckoutLoader />
      </div>
    )
  }
  if (error) {
    return <div className="container mx-auto px-4 py-12"><div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div></div>
  }

  console.log('Checkout: Rendering CheckoutLayout with calculatorSettings:', calculatorSettings)

  return (
    <>
      {/* Iframe Navigation Tracker */}
      <IframeNavigationTracker categorySlug="boiler" />
      
      <CheckoutLayout
        selectedProduct={product}
        selectedAddons={selectedAddons}
        selectedBundles={selectedBundles}
        companyColor={companyColor}
      partnerSettings={partnerSettings}
      currentCalculatorSettings={calculatorSettings}
      prefillUserInfo={userInfo}
      paymentSettings={paymentSettings}
      submissionId={submissionId || undefined}
      onCalculatorPlanChange={handleCalculatorPlanChange}
      onCalculatorDepositChange={handleCalculatorDepositChange}
      onCalculatorMonthlyPaymentUpdate={handleCalculatorMonthlyPaymentUpdate}
      onPaymentSuccess={handlePaymentSuccess}
      onSubmitBooking={async (payload) => {
        console.log('=== onSubmitBooking CALLED ===')
        console.log('Booking submitted', payload)
        console.log('submissionId:', submissionId)
        console.log('partnerInfo:', partnerInfo)
        console.log('product?.service_category_id:', (product as any)?.service_category_id)
        console.log('userInfo:', userInfo)
        
        try {
        console.log('=== VALIDATION CHECK ===')
        console.log('submissionId exists:', !!submissionId)
        console.log('partnerInfo exists:', !!partnerInfo)
        console.log('partnerInfo.user_id:', partnerInfo?.user_id)
        console.log('service_category_id (from state):', serviceCategoryId)
        console.log('service_category_id (from product):', (product as any)?.service_category_id)
          
          if (submissionId && partnerInfo) {
            console.log('=== VALIDATION PASSED - PROCEEDING WITH SAVE ===')
            const totalTimeOnPage = Date.now() - pageStartTime;
            
            // Calculate the total amount using the same logic as CheckoutLayout
            const basePrice = product?.selected_power?.price || (typeof product?.price === 'number' ? product.price : 0)
            const calculatedTotalAmount = basePrice + 
              selectedAddons.reduce((sum, a) => sum + (a.price * a.quantity), 0) + 
              selectedBundles.reduce((sum, b) => sum + (b.unitPrice * b.quantity), 0)
            
            console.log('=== TOTAL AMOUNT CALCULATION DEBUG ===')
            console.log('Product data:', product)
            console.log('Product price:', product?.price)
            console.log('Product selected_power:', product?.selected_power)
            console.log('Base price calculated:', basePrice)
            console.log('Selected addons:', selectedAddons)
            console.log('Selected bundles:', selectedBundles)
            console.log('Calculated total amount:', calculatedTotalAmount)
            console.log('=== END TOTAL AMOUNT DEBUG ===')

            // Prepare checkout data for lead_submission_data
            const checkoutData = {
              booking_data: {
                payment_method: (payload as any).payment_method || 'unknown',
                payment_details: (payload as any).payment_details || null,
                booking_notes: (payload as any).notes || userInfo.notes || '',
                preferred_installation_date: (payload as any).date || null,
                special_requirements: (payload as any).special_requirements || '',
                contact_preferences: (payload as any).contact_preferences || {},
                total_amount: calculatedTotalAmount,
                deposit_amount: (payload as any).deposit_amount || 0,
                monthly_payment: (payload as any).monthly_payment || 0,
                finance_terms: (payload as any).finance_terms || null,
                booking_submitted_at: new Date().toISOString(),
                total_time_on_page_ms: totalTimeOnPage,
                // Add Stripe-specific metadata if this is a Stripe payment
                ...((payload as any).payment_method === 'stripe' && (payload as any).payment_details ? {
                  stripe_metadata: {
                    payment_intent_id: (payload as any).payment_details.payment_intent_id,
                    payment_status: 'succeeded',
                    amount_captured: (payload as any).payment_details.amount,
                    currency: 'gbp', // Assuming GBP for now
                    payment_method_types: ['card'],
                    livemode: false, // Will be determined by environment
                    created_timestamp: Date.now(),
                    receipt_url: null, // Not available in basic payment details
                    receipt_number: null
                  }
                } : {})
              },
              user_contact_info: {
                first_name: (payload as any).firstName || userInfo.first_name,
                last_name: (payload as any).lastName || userInfo.last_name,
                email: (payload as any).email || userInfo.email,
                phone: (payload as any).phone || userInfo.phone,
                address: (payload as any).address || '',
                postcode: (payload as any).postcode || userInfo.postcode,
                notes: (payload as any).notes || userInfo.notes
              },
              payment_settings_used: {
                stripe_enabled: paymentSettings.is_stripe_enabled,
                kanda_enabled: paymentSettings.is_kanda_enabled,
                monthly_payment_enabled: paymentSettings.is_monthly_payment_enabled,
                pay_after_installation_enabled: paymentSettings.is_pay_after_installation_enabled
              },
              calculator_settings: calculatorSettings,
              product_id: product?.partner_product_id || null,
              addon_ids: selectedAddons.map(addon => ({
                addon_id: addon.addon_id,
                quantity: addon.quantity
              })),
              bundle_ids: selectedBundles.map(bundle => ({
                bundle_id: bundle.bundle.bundle_id,
                quantity: bundle.quantity
              }))
            };

            console.log('Prepared checkout data:', checkoutData);

            // Save checkout data to lead_submission_data in background
            // Use the loaded service category ID
            const finalServiceCategoryId = serviceCategoryId || (product as any)?.service_category_id || 'boiler'
            
            // Prepare form submission data
            const formSubmissionData = {
              form_type: 'checkout',
              payment_method: (payload as any).payment_method,
              submitted_at: new Date().toISOString(),
              form_data: {
                user_details: {
                  first_name: userInfo.first_name,
                  last_name: userInfo.last_name,
                  email: userInfo.email,
                  phone: userInfo.phone,
                  postcode: userInfo.postcode,
                  notes: userInfo.notes
                },
                installation_date: (payload as any).date,
                payment_details: (payload as any).payment_details,
                selected_items: {
                  product_id: product?.partner_product_id || null,
                  addon_ids: selectedAddons.map(addon => ({
                    addon_id: addon.addon_id,
                    quantity: addon.quantity
                  })),
                  bundle_ids: selectedBundles.map(bundle => ({
                    bundle_id: bundle.bundle.bundle_id,
                    quantity: bundle.quantity
                  }))
                },
                calculator_settings: calculatorSettings,
                total_amount: calculatedTotalAmount
              },
              submission_metadata: {
                page_url: typeof window !== 'undefined' ? window.location.href : '',
                user_agent: typeof window !== 'undefined' ? navigator.userAgent : '',
                timestamp: Date.now(),
                session_id: typeof window !== 'undefined' ? 
                  (window as any).sessionStorage?.getItem('session_id') || 
                  `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
                  `server_${Date.now()}`
              }
            }
            
            console.log('=== CALLING saveLeadSubmissionData ===')
            console.log('Parameters:', {
              submissionId,
              partnerId: partnerInfo.user_id,
              serviceCategoryId: finalServiceCategoryId,
              currentPage: 'success',
              pagesCompleted: ['quote', 'products', 'addons', 'checkout']
            })
            console.log('Form submission data:', formSubmissionData)
            
            saveLeadSubmissionData(
              supabase,
              submissionId,
              partnerInfo.user_id,
              finalServiceCategoryId,
              {
                checkout_data: checkoutData,
                form_submissions: [formSubmissionData] // Add form submission tracking
              },
              'success',
              ['quote', 'products', 'addons', 'checkout']
            ).then(() => {
              console.log('=== saveLeadSubmissionData COMPLETED SUCCESSFULLY ===')
            }).catch(err => {
              console.error('=== saveLeadSubmissionData FAILED ===')
              console.error('Error details:', err)
              console.warn('Failed to save checkout data to lead_submission_data:', err)
            });

            // Send checkout email before redirecting
            console.log('=== SENDING CHECKOUT EMAIL ===')
            try {
              const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
              const subdomain = hostname || null
              const isIframe = typeof window !== 'undefined' ? window.self !== window.top : false

              const emailData = {
                first_name: userInfo.first_name,
                last_name: userInfo.last_name,
                email: userInfo.email,
                phone: userInfo.phone,
                postcode: userInfo.postcode,
                order_details: {
                  product: product ? {
                    id: product.partner_product_id,
                    name: product.name,
                    price: product.price || 0
                  } : null,
                  addons: selectedAddons.map(addon => ({
                    title: addon.title,
                    quantity: addon.quantity,
                    price: addon.price
                  })),
                  bundles: selectedBundles.map(bundle => ({
                    title: bundle.bundle.title,
                    quantity: bundle.quantity,
                    unitPrice: bundle.unitPrice || 0
                  })),
                  total: calculatedTotalAmount
                },
                installation_date: (payload as any).date,
                submission_id: submissionId,
                subdomain,
                is_iframe: isIframe,
                payment_method: (payload as any).payment_method,
                payment_details: (payload as any).payment_details
              }

              // Determine API endpoint based on payment method
              let apiEndpoint = '/api/email/boiler/checkout-pay-later-v2' // default
              if ((payload as any).payment_method === 'stripe') {
                apiEndpoint = '/api/email/boiler/checkout-stripe-v2'
              } else if ((payload as any).payment_method === 'monthly') {
                apiEndpoint = '/api/email/boiler/checkout-monthly'
              }

              console.log('Sending email to:', apiEndpoint)
              const emailResponse = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailData),
              })

              if (emailResponse.ok) {
                const emailResult = await emailResponse.json()
                console.log('Email sent successfully:', emailResult)
              } else {
                const errorText = await emailResponse.text()
                console.warn('Failed to send email:', errorText)
              }
            } catch (emailError) {
              console.warn('Error sending email:', emailError)
            }

            // Process payment based on payment method
            if ((payload as any).payment_method === 'stripe') {
              console.log('Processing Stripe payment...');
            } else if ((payload as any).payment_method === 'kanda') {
              console.log('Processing Kanda payment...');
            } else if ((payload as any).payment_method === 'monthly') {
              console.log('Processing monthly payment...');
            } else if ((payload as any).payment_method === 'pay_after_installation') {
              console.log('Booking confirmed - payment after installation');
            }

            // Redirect to success page
            const url = new URL('/boiler/success', window.location.origin);
            if (submissionId) url.searchParams.set('submission', submissionId);
            window.location.href = url.toString();
          } else {
            console.error('=== VALIDATION FAILED ===')
            console.error('Missing submissionId:', !submissionId)
            console.error('Missing partnerInfo:', !partnerInfo)
            console.error('submissionId value:', submissionId)
            console.error('partnerInfo value:', partnerInfo)
            alert('Error: Missing required information for checkout');
          }
        } catch (error) {
          console.error('Error processing checkout:', error);
          alert('Error processing checkout. Please try again.');
        }
      }}
        backHref={`/boiler/addons${submissionId ? `?submission=${submissionId}` : ''}`}
        backLabel="Back to Add-ons"
        showBack={true}
        showMobileCard={true}
      />
    </>
  )
}

export default function BoilerCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12">
        <CheckoutLoader />
      </div>
    }>
      <BoilerCheckoutPageContent />
    </Suspense>
  )
}


