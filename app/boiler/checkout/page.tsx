'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CheckoutLayout, { SelectedAddonItem, SelectedBundleItem, BundleLite } from '@/components/category-commons/checkout/CheckoutLayout'

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
}

interface BundleAddonItem { bundle_addon_id: string; bundle_id: string; addon_id: string; quantity: number; Addons?: Addon }
interface Bundle { bundle_id: string; partner_id: string; title: string; description: string | null; discount_type: 'fixed' | 'percent'; discount_value: number; service_category_id: string | null; BundlesAddons?: BundleAddonItem[] }

function BoilerCheckoutPageContent() {
  const supabase = createClient()
  const sp = useSearchParams()
  const submissionId = sp?.get('submission') || null

  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [companyColor, setCompanyColor] = useState<string | null>(null)
  const [product, setProduct] = useState<PartnerProduct | null>(null)
  const [addons, setAddons] = useState<Addon[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        setError(null)
        const hostname = window.location.hostname
        const subdomain = hostname.split('.')[0]
        if (!subdomain || subdomain === 'localhost' || subdomain === 'www') {
          setError('Please access this page through a partner subdomain')
          return
        }
        const { data: partner, error: partnerError } = await supabase
          .from('UserProfiles')
          .select('user_id, company_color')
          .eq('subdomain', subdomain)
          .eq('status', 'active')
          .single()
        if (partnerError || !partner) { setError('Partner not found for this subdomain'); return }
        setPartnerId(partner.user_id)
        setCompanyColor(partner.company_color || null)

        // Load cart from partner_leads.cart_state by submission id
        let cart: any = {}
        let pInfo: any = null
        let aInfo: any[] = []
        let bInfo: any[] = []
        
        if (submissionId) {
          const { data: lead } = await supabase
            .from('partner_leads')
            .select('cart_state, product_info, addon_info, bundle_info')
            .eq('submission_id', submissionId)
            .single()
          cart = (lead as any)?.cart_state || {}
          pInfo = (lead as any)?.product_info || null
          aInfo = (lead as any)?.addon_info || []
          bInfo = (lead as any)?.bundle_info || []
          if (pInfo && pInfo.product_id) {
            setProduct({
              partner_product_id: pInfo.product_id,
              partner_id: partner.user_id,
              name: pInfo.name,
              price: pInfo.price ?? null,
              image_url: pInfo.image_url ?? null,
            } as PartnerProduct)
          }
        }

        if (!product && cart.product_id) {
          const { data: prod } = await supabase
            .from('PartnerProducts')
            .select('partner_product_id, partner_id, name, price, image_url')
            .eq('partner_product_id', cart.product_id)
            .eq('partner_id', partner.user_id)
            .single()
          if (prod) setProduct(prod as PartnerProduct)
        }

        // Use addon_info and bundle_info from database if available, otherwise fetch from database
        if (aInfo && aInfo.length > 0) {
          // Use the stored addon info
          setAddons(aInfo.map((a: any) => ({
            addon_id: a.addon_id,
            title: a.name,
            description: '', // Not stored in addon_info
            price: a.price,
            image_link: null, // Not stored in addon_info
            allow_multiple: true, // Default assumption
            max_count: null,
            addon_type_id: '', // Not stored in addon_info
            service_category_id: '',
            partner_id: partner.user_id,
            created_at: '',
            updated_at: '',
          })) as Addon[])
        } else {
          // Fallback to fetching from database
          const addonIds = Array.isArray(cart.addons) ? cart.addons.map((a: any) => a.addon_id) : []
          if (addonIds.length) {
            const { data: rows } = await supabase.from('Addons').select('*').in('addon_id', addonIds).eq('partner_id', partner.user_id)
            setAddons((rows || []) as Addon[])
          }
        }

        if (bInfo && bInfo.length > 0) {
          // Use the stored bundle info
          setBundles(bInfo.map((b: any) => ({
            bundle_id: b.bundle_id,
            partner_id: partner.user_id,
            title: b.name,
            description: null,
            discount_type: 'fixed' as const,
            discount_value: 0,
            service_category_id: null,
            created_at: '',
            updated_at: '',
            BundlesAddons: [],
          })) as unknown as Bundle[])
        } else {
          // Fallback to fetching from database
          const bundleIds = Array.isArray(cart.bundles) ? cart.bundles.map((b: any) => b.bundle_id) : []
          if (bundleIds.length) {
            const { data: bRows } = await supabase
              .from('Bundles')
              .select('*, BundlesAddons(*, Addons(*))')
              .in('bundle_id', bundleIds)
              .eq('partner_id', partner.user_id)
            setBundles((bRows || []) as unknown as Bundle[])
          }
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
    // Infer quantities from partner_leads.cart_state by intersecting with fetched addons
    // If cart quantities are missing, fallback to 1
    const map = new Map<string, number>()
    addons.forEach(a => { if (!map.has(a.addon_id)) map.set(a.addon_id, 1) })
    return Array.from(map.entries()).map(([id, qty]) => {
      const a = addons.find(x => x.addon_id === id)!
      return { ...a, quantity: qty }
    })
  }, [addons])

  const selectedBundles: SelectedBundleItem[] = useMemo(() => {
    return (bundles || []).map(b => {
      const items = b.BundlesAddons || []
      const subtotal = items.reduce((s, i) => s + (i.Addons?.price || 0) * (i.quantity || 0), 0)
      const dv = Number(b.discount_value || 0)
      const discount = b.discount_type === 'percent' ? Math.min(subtotal * (dv / 100), subtotal) : Math.min(dv, subtotal)
      const unitPrice = Math.max(0, subtotal - discount)
      return { bundle: b as unknown as BundleLite, quantity: 1, unitPrice }
    })
  }, [bundles])

  if (loading) {
    return <div className="container mx-auto px-4 py-12"><p className="text-gray-600">Preparing checkout…</p></div>
  }
  if (error) {
    return <div className="container mx-auto px-4 py-12"><div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div></div>
  }

  return (
    <CheckoutLayout
      selectedProduct={product}
      selectedAddons={selectedAddons}
      selectedBundles={selectedBundles}
      companyColor={companyColor}
      onSubmitBooking={async (payload) => {
        console.log('Booking submitted', payload)
        // TODO: integrate payments and booking save
        alert('Booking submitted! (stub)')
      }}
    />
  )
}

export default function BoilerCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12">
        <p className="text-gray-600">Preparing checkout…</p>
      </div>
    }>
      <BoilerCheckoutPageContent />
    </Suspense>
  )
}


