'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CheckoutLayout, { SelectedAddonItem, SelectedBundleItem, BundleLite } from '@/components/category-commons/checkout/CheckoutLayout'
import { resolvePartnerByHost } from '@/lib/partner'
import { CheckoutLoader } from '@/components/category-commons/Loader'

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
          // Load payment settings
          await loadPaymentSettings(partnerUserId, boilerCategory.service_category_id)
          
          // Load partner settings for APR configurations
          const { data: settingsData, error: settingsError } = await supabase
            .from('PartnerSettings')
            .select('apr_settings')
            .eq('partner_id', partnerUserId)
            .eq('service_category_id', boilerCategory.service_category_id)
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
                first_name: lead.first_name || '',
                last_name: lead.last_name || '',
                email: lead.email || '',
                phone: lead.phone || '',
                postcode: lead.postcode || '',
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
            setAddons(rows as Addon[])
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
      onSubmitBooking={async (payload) => {
        console.log('Booking submitted', payload)
        // TODO: integrate payments and booking save
        alert('Booking submitted! (stub)')
      }}
      backHref={`/boiler/addons${submissionId ? `?submission=${submissionId}` : ''}`}
      backLabel="Back to Add-ons"
      showBack={true}
      showMobileCard={true}
    />
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


