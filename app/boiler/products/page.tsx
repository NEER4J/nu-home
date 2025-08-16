'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import ProductHeaderTile from '@/components/category-commons/product/ProductHeaderTile'
import ProductFaqs from '@/components/category-commons/product/ProductFaqs'
import FinanceCalculator from '@/components/FinanceCalculator'
import ImageGallery from '@/components/ImageGallery'
import { resolvePartnerByHost } from '@/lib/partner'

interface PartnerInfo {
  company_name: string
  contact_person: string
  postcode: string
  subdomain: string
  business_description?: string
  website_url?: string
  logo_url?: string
  user_id: string
  phone?: string
  company_color?: string
}

interface PartnerProduct {
  partner_product_id: string
  partner_id: string
  base_product_id: string | null
  name: string
  slug: string
  description: string
  price: number | null
  image_url: string | null
  specifications: Record<string, unknown>
  product_fields: Record<string, unknown>
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  service_category_id: string
}

interface PowerAndPrice {
  power: string
  price: number
  additional_cost?: number
}

interface PartnerSettings {
  setting_id: string
  partner_id: string
  service_category_id: string
  apr_settings: Record<number, number> | null
  otp_enabled: boolean | null
  included_items: Array<any> | null
  faqs: Array<any> | null
  created_at?: string | null
  updated_at?: string | null
}

interface QuoteSubmission {
  submission_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  city: string | null
  postcode: string
  submission_date: string
  status: string
  form_answers: Array<{
    question_id: string
    question_text: string
    answer: string | string[]
  }>
}

function BoilerProductsContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null)
  const [products, setProducts] = useState<PartnerProduct[]>([])
  const [partnerSettings, setPartnerSettings] = useState<PartnerSettings | null>(null)
  const [submissionInfo, setSubmissionInfo] = useState<QuoteSubmission | null>(null)
  const [showFinanceCalculator, setShowFinanceCalculator] = useState(false)
  const [selectedProductForFinance, setSelectedProductForFinance] = useState<PartnerProduct | null>(null)
  const [selectedPowerOptions, setSelectedPowerOptions] = useState<Record<string, PowerAndPrice>>({})
  const [selectedPlans, setSelectedPlans] = useState<Record<string, { months: number; apr: number }>>({})
  const [selectedDeposits, setSelectedDeposits] = useState<Record<string, number>>({})
  const [monthlyPayments, setMonthlyPayments] = useState<Record<string, number>>({})
  const [showWhatsIncluded, setShowWhatsIncluded] = useState(false)
  const [selectedProductForWhatsIncluded, setSelectedProductForWhatsIncluded] = useState<PartnerProduct | null>(null)

  // Filters
  const [filterBoilerType, setFilterBoilerType] = useState<string | null>(null)
  const [filterBedroom, setFilterBedroom] = useState<string | null>(null)
  const [filterBathroom, setFilterBathroom] = useState<string | null>(null)
  // Prefill baseline captured from submission answers
  const [prefillBoilerType, setPrefillBoilerType] = useState<string | null>(null)
  const [prefillBedroom, setPrefillBedroom] = useState<string | null>(null)
  const [prefillBathroom, setPrefillBathroom] = useState<string | null>(null)

  // Read submission id to persist context (if present)
  const submissionId = searchParams?.get('submission') ?? null
  
  // Debug logging
  console.log('Products page - submissionId from URL:', submissionId)
  console.log('Products page - all search params:', Object.fromEntries(searchParams?.entries() || []))

  // Resolve brand color and classes
  const brandColor = partnerInfo?.company_color || '#2563eb'
  const classes = useDynamicStyles(brandColor)

  // Helper functions for power and price handling
  const getPowerAndPriceOptions = (product: PartnerProduct): PowerAndPrice[] => {
    const raw = (product.product_fields as any)?.power_and_price
    if (!Array.isArray(raw)) return []
    
    return raw.map((item: any) => {
      const power = item.power || item.kw || item.power_rating || '0'
      const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0
      const additionalCost = item.additional_cost || item.additional_cost_pounds || item.extra_cost || item.cost_difference || 0
      
      return {
        power,
        price,
        additional_cost: additionalCost
      }
    })
  }

  const getSelectedPowerOption = (product: PartnerProduct): PowerAndPrice | null => {
    const productId = product.partner_product_id
    return selectedPowerOptions[productId] || null
  }

  const getCurrentPrice = (product: PartnerProduct): number => {
    const selectedPower = getSelectedPowerOption(product)
    if (selectedPower) {
      return selectedPower.price
    }
    return product.price || 0
  }

  const getMonthlyPayment = (product: PartnerProduct): number | null => {
    // First check if we have a calculated monthly payment
    const calculatedPayment = monthlyPayments[product.partner_product_id]
    if (calculatedPayment) {
      return calculatedPayment
    }
    
    // If no calculated payment, calculate it using saved calculator settings
    const selectedPlan = getSelectedPlan(product)
    const selectedDeposit = getSelectedDeposit(product)
    const currentPrice = getCurrentPrice(product)
    
    if (selectedPlan && partnerSettings?.apr_settings) {
      const apr = partnerSettings.apr_settings[selectedPlan.months]
      if (apr && apr > 0) {
        const monthlyPayment = calculateMonthlyPaymentWithDeposit(currentPrice, apr, selectedPlan.months, selectedDeposit)
        // Store this calculation for future use
        setMonthlyPayments(prev => ({
          ...prev,
          [product.partner_product_id]: monthlyPayment
        }))
        return monthlyPayment
      }
    }
    
    return null
  }

  // Helper function to calculate monthly payment using APR
  const calculateMonthlyPayment = (price: number, apr: number, months: number): number => {
    const monthlyRate = apr / 100 / 12
    return (price * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
  }

  // Helper function to calculate monthly payment with deposit
  const calculateMonthlyPaymentWithDeposit = (price: number, apr: number, months: number, depositPercentage: number): number => {
    const depositAmount = (price * depositPercentage) / 100
    const loanAmount = price - depositAmount
    
    if (depositAmount > 0) {
      const monthlyRate = apr / 100 / 12
      return (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    } else {
      return calculateMonthlyPayment(price, apr, months)
    }
  }

  const getSelectedPlan = (product: PartnerProduct): { months: number; apr: number } | null => {
    return selectedPlans[product.partner_product_id] || null
  }

  const getSelectedDeposit = (product: PartnerProduct): number => {
    return selectedDeposits[product.partner_product_id] || 0
  }

  const selectPowerOption = (product: PartnerProduct, powerOption: PowerAndPrice) => {
    setSelectedPowerOptions(prev => ({
      ...prev,
      [product.partner_product_id]: powerOption
    }))
    
    // Recalculate monthly payment when power option changes
    const newPrice = powerOption.price
    if (newPrice > 0 && partnerSettings?.apr_settings) {
      const selectedPlan = getSelectedPlan(product)
      const availableTerms = Object.keys(partnerSettings.apr_settings).map(Number).sort((a, b) => a - b)
      if (availableTerms.length > 0) {
        const term = selectedPlan?.months || availableTerms[0]
        const apr = partnerSettings.apr_settings[term]
        if (apr && apr > 0) {
          const depositPercentage = getSelectedDeposit(product)
          const monthlyPayment = calculateMonthlyPaymentWithDeposit(newPrice, apr, term, depositPercentage)
          setMonthlyPayments(prev => ({
            ...prev,
            [product.partner_product_id]: monthlyPayment
          }))
        }
      }
    }
  }

  // Fetch partner by host (custom domain preferred, fallback to subdomain)
  useEffect(() => {
    async function fetchPartnerByHost() {
      try {
        const hostname = window.location.hostname
        const partner = await resolvePartnerByHost(supabase, hostname)
        if (!partner) {
          setError('Partner not found for this domain')
          setLoading(false)
          return
        }
        setPartnerInfo(partner as PartnerInfo)
      } catch (err) {
        console.error('Error resolving partner from host:', err)
        setError('Failed to load partner information')
        setLoading(false)
      }
    }

    fetchPartnerByHost()
  }, [])

  // Fetch heating service category id and then load products
  useEffect(() => {
    async function loadProducts() {
      if (!partnerInfo?.user_id) return
      setLoading(true)
      setError(null)

      try {
        // Get heating category id
        const { data: category, error: categoryError } = await supabase
          .from('ServiceCategories')
          .select('service_category_id')
          .eq('slug', 'boiler')
          .eq('is_active', true)
          .single()

        if (categoryError || !category) {
          throw new Error('Heating category not found')
        }

        const { data: partnerProducts, error: productsError } = await supabase
          .from('PartnerProducts')
          .select('*')
          .eq('partner_id', partnerInfo.user_id)
          .eq('service_category_id', category.service_category_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (productsError) {
          throw productsError
        }

        setProducts((partnerProducts || []) as PartnerProduct[])

        // Fetch Partner Settings for this partner + service category
        const { data: settings, error: settingsError } = await supabase
          .from('PartnerSettings')
          .select('*')
          .eq('partner_id', partnerInfo.user_id)
          .eq('service_category_id', category.service_category_id)
          .single()

        if (!settingsError && settings) {
          // Convert APR settings keys from string to number
          const convertedSettings = {
            ...settings,
            apr_settings: settings.apr_settings ? 
              Object.fromEntries(
                Object.entries(settings.apr_settings).map(([key, value]) => [
                  parseInt(key),
                  typeof value === 'number' ? value : parseFloat(String(value))
                ])
              ) : null
          }
          setPartnerSettings(convertedSettings as PartnerSettings)
        } else {
          setPartnerSettings(null)
        }
      } catch (err: any) {
        console.error('Error loading products:', err)
        setError(err?.message || 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [partnerInfo?.user_id])

  // Fetch submission info if submission ID is present
  useEffect(() => {
    async function loadSubmissionInfo() {
      if (!submissionId) {
        console.log('No submission ID provided')
        return
      }

      console.log('Loading submission info for ID:', submissionId)

      try {
        // Try partner_leads table first (where the API actually inserts)
        const { data: partnerLead, error: partnerLeadError } = await supabase
          .from('partner_leads')
          .select('*')
          .eq('submission_id', submissionId)
          .single()

        if (partnerLead && !partnerLeadError) {
          console.log('Found submission in partner_leads:', partnerLead)
          setSubmissionInfo(partnerLead as QuoteSubmission)
          return
        }

        console.log('Not found in partner_leads, trying QuoteSubmissions...')

        // Fallback to QuoteSubmissions table
        const { data: submission, error: submissionError } = await supabase
          .from('QuoteSubmissions')
          .select('*')
          .eq('submission_id', submissionId)
          .single()

        if (submissionError) {
          console.error('Error loading submission from QuoteSubmissions:', submissionError)
          return
        }

        if (submission) {
          console.log('Found submission in QuoteSubmissions:', submission)
          setSubmissionInfo(submission as QuoteSubmission)
        } else {
          console.log('No submission found in either table')
        }
      } catch (err) {
        console.error('Error loading submission info:', err)
      }
    }

    loadSubmissionInfo()
  }, [submissionId])

  const formattedProducts = useMemo(() => {
    return products.map((product) => {
      const powerOptions = getPowerAndPriceOptions(product)
      
      // Auto-select first power option if none selected and power options exist
      if (powerOptions.length > 0 && !selectedPowerOptions[product.partner_product_id]) {
        const firstOption = powerOptions[0]
        selectPowerOption(product, firstOption)
      }
      
      // Calculate initial monthly payment for products without power options
      if (powerOptions.length === 0 && typeof product.price === 'number' && product.price > 0 && partnerSettings?.apr_settings) {
        const selectedPlan = getSelectedPlan(product)
        const availableTerms = Object.keys(partnerSettings.apr_settings).map(Number).sort((a, b) => a - b)
        if (availableTerms.length > 0) {
          const term = selectedPlan?.months || availableTerms[0]
          const apr = partnerSettings.apr_settings[term]
          if (apr && apr > 0) {
            const depositPercentage = getSelectedDeposit(product)
            const monthlyPayment = calculateMonthlyPaymentWithDeposit(product.price, apr, term, depositPercentage)
            setMonthlyPayments(prev => ({
              ...prev,
              [product.partner_product_id]: monthlyPayment
            }))
          }
        }
      }
      
      return { ...product }
    })
  }, [products, selectedPowerOptions, partnerSettings])

  // Normalization helpers for filtering
  const normalizeNumberToBucket = (value: any, cap: number): string | null => {
    if (value === null || value === undefined) return null
    const raw = String(value).toLowerCase().trim()
    if (!raw) return null
    if (raw.includes('+')) {
      const n = parseInt(raw.replace(/[^0-9]/g, ''), 10)
      if (!Number.isNaN(n)) return `${n}+`
    }
    const match = raw.match(/\d+/)
    if (match) {
      const n = parseInt(match[0], 10)
      if (!Number.isNaN(n)) {
        return n >= cap ? `${cap}+` : String(n)
      }
    }
    return null
  }

  const getSupportedBedrooms = (product: PartnerProduct): string[] => {
    const raw = (product.product_fields as any)?.supported_bedroom
    if (!raw) return []
    const arr = Array.isArray(raw) ? raw : [raw]
    const out = new Set<string>()
    arr.forEach((item) => {
      const bucket = normalizeNumberToBucket(item, 6)
      if (bucket) out.add(bucket)
    })
    return Array.from(out)
  }

  const getSupportedBathrooms = (product: PartnerProduct): string[] => {
    const raw = (product.product_fields as any)?.supported_bathroom
    if (!raw) return []
    const arr = Array.isArray(raw) ? raw : [raw]
    const out = new Set<string>()
    arr.forEach((item) => {
      const bucket = normalizeNumberToBucket(item, 4)
      if (bucket) out.add(bucket)
    })
    return Array.from(out)
  }

  const getBoilerTypes = (product: PartnerProduct): string[] => {
    const raw = (product.product_fields as any)?.boiler_type
    if (!raw) return []
    const arr = Array.isArray(raw) ? raw : [raw]
    return arr
      .map((v) => String(v).toLowerCase().trim())
      .filter(Boolean)
  }

  const normalizeBoilerTypeAnswer = (value: any): string | null => {
    if (value === null || value === undefined) return null
    const raw = String(Array.isArray(value) ? value[0] : value).toLowerCase().trim()
    if (!raw) return null
    if (/(combi)/i.test(raw)) return 'combi'
    if (/(regular|conventional|heat\s*only)/i.test(raw)) return 'regular'
    if (/(system)/i.test(raw)) return 'system'
    return null
  }

  // Derive prefill values from submission answers when they load
  useEffect(() => {
    const answers = submissionInfo?.form_answers
    if (!answers || !Array.isArray(answers)) {
      setPrefillBathroom(null)
      setPrefillBedroom(null)
      setPrefillBoilerType(null)
      return
    }

    const BATHROOM_Q = 'c9b962d4-baa5-419e-99bf-933216d531e7'
    const BEDROOM_Q = 'fc39112a-0d71-4766-845d-3fdec496d471'
    const BOILER_TYPE_Q = 'bbe071af-72d0-4ce4-85a7-83d5f3c82180'

    const bathroomAns = answers.find((a: any) => a.question_id === BATHROOM_Q)?.answer
    const bedroomAns = answers.find((a: any) => a.question_id === BEDROOM_Q)?.answer
    const typeAns = answers.find((a: any) => a.question_id === BOILER_TYPE_Q)?.answer

    setPrefillBathroom(normalizeNumberToBucket(bathroomAns, 4))
    setPrefillBedroom(normalizeNumberToBucket(bedroomAns, 6))
    setPrefillBoilerType(normalizeBoilerTypeAnswer(typeAns))
  }, [submissionInfo?.form_answers])

  // Apply prefill to filters initially (without overriding user changes later)
  useEffect(() => {
    if (filterBathroom === null && prefillBathroom) setFilterBathroom(prefillBathroom)
    if (filterBedroom === null && prefillBedroom) setFilterBedroom(prefillBedroom)
    if (filterBoilerType === null && prefillBoilerType) setFilterBoilerType(prefillBoilerType)
  }, [prefillBathroom, prefillBedroom, prefillBoilerType])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterBoilerType) {
        const types = getBoilerTypes(p)
        if (!types.length || !types.includes(filterBoilerType)) return false
      }
      if (filterBedroom) {
        const beds = getSupportedBedrooms(p)
        if (!beds.length || !beds.includes(filterBedroom)) return false
      }
      if (filterBathroom) {
        const baths = getSupportedBathrooms(p)
        if (!baths.length || !baths.includes(filterBathroom)) return false
      }
      return true
    })
  }, [products, filterBoilerType, filterBedroom, filterBathroom])

  const displayProducts = useMemo(() => {
    return filteredProducts
  }, [filteredProducts])

  const productsForEmail = useMemo(() => {
    return displayProducts.map((p) => ({
      id: p.partner_product_id,
      name: p.name,
      priceLabel: (p as any).priceLabel as string,
    }))
  }, [displayProducts])

  const clearFilters = () => {
    setFilterBoilerType(null)
    setFilterBedroom(null)
    setFilterBathroom(null)
  }

  const resetFiltersToSubmission = () => {
    setFilterBoilerType(prefillBoilerType)
    setFilterBedroom(prefillBedroom)
    setFilterBathroom(prefillBathroom)
  }



  const openFinanceCalculator = (product: PartnerProduct) => {
    setSelectedProductForFinance(product)
    setShowFinanceCalculator(true)
    
    // Calculate and store monthly payment for this product
    const currentPrice = getCurrentPrice(product)
    if (currentPrice > 0 && partnerSettings?.apr_settings) {
      // Use saved calculator settings or default to first available term
      const selectedPlan = getSelectedPlan(product)
      const selectedDeposit = getSelectedDeposit(product)
      
      if (selectedPlan && selectedDeposit !== undefined) {
        // Use saved settings
        const apr = partnerSettings.apr_settings[selectedPlan.months]
        if (apr && apr > 0) {
          const monthlyPayment = calculateMonthlyPaymentWithDeposit(currentPrice, apr, selectedPlan.months, selectedDeposit)
          setMonthlyPayments(prev => ({
            ...prev,
            [product.partner_product_id]: monthlyPayment
          }))
        }
      } else {
        // Default calculation for new products
        const availableTerms = Object.keys(partnerSettings.apr_settings).map(Number).sort((a, b) => a - b)
        if (availableTerms.length > 0) {
          const defaultTerm = availableTerms[0]
          const apr = partnerSettings.apr_settings[defaultTerm]
          if (apr && apr > 0) {
            const monthlyPayment = calculateMonthlyPayment(currentPrice, apr, defaultTerm)
            setMonthlyPayments(prev => ({
              ...prev,
              [product.partner_product_id]: monthlyPayment
            }))
          }
        }
      }
    }
  }

  const closeFinanceCalculator = () => {
    setShowFinanceCalculator(false)
    setSelectedProductForFinance(null)
  }

  const openWhatsIncluded = (product: PartnerProduct) => {
    setSelectedProductForWhatsIncluded(product)
    setShowWhatsIncluded(true)
  }

  const closeWhatsIncluded = () => {
    setShowWhatsIncluded(false)
    setSelectedProductForWhatsIncluded(null)
  }

  // Persist selected product (with snapshot) in partner_leads.cart_state and advance progress
  const persistProductAndGo = async (product: PartnerProduct) => {
    try {
      console.log('persistProductAndGo called with:', { submissionId, partnerInfo: partnerInfo?.user_id })
      
      if (!submissionId || !partnerInfo?.user_id) {
        console.error('Missing submissionId or partnerInfo:', { submissionId, partnerUserId: partnerInfo?.user_id })
        const url = new URL('/boiler/addons', window.location.origin)
        if (submissionId) url.searchParams.set('submission', submissionId)
        url.searchParams.set('product', product.partner_product_id)
        window.location.href = url.toString()
        return
      }

      
      // Load existing cart_state to preserve addons/bundles
      const { data: lead } = await supabase
        .from('partner_leads')
        .select('cart_state')
        .eq('submission_id', submissionId)
        .single()
      const existing = (lead as any)?.cart_state || {}
      const selectedPower = getSelectedPowerOption(product)
      const currentPrice = getCurrentPrice(product)
      const selectedPlan = getSelectedPlan(product)
      const selectedDeposit = getSelectedDeposit(product)
      
      const updated = {
        ...existing,
        product_id: product.partner_product_id,
        selected_power: selectedPower,
        current_price: currentPrice,
        calculator_settings: {
          selected_plan: selectedPlan,
          selected_deposit: selectedDeposit,
        }
      }
      console.log('Attempting to update partner_leads with:', {
        submissionId,
        cart_state: updated,
        product_info: {
          product_id: product.partner_product_id,
          name: product.name,
          price: currentPrice,
          selected_power: selectedPower,
          calculator_settings: {
            selected_plan: selectedPlan,
            selected_deposit: selectedDeposit,
          },
          image_url: product.image_url,
        }
      })
      
      const updateResult = await supabase
        .from('partner_leads')
        .update({
          cart_state: updated,
          product_info: {
            product_id: product.partner_product_id,
            name: product.name,
            price: currentPrice,
            selected_power: selectedPower,
            calculator_settings: {
              selected_plan: selectedPlan,
              selected_deposit: selectedDeposit,
            },
            image_url: product.image_url,
          },
          progress_step: 'addons',
          last_seen_at: new Date().toISOString(),
        })
        .eq('submission_id', submissionId)
      
      if (updateResult.error) {
        console.error('Failed to update partner_leads:', updateResult.error)
        console.error('Error details:', {
          message: updateResult.error.message,
          details: updateResult.error.details,
          hint: updateResult.error.hint
        })
        throw new Error('Database update failed')
      }
      
      console.log('Successfully saved product to database:', {
        submissionId,
        product_id: product.partner_product_id,
        product_info: {
          product_id: product.partner_product_id,
          name: product.name,
          price: currentPrice,
          selected_power: selectedPower,
          image_url: product.image_url,
        }
      })
      
      // Verify what was actually saved in the database (for console logging only)
      const { data: verifyData, error: verifyError } = await supabase
        .from('partner_leads')
        .select('cart_state, product_info, progress_step, last_seen_at')
        .eq('submission_id', submissionId)
        .single()
      
      if (verifyError) {
        console.error('Database update successful but verification failed:', verifyError)
      } else {
        console.log('Database update successful - verification:', {
          submissionId,
          productName: product.name,
          productId: product.partner_product_id,
          progressStep: verifyData.progress_step,
          timestamp: verifyData.last_seen_at,
          cartStateProductId: verifyData.cart_state?.product_id,
          productInfoProductId: verifyData.product_info?.product_id,
          productInfoName: verifyData.product_info?.name,
          productInfoPrice: verifyData.product_info?.price,
          productInfoSelectedPower: verifyData.product_info?.selected_power,
          productInfoCalculatorSettings: verifyData.product_info?.calculator_settings
        })
      }
      
      const url = new URL('/boiler/addons', window.location.origin)
      url.searchParams.set('submission', submissionId)
      window.location.href = url.toString()
    } catch (e) {
      console.error('Failed to persist product selection:', e)
      const fallback = new URL('/boiler/addons', window.location.origin)
      if (submissionId) fallback.searchParams.set('submission', submissionId)
      fallback.searchParams.set('product', product.partner_product_id)
      window.location.href = fallback.toString()
    }
  }



  // Helper: normalize included item structures from various shapes
  const normalizeIncludedItem = (entry: any) => {
    if (!entry) return null
    const base = typeof entry === 'string' ? { title: entry } : (entry.items ?? entry)
    const image = base?.image || base?.icon || base?.img || base?.image_url || base?.url
    const title = base?.title || base?.name || base?.label || (typeof base === 'string' ? base : undefined) || 'Included'
    const subtitle = base?.subtitle || base?.sub_title || base?.description || base?.text || ''
    return { image, title, subtitle }
  }

  // Helper function to render product field values
  const renderProductFieldValue = (key: string, value: any) => {
    if (key === 'specs' && Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((spec: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span>{spec.items || spec.name || (typeof spec === 'string' ? spec : JSON.stringify(spec))}</span>
            </div>
          ))}
        </div>
      )
    }

    if (key === 'dimensions' && typeof value === 'object') {
      return (
        <div className="text-xs space-y-1">
          <div>D: {(value as any).depth}mm</div>
          <div>W: {(value as any).widht || (value as any).width}mm</div>
          <div>H: {(value as any).height}mm</div>
        </div>
      )
    }

    if (key === 'power_and_price' && Array.isArray(value)) {
      return (
        <div className="text-xs space-y-1">
          {value.map((item: any, index: number) => (
            <div key={index}>
              {item.power}kW: £{item.price}
              {item.additional_cost && item.additional_cost > 0 && (
                <span className="text-green-600 ml-1">(+£{item.additional_cost})</span>
              )}
            </div>
          ))}
        </div>
      )
    }

    if (key === 'supported_bedroom' && Array.isArray(value)) {
      return value.join(', ')
    }

    if (key === 'highlighted_features' && Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((feature: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>{feature.name || (typeof feature === 'string' ? feature : JSON.stringify(feature))}</span>
            </div>
          ))}
        </div>
      )
    }

    if (key === 'image_gallery' && Array.isArray(value)) {
      return (
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {value.map((img: any, idx: number) => (
            <img
              key={idx}
              src={typeof img === 'string' ? img : img.image || img.url}
              alt={`Gallery ${idx + 1}`}
              className="h-12 w-16 object-contain rounded border"
            />
          ))}
        </div>
      )
    }

    if (key === "what_s_included" && Array.isArray(value)) {
      return (
        <div className="space-y-2">
          {value.map((entry: any, idx: number) => {
            const normalized = normalizeIncludedItem(entry)
            if (!normalized) return null
            const { image, title, subtitle } = normalized
            return (
              <div key={idx} className="flex items-center gap-3 text-xs">
                {image && (
                  <img src={image} alt={title} className="h-8 w-8 rounded object-contain border" />
                )}
                <div>
                  <div className="font-medium text-gray-900">{title}</div>
                  {subtitle && <div className="text-gray-600">{subtitle}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value)
    }

    if (Array.isArray(value)) {
      return value.map((item: any) => 
        typeof item === 'object' ? JSON.stringify(item) : String(item)
      ).join(', ')
    }

    return 'Yes'
  }

  const renderKeyValueObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return null
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(obj).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3 p-2 bg-white rounded border">
            <span className="text-sm font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
            <span className="text-sm text-gray-900">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4"
            style={{ borderColor: `${brandColor}40`, borderTopColor: 'transparent' }}
          />
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load products</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-white rounded-md hover:opacity-90"
              style={{ backgroundColor: brandColor }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProductHeaderTile
        count={displayProducts.length}
        postcode={submissionInfo?.postcode || null}
        filterBedroom={filterBedroom}
        filterBathroom={filterBathroom}
        filterBoilerType={filterBoilerType}
        setFilterBedroom={setFilterBedroom}
        setFilterBathroom={setFilterBathroom}
        setFilterBoilerType={setFilterBoilerType}
        clearFilters={clearFilters}
        resetFiltersToSubmission={resetFiltersToSubmission}
        includedItems={partnerSettings?.included_items || null}
        brandColor={brandColor}
        defaultFirstName={submissionInfo?.first_name || null}
        defaultLastName={submissionInfo?.last_name || null}
        defaultEmail={submissionInfo?.email || null}
        submissionId={submissionId}
        productsForEmail={productsForEmail}
      />

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {displayProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-600">
            No products match your filters.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {displayProducts.map((product) => (
              <div key={product.partner_product_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Product Header */}
                <div className="relative p-6 pb-4">
                  {/* Product Image Gallery */}
                  <ImageGallery
                    images={(() => {
                      const gallery = (product.product_fields as any)?.image_gallery
                      if (Array.isArray(gallery) && gallery.length > 0) {
                        return gallery
                      }
                      // Fallback to main product image if no gallery
                      return product.image_url ? [{ image: product.image_url }] : []
                    })()}
                    productName={product.name}
                    className="mb-4"
                  />

                  {/* Brand Logo */}
                  <div className="text-sm font-semibold text-gray-600 mb-2">
                    {product.name.split(' ')[0].toUpperCase()}
                  </div>

                  {/* Product Name */}
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

            

                  {/* Description */}
                  {product.description && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-700">{product.description}</p>
                    </div>
                  )}

                  {/* Highlighted Features as Badges */}
                  {(() => {
                    const highlightedFeatures = (product.product_fields as any)?.highlighted_features
                    if (Array.isArray(highlightedFeatures) && highlightedFeatures.length > 0) {
                      return (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-2">
                            {highlightedFeatures.map((feature: any, index: number) => {
                              const featureText = typeof feature === 'string' ? feature : feature.name || JSON.stringify(feature)
                              return (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                                >
                                  {featureText}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Specifications Section */}
                  {(() => {
                    const specs = (product.product_fields as any)?.specs
                    if (Array.isArray(specs) && specs.length > 0) {
                      return (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Specifications</h4>
                          <div className="space-y-1">
                            {specs.map((spec: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-xs text-gray-700">
                                <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span>{spec.items}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Warranty Section */}
                  {(() => {
                    const warranty = (product.product_fields as any)?.warranty
                    if (warranty) {
                      return (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Warranty</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-700">
                            <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>{warranty} years warranty</span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                

                  {/* Dimensions Section */}
                  {(() => {
                    const dimensions = (product.product_fields as any)?.dimensions
                    if (dimensions && typeof dimensions === 'object') {
                      return (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Dimensions</h4>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-gray-600">Depth</div>
                              <div className="font-medium text-gray-900">{dimensions.depth}mm</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-gray-600">Width</div>
                              <div className="font-medium text-gray-900">{dimensions.widht || dimensions.width}mm</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-gray-600">Height</div>
                              <div className="font-medium text-gray-900">{dimensions.height}mm</div>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

      {/* Power Selection */}
      {(() => {
                    const powerOptions = getPowerAndPriceOptions(product)
                    if (powerOptions.length > 0) {
                      const selectedPower = getSelectedPowerOption(product)
                      return (
                        <div className="mb-4">
                          <div className="flex gap-2">
                            {powerOptions.map((option) => {
                              const isSelected = selectedPower?.power === option.power
                              const selectedPrice = selectedPower ? selectedPower.price : powerOptions[0].price
                              const priceDifference = option.price - selectedPrice
                              return (
                                <button
                                  key={option.power}
                                  onClick={() => selectPowerOption(product, option)}
                                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isSelected
                                      ? 'bg-gray-900 text-white'
                                      : 'bg-white text-gray-900 border border-gray-300 hover:border-gray-400'
                                  }`}
                                >
                                  <div className="text-center">
                                    <div>{option.power}kW</div>
                                    {!isSelected && priceDifference !== 0 && (
                                      <div className={`text-xs ${priceDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {priceDifference > 0 ? '+' : '-'}£{Math.abs(priceDifference)}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Pricing - Moved here right below power selection */}
                  {(() => {
                    const powerOptions = getPowerAndPriceOptions(product)
                    if (powerOptions.length > 0) {
                      const currentPrice = getCurrentPrice(product)
                      return (
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Fixed price (inc. VAT)</span>
                            <span className="text-lg font-bold text-gray-900">
                              £{currentPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">or, monthly from</span>
                            <button
                              onClick={() => openFinanceCalculator(product)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <span className="text-sm font-semibold">
                                {(() => {
                                  const monthlyPayment = getMonthlyPayment(product)
                                  if (monthlyPayment) {
                                    return `£${monthlyPayment.toFixed(2)}`
                                  }
                                  return `£${(currentPrice / 12).toFixed(2)}`
                                })()}
                              </span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    } else if (typeof product.price === 'number') {
                      // Fallback for products without power options
                      return (
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Fixed price (inc. VAT)</span>
                            <span className="text-lg font-bold text-gray-900">
                              £{product.price.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">or, monthly from</span>
                            <button
                              onClick={() => openFinanceCalculator(product)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <span className="text-sm font-semibold">
                                {(() => {
                                  const monthlyPayment = getMonthlyPayment(product)
                                  if (monthlyPayment) {
                                    return `£${monthlyPayment.toFixed(2)}`
                                  }
                                  return `£${(product.price / 12).toFixed(2)}`
                                })()}
                              </span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Action Links */}
                  <div className="space-y-3">
                    <button 
                      onClick={() => openWhatsIncluded(product)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      What's included in my installation?
                    </button>
                    
                    {/* Primary Action Button */}
                    <button
                      className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                      onClick={() => persistProductAndGo(product)}
                    >
                      Continue with this
                    </button>
                    

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>



      {/* FAQs at bottom */}
      <ProductFaqs faqs={partnerSettings?.faqs || null} brandColor={brandColor} />

      {/* Finance Calculator Modal */}
      {showFinanceCalculator && selectedProductForFinance && (
        <FinanceCalculator
          isOpen={showFinanceCalculator}
          onClose={closeFinanceCalculator}
          productPrice={getCurrentPrice(selectedProductForFinance)}
          productName={selectedProductForFinance.name}
          aprSettings={partnerSettings?.apr_settings || null}
          brandColor={brandColor}
          selectedPlan={getSelectedPlan(selectedProductForFinance)}
          selectedDeposit={getSelectedDeposit(selectedProductForFinance)}
          onPlanChange={(plan) => {
            setSelectedPlans(prev => ({
              ...prev,
              [selectedProductForFinance.partner_product_id]: plan
            }))
            // Recalculate monthly payment with new plan
            const currentPrice = getCurrentPrice(selectedProductForFinance)
            const depositPercentage = getSelectedDeposit(selectedProductForFinance)
            const monthlyPayment = calculateMonthlyPaymentWithDeposit(currentPrice, plan.apr, plan.months, depositPercentage)
            setMonthlyPayments(prev => ({
              ...prev,
              [selectedProductForFinance.partner_product_id]: monthlyPayment
            }))
          }}
          onDepositChange={(deposit) => {
            setSelectedDeposits(prev => ({
              ...prev,
              [selectedProductForFinance.partner_product_id]: deposit
            }))
            // Recalculate monthly payment with new deposit
            const currentPrice = getCurrentPrice(selectedProductForFinance)
            const selectedPlan = getSelectedPlan(selectedProductForFinance)
            if (selectedPlan) {
              const monthlyPayment = calculateMonthlyPaymentWithDeposit(currentPrice, selectedPlan.apr, selectedPlan.months, deposit)
              setMonthlyPayments(prev => ({
                ...prev,
                [selectedProductForFinance.partner_product_id]: monthlyPayment
              }))
            }
          }}
          onMonthlyPaymentUpdate={(monthlyPayment) => {
            setMonthlyPayments(prev => ({
              ...prev,
              [selectedProductForFinance.partner_product_id]: monthlyPayment
            }))
          }}
        />
      )}

      {/* What's Included Modal */}
      {showWhatsIncluded && selectedProductForWhatsIncluded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">What's Included in Your Installation</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedProductForWhatsIncluded.name}</p>
                </div>
                <button
                  onClick={closeWhatsIncluded}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* What's Included Items */}
              {(() => {
                const includedItems = (selectedProductForWhatsIncluded.product_fields as any)?.what_s_included
                
                if (Array.isArray(includedItems) && includedItems.length > 0) {
                  return (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {includedItems.map((item: any, index: number) => {
                        const itemData = item.items || item
                        const { image, title, subtitle } = itemData
                        return (
                          <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                            {image && (
                              <img 
                                src={image} 
                                alt={title} 
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{title}</h4>
                              {subtitle && (
                                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }
                
                return (
                  <div className="text-center py-8 text-gray-500">
                    No specific items listed for this product.
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* User Info Section at Bottom */}
      {submissionInfo && (
        <div className="bg-white border-t mt-10">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Quote Details</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Name</p>
                  <p className="text-gray-900">{submissionInfo.first_name} {submissionInfo.last_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-gray-900">{submissionInfo.email}</p>
                </div>
                {submissionInfo.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone</p>
                    <p className="text-gray-900">{submissionInfo.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Postcode</p>
                  <p className="text-gray-900">{submissionInfo.postcode}</p>
                </div>
                {submissionInfo.city && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">City</p>
                    <p className="text-gray-900">{submissionInfo.city}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Submission Date</p>
                  <p className="text-gray-900">
                    {new Date(submissionInfo.submission_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              {/* Form Answers Summary */}
              {submissionInfo.form_answers && submissionInfo.form_answers.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Your Requirements</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {submissionInfo.form_answers.slice(0, 6).map((answer, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border">
                        <p className="text-xs font-medium text-gray-600 mb-1">{answer.question_text}</p>
                        <p className="text-sm text-gray-900">
                          {Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                  {submissionInfo.form_answers.length > 6 && (
                    <p className="text-xs text-gray-500 mt-2">
                      +{submissionInfo.form_answers.length - 6} more requirements
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BoilerProductsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BoilerProductsContent />
    </Suspense>
  )
}


