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
import { ProductsLoader } from '@/components/category-commons/Loader'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, ShieldCheck, Droplets, Flame, Box, ChevronDown } from 'lucide-react'

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

interface FormQuestion {
  question_id: string
  question_text: string
  is_multiple_choice: boolean
  answer_options: Array<{
    text: string
    image?: string
    hasAdditionalCost?: boolean
    additionalCost?: number
  }> | null
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
  const [questionDetails, setQuestionDetails] = useState<Record<string, FormQuestion>>({})
  const [showFinanceCalculator, setShowFinanceCalculator] = useState(false)
  const [selectedProductForFinance, setSelectedProductForFinance] = useState<PartnerProduct | null>(null)
  const [selectedPowerOptions, setSelectedPowerOptions] = useState<Record<string, PowerAndPrice>>({})
  const [selectedPlans, setSelectedPlans] = useState<Record<string, { months: number; apr: number }>>({})
  const [selectedDeposits, setSelectedDeposits] = useState<Record<string, number>>({})
  const [monthlyPayments, setMonthlyPayments] = useState<Record<string, number>>({})
  const [showWhatsIncluded, setShowWhatsIncluded] = useState(false)
  const [selectedProductForWhatsIncluded, setSelectedProductForWhatsIncluded] = useState<PartnerProduct | null>(null)
  const [isContinuing, setIsContinuing] = useState(false)

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

  // Helper function to fetch question details for cost calculation
  const fetchQuestionDetails = async (questionIds: string[]) => {
    if (questionIds.length === 0) return;
    
    try {
      const { data: questions, error } = await supabase
        .from('FormQuestions')
        .select('question_id, question_text, is_multiple_choice, answer_options')
        .in('question_id', questionIds);
      
      if (error) {
        console.error('Error fetching question details:', error);
        return;
      }
      
      const questionMap = questions?.reduce((acc, question) => {
        acc[question.question_id] = question as FormQuestion;
        return acc;
      }, {} as Record<string, FormQuestion>) || {};
      
      setQuestionDetails(prev => ({ ...prev, ...questionMap }));
    } catch (error) {
      console.error('Error fetching question details:', error);
    }
  };

  // Helper function to get cost for a specific answer
  const getAnswerCost = (questionId: string, answer: string | string[]): number => {
    const question = questionDetails[questionId];
    if (!question || !question.is_multiple_choice || !question.answer_options) {
      return 0;
    }
    
    const answers = Array.isArray(answer) ? answer : [answer];
    let totalCost = 0;
    
    answers.forEach(answerText => {
      const option = question.answer_options?.find(opt => opt.text === answerText);
      if (option?.hasAdditionalCost && option.additionalCost) {
        totalCost += option.additionalCost;
      }
    });
    
    return totalCost;
  };

  // Helper function to get total cost from all answers
  const getTotalAnswersCost = (): number => {
    if (!submissionInfo?.form_answers) return 0;
    
    return submissionInfo.form_answers.reduce((total, answer) => {
      return total + getAnswerCost(answer.question_id, answer.answer);
    }, 0);
  };
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
    // If user has explicitly selected a plan, use that
    if (selectedPlans[product.partner_product_id]) {
      return selectedPlans[product.partner_product_id]
    }
    
    // Otherwise, use default plan from partner settings
    if (partnerSettings?.apr_settings) {
      const availableTerms = Object.keys(partnerSettings.apr_settings).map(Number).sort((a, b) => a - b)
      if (availableTerms.length > 0) {
        const defaultTerm = availableTerms[0] // Use the shortest term as default
        const defaultApr = partnerSettings.apr_settings[defaultTerm]
        return { months: defaultTerm, apr: defaultApr }
      }
    }
    
