'use client'

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AddonsLayout, { BundleLite } from '@/components/category-commons/addon/AddonsLayout'
import { resolvePartnerByHost } from '@/lib/partner'

interface AddonType {
  id: string
  name: string
  allow_multiple_selection: boolean
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
  addon_types: AddonType[]
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
        setCategory(categoryData as Category)

        // 3) Load partner settings for APR configurations
        const { data: settingsData, error: settingsError } = await supabase
          .from('PartnerSettings')
          .select('apr_settings')
          .eq('partner_id', partnerUserId)
          .eq('service_category_id', categoryData.service_category_id)
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
        
        if (submissionId) {
          const { data: lead, error: leadError } = await supabase
            .from('partner_leads')
            .select('cart_state, product_info, addon_info, bundle_info')
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
          console.log('Product info from database:', pInfo)
          console.log('Addon info from database:', aInfo)
          console.log('Bundle info from database:', bInfo)
          console.log('Cart state:', cartState)
          console.log('Calculator settings from pInfo:', pInfo?.calculator_settings)
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
            .select('partner_product_id, partner_id, name, price, image_url, service_category_id')
            .eq('partner_product_id', resolvedProductId)
            .eq('partner_id', partnerUserId)
            .eq('service_category_id', categoryData.service_category_id)
            .single()

          if (!productError && product) {
            const { service_category_id: _omit, ...rest } = product as any
            // Merge with product_info from database to include calculator settings
            const productWithSettings = {
              ...rest,
              calculator_settings: pInfo.calculator_settings || null,
              selected_power: pInfo.selected_power || null
            }
            console.log('Product with settings (from URL):', productWithSettings)
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
            calculator_settings: pInfo.calculator_settings || null,
            selected_power: pInfo.selected_power || null
          }
          console.log('Product with settings (from database):', productWithSettings)
          setSelectedProduct(productWithSettings as PartnerProduct)
          console.log('Set selected product to:', productWithSettings)
        }

        // 4) Fetch partner addons for this category
        const { data: addonsData, error: addonsError } = await supabase
          .from('Addons')
          .select('*')
          .eq('service_category_id', categoryData.service_category_id)
          .eq('partner_id', partnerUserId)

        if (addonsError) {
          setError('Failed to load addons')
          return
        }

        setAddons((addonsData || []) as Addon[])

        // 5) Fetch partner bundles for this category
        const { data: bundlesData, error: bundlesError } = await supabase
          .from('Bundles')
          .select('*, BundlesAddons(*, Addons(*))')
          .eq('partner_id', partnerUserId)
          .eq('service_category_id', categoryData.service_category_id)
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
  }, [selectedProduct])

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
        const updateResult = await supabase
          .from('partner_leads')
          .update({
            cart_state: { ...cartPayload, product_id: selectedProduct?.partner_product_id || null },
            product_info: selectedProduct ? {
              product_id: selectedProduct.partner_product_id,
              name: selectedProduct.name,
              price: selectedProduct.price,
              image_url: selectedProduct.image_url,
              calculator_settings: selectedProduct.calculator_settings,
              selected_power: selectedProduct.selected_power,
            } : null,
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
        }
      } catch (e) {
        console.warn('Failed to save cart state', e)
      }
    }, 400)
    return () => saveTimer.current && clearTimeout(saveTimer.current)
  }, [cartPayload, selectedProduct?.partner_product_id, submissionId, isUserActive])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-gray-600">Loading add-ons…</p>
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

  return (
    <AddonsLayout
      category={category as any}
      addons={addons as any}
      bundles={bundles as unknown as BundleLite[]}
      selectedAddons={selectedAddons}
      selectedBundles={selectedBundles}
      selectedProduct={selectedProduct as any}
      companyColor={companyColor}
      partnerSettings={partnerSettings}
      backHref="/boiler/products"
      backLabel="Back to Products"
      showBack
      onChangeAddonQuantity={handleQuantityChange as any}
      onToggleBundle={(b) => handleAddBundle(b as unknown as Bundle)}
      onChangeBundleQuantity={handleBundleQtyChange}
      onContinue={async (selectedAddonsList, selectedBundlesList) => {
        // Persist cart and move with only submission in URL
        try {
          if (submissionId) {
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
                  calculator_settings: selectedProduct.calculator_settings,
                  selected_power: selectedProduct.selected_power,
                } : null,
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
  )
}

export default function BoilerAddonsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12">
        <p className="text-gray-600">Loading add-ons…</p>
      </div>
    }>
      <BoilerAddonsPageContent />
    </Suspense>
  )
}


