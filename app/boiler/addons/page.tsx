'use client'

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AddonsLayout, { BundleLite } from '@/components/category-commons/addon/AddonsLayout'
import { resolvePartnerByHost } from '@/lib/partner'
import { AddonsLoader } from '@/components/category-commons/Loader'
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

interface AddonType {
  id: string
  name: string
  allow_multiple_selection: boolean
  info?: string
}

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

interface Category {
  service_category_id: string
  name: string
  addon_types: AddonType[] | any[]
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
  [key: string]: any // Allow additional fields from product_info
}

  type BundleDiscountType = 'fixed' | 'percent'

  interface BundleAddonItem {
    bundle_addon_id: string
    bundle_id: string
    addon_id: string
    quantity: number
    Addons?: Addon
  }

  interface Bundle {
    bundle_id: string
    partner_id: string
    title: string
    description: string | null
    discount_type: BundleDiscountType
    discount_value: number
    service_category_id: string | null
    BundlesAddons?: BundleAddonItem[]
  }

function BoilerAddonsPageContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const submissionId = searchParams?.get('submission') || null
  const productIdFromUrl = searchParams?.get('product') || null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [addons, setAddons] = useState<Addon[]>([])
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({})
  const [selectedProduct, setSelectedProduct] = useState<PartnerProduct | null>(null)
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [selectedBundles, setSelectedBundles] = useState<Record<string, number>>({})
  const [companyColor, setCompanyColor] = useState<string | null>(null)
  const [partnerSettings, setPartnerSettings] = useState<{
    apr_settings: Record<number, number> | null
  } | null>(null)
  const [calculatorSettings, setCalculatorSettings] = useState<{
    selected_plan?: { months: number; apr: number } | null
    selected_deposit?: number
  } | null>(null)
  const [isContinuing, setIsContinuing] = useState(false)
  const [partnerInfo, setPartnerInfo] = useState<any>(null)
  const [pageStartTime, setPageStartTime] = useState<number>(Date.now())

  // Debug calculator settings changes
  useEffect(() => {
    console.log('calculatorSettings state changed:', calculatorSettings)
  }, [calculatorSettings])


  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        setError(null)
        
        // Check if this is a back navigation (user came from checkout or has existing data)
        const isBackNavigation = document.referrer.includes('/checkout') || 
                                document.referrer.includes('/addons') ||
                                (submissionId && !productIdFromUrl) // Has submission but no product in URL
        console.log('Addons page init - isBackNavigation:', isBackNavigation, {
          referrer: document.referrer,
          hasSubmission: !!submissionId,
          hasProductInUrl: !!productIdFromUrl
        })
        
        if (isBackNavigation) {
          // Don't autosave when coming back from other pages
          setIsUserActive(false)
        }

        // 1) Resolve partner by host (custom domain preferred, fallback to subdomain)
        const hostname = window.location.hostname
        const partner = await resolvePartnerByHost(supabase, hostname)
        if (!partner) {
          setError('Partner not found for this domain')
          return
        }
        const partnerUserId = partner.user_id
        setPartnerId(partnerUserId)
        setCompanyColor(partner.company_color || null)

        // 2) Resolve boiler service category
        const { data: categoryData, error: categoryError } = await supabase
          .from('ServiceCategories')
          .select('service_category_id, name, addon_types')
          .eq('slug', 'boiler')
          .eq('is_active', true)
          .single()

        if (categoryError || !categoryData) {
          setError('Boiler category not found')
          return
        }
        // Ensure addon_types have the correct structure with info field
        const processedCategory = {
          ...categoryData,
          addon_types: Array.isArray(categoryData.addon_types) ? categoryData.addon_types.map((type: any) => ({
            id: type.id || type,
            name: typeof type === 'string' ? type : type.name || type,
            allow_multiple_selection: type.allow_multiple_selection || false,
            info: type.info || ''
          })) : []
        }
        setCategory(processedCategory as Category)

        // 3) Load partner settings for APR configurations
        const { data: settingsData, error: settingsError } = await supabase
          .from('PartnerSettings')
          .select('apr_settings')
          .eq('partner_id', partnerUserId)
          .eq('service_category_id', (categoryData as Category).service_category_id)
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

        // 4) Resolve cart from partner_leads if we have submission id
        let cartState: any = {}
        let pInfo: any = {}
        let aInfo: any[] = []
        let bInfo: any[] = []
        let calculatorInfo: any = null
        
        if (submissionId) {
          const { data: lead, error: leadError } = await supabase
            .from('partner_leads')
            .select('cart_state, product_info, addon_info, bundle_info, calculator_info')
            .eq('submission_id', submissionId)
            .single()
          
          if (leadError) {
            console.error('Failed to load lead data:', leadError)
          } else {
            console.log('Loaded lead data:', lead)
          }
          
          cartState = (lead as any)?.cart_state || {}
          pInfo = (lead as any)?.product_info || {}
          aInfo = (lead as any)?.addon_info || []
          bInfo = (lead as any)?.bundle_info || []
          let calculatorInfo = (lead as any)?.calculator_info || null
          
          // Handle case where calculator_info might be stored as a string
          if (typeof calculatorInfo === 'string') {
            try {
              calculatorInfo = JSON.parse(calculatorInfo)
            } catch (e) {
              console.error('Failed to parse calculator_info as JSON:', e)
              calculatorInfo = null
            }
          }
          console.log('Product info from database:', pInfo)
          console.log('Addon info from database:', aInfo)
          console.log('Bundle info from database:', bInfo)
          console.log('Cart state:', cartState)
          console.log('Calculator info from database:', calculatorInfo)
          console.log('Raw lead data:', lead)
          console.log('Lead calculator_info field:', (lead as any)?.calculator_info)
          console.log('Selected power from pInfo:', pInfo?.selected_power)
          
          if (pInfo && pInfo.product_id && !productIdFromUrl) {
            // if product already saved, prefer it
            ;(cartState as any).product_id = pInfo.product_id
            console.log('Using product_id from database:', pInfo.product_id)
          }
        }

        // If product passed via URL, override cart product and save later
        const resolvedProductId = productIdFromUrl || cartState.product_id || null
        if (resolvedProductId) {
          const { data: product, error: productError } = await supabase
            .from('PartnerProducts')
            .select('partner_product_id, partner_id, name, price, image_url, service_category_id, product_fields')
            .eq('partner_product_id', resolvedProductId)
            .eq('partner_id', partnerUserId)
            .eq('service_category_id', (categoryData as Category).service_category_id)
            .single()

          if (!productError && product) {
            const { service_category_id: _omit, ...rest } = product as any
            // Merge with product_info from database to include calculator settings
            const productWithSettings = {
              ...rest,
              product_fields: product.product_fields || null,
              calculator_settings: calculatorInfo || null,
              selected_power: pInfo.selected_power || null
            }
            console.log('Product with settings (from URL):', productWithSettings)
            console.log('Calculator info being set:', calculatorInfo)
            setSelectedProduct(productWithSettings as PartnerProduct)
          }
        } else if (pInfo && pInfo.product_id) {
          // If no product from URL but we have product_info from database, use that
          const productWithSettings = {
            partner_product_id: pInfo.product_id,
            partner_id: partnerUserId,
            name: pInfo.name || '',
            price: pInfo.price || null,
            image_url: pInfo.image_url || null,
            product_fields: pInfo.product_fields || null,
            calculator_settings: calculatorInfo || null,
            selected_power: pInfo.selected_power || null
          }
          console.log('Product with settings (from database):', productWithSettings)
          console.log('Calculator info being set (from database):', calculatorInfo)
          setSelectedProduct(productWithSettings as PartnerProduct)
          console.log('Set selected product to:', productWithSettings)
        }

        // 4) Fetch partner addons for this category
        const { data: addonsData, error: addonsError } = await supabase
          .from('Addons')
          .select('*')
          .eq('service_category_id', (categoryData as Category).service_category_id)
          .eq('partner_id', partnerUserId)

        if (addonsError) {
          setError('Failed to load addons')
          return
        }

        setAddons((addonsData || []) as unknown as Addon[])

        // 5) Fetch partner bundles for this category
        const { data: bundlesData, error: bundlesError } = await supabase
          .from('Bundles')
          .select('*, BundlesAddons(*, Addons(*))')
          .eq('partner_id', partnerUserId)
          .eq('service_category_id', (categoryData as Category).service_category_id)
          .order('created_at', { ascending: false })

        if (!bundlesError && bundlesData) {
          setBundles(bundlesData as unknown as Bundle[])
        }
        // Prefill selections from addon_info and bundle_info (preferred) or cart_state (fallback)
        if (aInfo && aInfo.length > 0) {
          // Use addon_info for preselection
          const map: Record<string, number> = {}
          aInfo.forEach((a: any) => { 
            if (a.addon_id && a.quantity) map[a.addon_id] = Number(a.quantity) 
          })
          setSelectedAddons(map)
          console.log('Preselected addons from addon_info:', map)
        } else if (cartState?.addons && Array.isArray(cartState.addons)) {
          // Fallback to cart_state
          const map: Record<string, number> = {}
          cartState.addons.forEach((a: any) => { if (a.addon_id) map[a.addon_id] = Number(a.quantity || 1) })
          setSelectedAddons(map)
          console.log('Preselected addons from cart_state:', map)
        }
        
        if (bInfo && bInfo.length > 0) {
          // Use bundle_info for preselection
          const map: Record<string, number> = {}
          bInfo.forEach((b: any) => { 
            if (b.bundle_id && b.quantity) map[b.bundle_id] = Number(b.quantity) 
          })
          setSelectedBundles(map)
          console.log('Preselected bundles from bundle_info:', map)
        } else if (cartState?.bundles && Array.isArray(cartState.bundles)) {
          // Fallback to cart_state
          const map: Record<string, number> = {}
          cartState.bundles.forEach((b: any) => { if (b.bundle_id) map[b.bundle_id] = Number(b.quantity || 1) })
          setSelectedBundles(map)
          console.log('Preselected bundles from cart_state:', map)
        }

      } catch (err) {
        console.error('Error initializing addons page:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [productIdFromUrl, submissionId])

  // Debug: Log when selectedProduct changes
  useEffect(() => {
    console.log('selectedProduct state changed:', selectedProduct)
    
    // Initialize calculator settings from selectedProduct
    if (selectedProduct?.calculator_settings) {
      console.log('Initializing calculator settings from selectedProduct:', selectedProduct.calculator_settings)
      setCalculatorSettings(selectedProduct.calculator_settings)
    } else {
      console.log('No calculator settings found in selectedProduct')
      console.log('selectedProduct.calculator_settings:', selectedProduct?.calculator_settings)
    }
  }, [selectedProduct])

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
            console.log('Loading calculator settings directly from database:', lead.calculator_info)
            setCalculatorSettings(lead.calculator_info)
          }
        } catch (e) {
          console.error('Failed to load calculator settings:', e)
        }
      }
      
      loadCalculatorSettings()
    }
  }, [submissionId, calculatorSettings, supabase])

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
            console.log('Partner info loaded:', partner)
          }
        } catch (error) {
          console.error('Error fetching partner info:', error)
        }
      }
    }
    fetchPartnerInfo()
  }, [partnerId, supabase])

  // UI aggregation moved into AddonsLayout

  const handleQuantityChange = (addon: Addon, change: number) => {
    const currentQty = selectedAddons[addon.addon_id] || 0
    const newQty = Math.max(0, currentQty + change)

    // Respect per-addon max and single/multiple flags
    if (!addon.allow_multiple && newQty > 1) return
    if (addon.allow_multiple && addon.max_count && newQty > addon.max_count) return

    const updated = { ...selectedAddons }

    // Enforce single selection per addon type when type disallows multiple selection
    if (change > 0 && newQty > 0 && category?.addon_types) {
      const addonType = category.addon_types.find(t => t.id === addon.addon_type_id)
      if (addonType && !addonType.allow_multiple_selection) {
        addons
          .filter(a => a.addon_type_id === addon.addon_type_id)
          .forEach(a => { if (a.addon_id !== addon.addon_id) updated[a.addon_id] = 0 })
      }
    }

    updated[addon.addon_id] = newQty
    setSelectedAddons(updated)
    setIsUserActive(true) // Mark user as active when they make changes
  }

  const handleAddBundle = (bundle: Bundle) => {
    setSelectedBundles(prev => {
      const isSelected = (prev[bundle.bundle_id] || 0) > 0
      if (isSelected) {
        const { [bundle.bundle_id]: _omit, ...rest } = prev
        return rest
      }
      return { ...prev, [bundle.bundle_id]: 1 }
    })
    setIsUserActive(true) // Mark user as active when they make changes
  }

  const handleBundleQtyChange = (bundleId: string, change: number) => {
    setSelectedBundles(prev => {
      const current = prev[bundleId] || 0
      const next = Math.max(0, current + change)
      const updated = { ...prev }
      if (next === 0) delete updated[bundleId]
      else updated[bundleId] = next
      return updated
    })
    setIsUserActive(true) // Mark user as active when they make changes
  }

  // Calculator callback handlers
  const handleCalculatorPlanChange = (plan: { months: number; apr: number }) => {
    setCalculatorSettings(prev => ({
      ...prev,
      selected_plan: plan
    }))
    setIsUserActive(true)
  }

  const handleCalculatorDepositChange = (deposit: number) => {
    setCalculatorSettings(prev => ({
      ...prev,
      selected_deposit: deposit
    }))
    setIsUserActive(true)
  }

  const handleCalculatorMonthlyPaymentUpdate = (monthlyPayment: number) => {
    // This could be used to update the UI in real-time if needed
    console.log('Monthly payment updated:', monthlyPayment)
  }

  // Persist cart state whenever selections change (debounced)
  const saveTimer = useRef<any>(null)
  const cartPayload = useMemo(() => {
    const addonsArr = Object.entries(selectedAddons)
      .filter(([_, q]) => (q as number) > 0)
      .map(([addon_id, quantity]) => ({ addon_id, quantity }))
    const bundlesArr = Object.entries(selectedBundles)
      .filter(([_, q]) => (q as number) > 0)
      .map(([bundle_id, quantity]) => ({ bundle_id, quantity }))
    return { addons: addonsArr, bundles: bundlesArr }
  }, [selectedAddons, selectedBundles])

  // Prepare addon and bundle info for storage
  const addonInfo = useMemo(() => {
    return Object.entries(selectedAddons)
      .filter(([_, q]) => (q as number) > 0)
      .map(([addon_id, quantity]) => {
        const addon = addons.find(a => a.addon_id === addon_id)
        return {
          addon_id,
          name: addon?.title || '',
          price: addon?.price || 0,
          quantity: quantity as number
        }
      })
  }, [selectedAddons, addons])

  const bundleInfo = useMemo(() => {
    return Object.entries(selectedBundles)
      .filter(([_, q]) => (q as number) > 0)
      .map(([bundle_id, quantity]) => {
        const bundle = bundles.find(b => b.bundle_id === bundle_id)
        return {
          bundle_id,
          name: bundle?.title || '',
          price: 0, // Bundles don't have a direct price, they have discount logic
          quantity: quantity as number
        }
      })
  }, [selectedBundles, bundles])

  // Only autosave when user is actively making changes, not when navigating back
  const [isUserActive, setIsUserActive] = useState(false)
  
  useEffect(() => {
    if (!submissionId || !isUserActive) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        console.log('Autosaving addon/bundle selections to database...')
        console.log('Calculator settings being saved:', calculatorSettings)
        console.log('Selected product calculator settings:', selectedProduct?.calculator_settings)
        const updateResult = await supabase
          .from('partner_leads')
          .update({
            cart_state: { ...cartPayload, product_id: selectedProduct?.partner_product_id || null },
            product_info: selectedProduct ? {
              product_id: selectedProduct.partner_product_id,
              name: selectedProduct.name,
              price: selectedProduct.price,
              image_url: selectedProduct.image_url,
              selected_power: selectedProduct.selected_power,
            } : null,
            calculator_info: calculatorSettings || selectedProduct?.calculator_settings,
            addon_info: addonInfo,
            bundle_info: bundleInfo,
            progress_step: 'addons',
            last_seen_at: new Date().toISOString(),
          })
          .eq('submission_id', submissionId)
        
        if (updateResult.error) {
          console.error('Autosave failed:', updateResult.error)
        } else {
          console.log('Autosave successful')
          console.log('Saved calculator_info:', calculatorSettings || selectedProduct?.calculator_settings)
        }
      } catch (e) {
        console.warn('Failed to save cart state', e)
      }
    }, 400)
    return () => saveTimer.current && clearTimeout(saveTimer.current)
  }, [cartPayload, selectedProduct?.partner_product_id, submissionId, isUserActive, calculatorSettings])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <AddonsLoader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      </div>
    )
  }

  console.log('Rendering AddonsLayout with calculatorSettings:', calculatorSettings)
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Iframe Navigation Tracker */}
      <IframeNavigationTracker categorySlug="boiler" />
      
      {/* Back Link */}
      <div className="mb-6">
        <a href={`/boiler/products${submissionId ? `?submission=${submissionId}` : ''}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Products
        </a>
      </div>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
          Choose controls for your {selectedProduct?.name || 'boiler'}
        </h1>
        <p className="text-gray-600">
          We'll install your controls during your boiler installation & show you how to use them
        </p>
      </div>
      
      <AddonsLayout
        category={category as any}
        addons={addons as any}
        bundles={bundles as unknown as BundleLite[]}
        selectedAddons={selectedAddons}
        selectedBundles={selectedBundles}
        selectedProduct={selectedProduct as any}
        companyColor={companyColor}
        partnerSettings={partnerSettings}
        backHref={`/boiler/products${submissionId ? `?submission=${submissionId}` : ''}`}
        backLabel="Back to Products"
        showBack={false}
        onChangeAddonQuantity={handleQuantityChange as any}
        onToggleBundle={(b) => handleAddBundle(b as unknown as Bundle)}
        onChangeBundleQuantity={handleBundleQtyChange}
        onCalculatorPlanChange={handleCalculatorPlanChange}
        onCalculatorDepositChange={handleCalculatorDepositChange}
        onCalculatorMonthlyPaymentUpdate={handleCalculatorMonthlyPaymentUpdate}
        currentCalculatorSettings={calculatorSettings}
        isLoading={isContinuing}
        // Debug: Log what's being passed to AddonsLayout
        // This will help us see if the calculator settings are being passed correctly
        onContinue={async (selectedAddonsList, selectedBundlesList) => {
          setIsContinuing(true)
          
          try {
            if (submissionId && partnerInfo) {
              const totalTimeOnPage = Date.now() - pageStartTime;
              
              // Fetch complete bundle details including items
              const bundleDetails = await Promise.all(
                selectedBundlesList.map(async (b) => {
                  try {
                    const { data: bundleData } = await supabase
                      .from('Bundles')
                      .select(`
                        bundle_id,
                        title,
                        description,
                        discount_type,
                        discount_value
                      `)
                      .eq('bundle_id', b.bundle.bundle_id)
                      .single();

                    // Fetch bundle addons separately
                    const { data: bundleAddons } = await supabase
                      .from('BundlesAddons')
                      .select(`
                        bundle_addon_id,
                        addon_id,
                        quantity,
                        Addons (
                          addon_id,
                          title,
                          description,
                          price,
                          image_link
                        )
                      `)
                      .eq('bundle_id', b.bundle.bundle_id);
                    
                    return {
                      bundle_id: String(b.bundle.bundle_id),
                      name: String(b.bundle.title),
                      description: bundleData?.description || null,
                      discount_type: bundleData?.discount_type || null,
                      discount_value: Number(bundleData?.discount_value) || 0,
                      quantity: Number(b.quantity) || 0,
                      selected_at: new Date().toISOString(),
                      included_items: bundleAddons?.map((item: any) => ({
                        addon_id: String(item.addon_id),
                        addon_name: String(item.Addons?.title || 'Unknown'),
                        addon_description: String(item.Addons?.description || ''),
                        addon_price: Number(item.Addons?.price) || 0,
                        addon_image: item.Addons?.image_link || null,
                        quantity_included: Number(item.quantity) || 0,
                        total_value: Number(item.Addons?.price) * Number(item.quantity) || 0
                      })) || []
                    };
                  } catch (error) {
                    console.error('Error fetching bundle details:', error);
                    // Fallback to basic bundle info
                    return {
                      bundle_id: String(b.bundle.bundle_id),
                      name: String(b.bundle.title),
                      description: null,
                      discount_type: null,
                      discount_value: 0,
                      quantity: Number(b.quantity) || 0,
                      selected_at: new Date().toISOString(),
                      included_items: []
                    };
                  }
                })
              );
              
              // Prepare addon data for lead_submission_data
              const addonData = {
                selected_addons: selectedAddonsList.map(a => ({
                  addon_id: String(a.addon_id),
                  name: String(a.title),
                  price: Number(a.price) || 0,
                  quantity: Number(a.quantity) || 0,
                  total_price: Number(a.price) * Number(a.quantity) || 0,
                  selected_at: new Date().toISOString()
                })),
                selected_bundles: bundleDetails,
                product_info: selectedProduct ? {
                  product_id: String(selectedProduct.partner_product_id),
                  name: String(selectedProduct.name),
                  price: Number(selectedProduct.price) || 0,
                  image_url: selectedProduct.image_url ? String(selectedProduct.image_url) : null,
                  selected_power: selectedProduct.selected_power ? String(selectedProduct.selected_power) : null,
                } : null,
                calculator_settings: calculatorSettings || selectedProduct?.calculator_settings || null,
                total_addon_price: Number(selectedAddonsList.reduce((sum, a) => sum + (Number(a.price) * Number(a.quantity)), 0)),
                total_bundle_count: Number(selectedBundlesList.reduce((sum, b) => sum + Number(b.quantity), 0)),
                total_bundle_items: Number(bundleDetails.reduce((sum: number, bundle: any) => 
                  sum + bundle.included_items.reduce((itemSum: number, item: any) => 
                    itemSum + (item.quantity_included * bundle.quantity), 0
                  ), 0
                )),
                selection_completed_at: new Date().toISOString(),
                total_time_on_page_ms: Number(totalTimeOnPage)
              };

              console.log('Prepared addon data:', addonData);

              // Save addon data to lead_submission_data in background
              const serviceCategoryId = selectedProduct?.service_category_id || category?.service_category_id || '';
              
              if (serviceCategoryId) {
                saveLeadSubmissionData(
                  supabase,
                  submissionId,
                  partnerInfo.user_id,
                  serviceCategoryId,
                  {
                    addons_data: addonData
                  },
                  'checkout',
                  ['quote', 'products', 'addons']
                ).catch(err => 
                  console.warn('Failed to save addon data to lead_submission_data:', err)
                );
              } else {
                console.warn('Cannot save addon data: missing service_category_id');
              }

              // Also update partner_leads table (existing functionality)
              await supabase
                .from('partner_leads')
                .update({
                  cart_state: {
                    product_id: selectedProduct?.partner_product_id || null,
                    addons: selectedAddonsList.map(a => ({ addon_id: a.addon_id, quantity: a.quantity })),
                    bundles: selectedBundlesList.map(b => ({ bundle_id: b.bundle.bundle_id, quantity: b.quantity })),
                  },
                  product_info: selectedProduct ? {
                    product_id: selectedProduct.partner_product_id,
                    name: selectedProduct.name,
                    price: selectedProduct.price,
                    image_url: selectedProduct.image_url,
                    selected_power: selectedProduct.selected_power,
                  } : null,
                  calculator_info: calculatorSettings || selectedProduct?.calculator_settings,
                  addon_info: selectedAddonsList.map(a => ({
                    addon_id: a.addon_id,
                    name: a.title,
                    price: a.price,
                    quantity: a.quantity
                  })),
                  bundle_info: selectedBundlesList.map(b => ({
                    bundle_id: b.bundle.bundle_id,
                    name: b.bundle.title,
                    price: 0, // Bundles don't have direct price
                    quantity: b.quantity
                  })),
                  progress_step: 'checkout',
                  last_seen_at: new Date().toISOString(),
                })
                .eq('submission_id', submissionId)
            }
          } catch (e) {
            console.warn('Failed to persist cart before checkout', e)
          }
          
          const url = new URL('/boiler/checkout', window.location.origin)
                    if (submissionId) url.searchParams.set('submission', submissionId)
                    window.location.href = url.toString()
                  }}
      />
    </div>
  )
}

export default function BoilerAddonsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12">
        <AddonsLoader />
      </div>
    }>
      <BoilerAddonsPageContent />
    </Suspense>
  )
}