    return null
  }

  const getSelectedDeposit = (product: PartnerProduct): number => {
    // If user has explicitly selected a deposit, use that
    if (selectedDeposits[product.partner_product_id] !== undefined) {
      return selectedDeposits[product.partner_product_id]
    }
    
    // Otherwise, use default deposit (0%)
    return 0
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

  const handleRestart = () => {
    // Redirect to the boiler quote page to restart the journey
    const url = new URL('/boiler/quote', window.location.origin)
    window.location.href = url.toString()
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
    setIsContinuing(true)
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
          image_url: product.image_url,
        },
        calculator_info: {
          selected_plan: selectedPlan,
          selected_deposit: selectedDeposit,
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
            image_url: product.image_url,
          },
          calculator_info: {
            selected_plan: selectedPlan,
            selected_deposit: selectedDeposit,
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
        .select('cart_state, product_info, calculator_info, progress_step, last_seen_at')
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
          calculatorInfo: verifyData.calculator_info
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

  // Persist selected product (with snapshot) in partner_leads.cart_state and go to survey
  const persistProductAndGoToSurvey = async (product: PartnerProduct) => {
    setIsContinuing(true)
    try {
      console.log('persistProductAndGoToSurvey called with:', { 
        submissionId, 
        partnerUserId: partnerInfo?.user_id,
        productId: product.partner_product_id,
        productName: product.name
      })
      
      if (!submissionId) {
        console.warn('No submissionId found - redirecting to survey without saving product data')
        setIsContinuing(false)
        const url = new URL('/boiler/survey', window.location.origin)
        window.location.href = url.toString()
        return
      }

      if (!partnerInfo?.user_id) {
        console.warn('No partnerInfo.user_id found - redirecting to survey without saving product data')
        setIsContinuing(false)
        const url = new URL('/boiler/survey', window.location.origin)
        url.searchParams.set('submission', submissionId)
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
          image_url: product.image_url,
        },
        calculator_info: {
          selected_plan: selectedPlan,
          selected_deposit: selectedDeposit,
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
            image_url: product.image_url,
          },
          calculator_info: {
            selected_plan: selectedPlan,
            selected_deposit: selectedDeposit,
          },
          progress_step: 'survey',
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
      
      console.log('Successfully saved product to database for survey (progress_step: survey):', {
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
        .select('cart_state, product_info, calculator_info, progress_step, last_seen_at')
        .eq('submission_id', submissionId)
        .single()
      
      if (verifyError) {
        console.error('Database update successful but verification failed:', verifyError)
      } else {
        console.log('Database update successful for survey - verification:', {
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
          calculatorInfo: verifyData.calculator_info
        })
      }
      
      const url = new URL('/boiler/survey', window.location.origin)
      url.searchParams.set('submission', submissionId)
      window.location.href = url.toString()
    } catch (e) {
      console.error('Failed to persist product selection for survey:', e)
      const fallback = new URL('/boiler/survey', window.location.origin)
      if (submissionId) fallback.searchParams.set('submission', submissionId)
      window.location.href = fallback.toString()
    } finally {
      setIsContinuing(false)
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
        <ProductsLoader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <CardTitle className="text-lg font-medium text-gray-900 mb-2">Unable to load products</CardTitle>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                style={{ backgroundColor: brandColor }}
                className="hover:opacity-90"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
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
        onRestart={handleRestart}
      />

      {/* Products Grid */}
      <main className="max-w-[1500px] mx-auto px-6 py-8">
        {displayProducts.length === 0 ? (
          <Card className="p-10 text-center text-gray-600">
            No products match your filters.
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {displayProducts.map((product) => (
              <div key={product.partner_product_id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Product Header */}
                <div className="relative p-0">
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
                    className="bg-gray-100 p-2 pt-5"
                  />

<div className="p-5">

    {/* Highlighted Features as Badges */}
    {(() => {
                    const highlightedFeatures = (product.product_fields as any)?.highlighted_features
                    if (Array.isArray(highlightedFeatures) && highlightedFeatures.length > 0) {
                      return (
                        <div className="absolute top-0 left-0 p-5">
                          <div className="flex flex-wrap gap-2">
                            {highlightedFeatures.map((feature: any, index: number) => {
                              const featureText = typeof feature === 'string' ? feature : feature.name || JSON.stringify(feature)
                              return (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-white px-3 py-1"
                                  style={{ backgroundColor: brandColor }}
                                >
                                  {featureText}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Brand Logo */}
                  <div className="text-sm font-semibold text-gray-600 mb-2">
                    {product.name.split(' ')[0].toUpperCase()}
                  </div>

                  {/* Product Name */}
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-2xl font-semibold text-gray-900">{product.name}</h3>
                  </div>

            
                 

                  {/* Description */}
                  {product.description && (
                                          <p className="text-base text-gray-700 mb-4">{product.description}</p>

                  )}

           

                

                  {/* Specifications Section */}
                  {(() => {
                    const specs = (product.product_fields as any)?.specs
                    if (Array.isArray(specs) && specs.length > 0) {
                      return (
                        <div className="mb-4">
                          <div className="space-y-1">
                            {specs.map((spec: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-base text-gray-700">
                                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 bg-gray-100 rounded-full p-1" strokeWidth={4} />
                                <span>{spec.items}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}


                        {/* Product Specifications */}
                        {(() => {
                          const warranty = (product.product_fields as any)?.warranty
                          const flow_rate = (product.product_fields as any)?.flow_rate
                          const heating_output = (product.product_fields as any)?.heating_output
                          const powerOptions = getPowerAndPriceOptions(product)
                          const selectedPower = getSelectedPowerOption(product)
                          
                          const specs = []
                          
                          if (warranty) {
                            specs.push({
                              label: "Warranty",
                              value: `${warranty} Years`,
                              icon: ShieldCheck
                            })
                          }
                          
                          if (flow_rate) {
                            specs.push({
                              label: "Hot water flow rate",
                              value: `${flow_rate} litres / min`,
                              icon: Droplets
                            })
                          }
                          
                          if (heating_output) {
                            specs.push({
                              label: "Central heating output",
                              value: `${heating_output} kW`,
                              icon: Flame
                            })
                          }
                          
                          if (selectedPower) {
                            specs.push({
                              label: "Power",
                              value: `${selectedPower.power} kW`,
                              icon: Flame
                            })
                          }
                          
                          if (specs.length > 0) {
                            return (
                              <div className="mb-2 px-3 py-2 bg-gray-100 rounded-lg">
                                {specs.map((spec, index) => (
                                  <div key={index} className="text-sm flex flex-wrap gap-1 items-center justify-between py-1.5 border-b border-gray-100 last:border-b-0">
                                    <div className="flex items-center gap-2">
                                      <spec.icon className="w-5 h-5 text-gray-400" />
                                      <span className="text-gray-600">{spec.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-900">{spec.value}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          }
                          return null
                        })()}

                        {/* Dimensions Section - Outside specifications */}
                        {(() => {
                          const dimensions = (product.product_fields as any)?.dimensions
                          if (dimensions && typeof dimensions === 'object') {
                            return (
                              <div className="mb-4 px-3 py-2 bg-gray-100 rounded-lg">
                                <div className="flex items-center gap-2 text-sm justify-center">
                                  <Box className="w-5 h-5 text-gray-400" />
                                  <span className="text-gray-900">
                                    W {dimensions.width || dimensions.widht}mm x D {dimensions.depth}mm x H {dimensions.height}mm
                                  </span>
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
                                <Button
                                  key={option.power}
                                  onClick={() => selectPowerOption(product, option)}
                                  variant={isSelected ? "default" : "outline"}
                                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium"
                                >
                                  <div className="text-center">
                                    <div>{option.power}kW</div>
                                    {!isSelected && priceDifference !== 0 && (
                                      <div className={`text-xs ${priceDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {priceDifference > 0 ? '+' : '-'}£{Math.abs(priceDifference)}
                                      </div>
                                    )}
                                  </div>
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Pricing Section */}
                  {(() => {
                    const powerOptions = getPowerAndPriceOptions(product)
                    const currentPrice = powerOptions.length > 0 ? getCurrentPrice(product) : (typeof product.price === 'number' ? product.price : 0)
                    const monthlyPayment = getMonthlyPayment(product) || (currentPrice / 12)
                    
                    if (currentPrice > 0) {
                      return (
                        <div className="mb-6 border border-gray-200 rounded-lg bg-gray-100">
                          <div className="flex items-end justify-between p-4 bg-white">
                            {/* Left Section - Fixed Price */}
                            <div className="border-r border-gray-200 pr-4 w-1/2 flex flex-col items-center justify-center">
                              <p className="text-xs text-gray-600 mb-1">Fixed price (inc. VAT)</p>
                              <div className="flex items-end gap-2">
                                <span className="text-xl font-medium text-gray-900">£{currentPrice.toFixed(2)}</span>
                                <span className="text-xs text-red-500 line-through">£{(currentPrice + 250).toFixed(2)}</span>
                              </div>
                            </div>
                            
                            {/* Right Section - Monthly Price */}
                            <div className="text-left w-1/2 flex flex-col items-center justify-center">
                              <p className="text-xs text-gray-600 mb-1">or, monthly from</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-medium text-gray-900">£{monthlyPayment.toFixed(0)}</span>
                                <button
                                  onClick={() => openFinanceCalculator(product)}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                  title="Open Finance Calculator"
                                >
                                  <ChevronDown size={16} className="text-gray-600" />
                                </button>
                              </div>
                            </div>

                          </div>
                          <span 
                          
                            onClick={() => openWhatsIncluded(product)}
                            className="text-sm text-gray-600 hover:text-gray-800 underline font-medium p-3 h-auto bg-gray-100 w-full text-center justify-center flex cursor-pointer"
                          >
                            What's included in my installation?
                          </span>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Action Links */}
                  <div className="space-y-3">
                   
                    
                    {/* Primary Action Button */}
                    <Button
                      className={`w-full py-3 px-4 font-semibold transition-colors flex items-center justify-center gap-2 ${isContinuing ? 'opacity-75 cursor-not-allowed' : 'hover:opacity-90'}`}
                      onClick={() => persistProductAndGo(product)}
                      disabled={isContinuing}
                      style={{ backgroundColor: brandColor }}
                    >
                      {isContinuing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading...
                        </>
                      ) : (
                        
                        'Book and pick install date'
                      )}
                    </Button>

                    {/* Survey Button */}
                    <Button
                      variant="outline"
                      className={`w-full py-3 px-4 font-medium transition-colors border-gray-300 text-gray-700 hover:bg-gray-50 ${isContinuing ? 'opacity-75 cursor-not-allowed' : ''}`}
                      onClick={() => persistProductAndGoToSurvey(product)}
                      disabled={isContinuing}
                    >
                      {isContinuing ? 'Loading...' : 'or, book a call to discuss'}
                    </Button>
                  </div>
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
        <Dialog open={showWhatsIncluded} onOpenChange={setShowWhatsIncluded}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>What's Included in Your Installation</DialogTitle>
              <DialogDescription>
                {selectedProductForWhatsIncluded.name}
              </DialogDescription>
            </DialogHeader>
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
                          <Card key={index} className="p-4 bg-gray-50">
                            <CardContent className="flex items-start gap-3 p-0">
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
                            </CardContent>
                          </Card>
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
          </DialogContent>
        </Dialog>
      )}

      {/* User Info Section at Bottom */}
      {submissionInfo && (
        <div className="bg-white border-t mt-10">
          <div className="max-w-[1500px] mx-auto px-6 py-8">
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Your Quote Details</CardTitle>
              </CardHeader>
              <CardContent>
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
                        <Card key={index} className="p-3">
                          <CardContent className="p-0">
                            <p className="text-xs font-medium text-gray-600 mb-1">{answer.question_text}</p>
                            <p className="text-sm text-gray-900">
                              {Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {submissionInfo.form_answers.length > 6 && (
                      <p className="text-xs text-gray-500 mt-2">
                        +{submissionInfo.form_answers.length - 6} more requirements
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Mobile Survey Button - Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <button
          className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
          disabled={isContinuing}
          onClick={() => {
            // For mobile, we need to handle the case where no specific product is selected
            // We'll just redirect to survey without storing product data
            const surveyUrl = new URL('/boiler/survey', window.location.origin)
            if (submissionId) {
              surveyUrl.searchParams.set('submission', submissionId)
            }
            window.location.href = surveyUrl.toString()
          }}
        >
          {isContinuing ? 'Loading...' : 'Get a Quote'}
        </button>
      </div>

      {/* Bottom padding for mobile fixed button */}
      <div className="lg:hidden h-20"></div>
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


