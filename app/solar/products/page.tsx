'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import ProductHeaderTile from '@/components/category-commons/product/ProductHeaderTile'
import ProductFaqs from '@/components/category-commons/product/ProductFaqs'
import UserInfoSection from '@/components/category-commons/product/UserInfoSection'
import ReviewSection from '@/components/category-commons/product/ReviewSection'
import MainCTA from '@/components/category-commons/product/MainCTA'
import FinanceCalculator from '@/components/FinanceCalculator'
import ImageGallery from '@/components/ImageGallery'
import { resolvePartnerByHost } from '@/lib/partner'
import ProductLoadingSteps from '@/components/category-commons/product/ProductLoadingSteps'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, ShieldCheck, Droplets, Flame, Box, ChevronDown } from 'lucide-react'
import IframeNavigationTracker from '@/components/IframeNavigationTracker'

// Number formatting utility
const formatPrice = (price: number, showDecimals: boolean = true): string => {
  if (showDecimals) {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  } else {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }
}

// Specifications Dropdown Component
const SpecificationsDropdown = ({ specs }: { specs: any[] }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="mb-2 mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-green-500" strokeWidth={2} />
          <span className="text-sm font-medium text-gray-700">
            Specifications ({specs.length})
          </span>
    </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {isOpen && (
        <div className="mt-2 space-y-1 border border-gray-200 rounded-lg bg-white p-3">
          {specs.map((spec: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" strokeWidth={2} />
              <span>{spec.items}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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
    const { error } = await supabase
      .from('lead_submission_data')
      .upsert({
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
      }, {
        onConflict: 'submission_id'
      });

    if (error) {
      console.error('Error saving lead submission data:', error);
    } else {
      console.log('Successfully saved lead submission data for page:', currentPage);
    }
  } catch (error) {
    console.error('Error in saveLeadSubmissionData:', error);
  }
};

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


interface PartnerSettings {
  setting_id: string
  partner_id: string
  service_category_id: string
  apr_settings: Record<number, number> | null
  otp_enabled: boolean | null
  included_items: Array<any> | null
  non_included_items: Array<any> | null
  faqs: Array<any> | null
  review_section?: {
    enabled: boolean
    title: string
    subtitle?: string
    reviews: {
      id: string
      name: string
      rating: number
      text: string
    }[]
    buttonText?: string
    buttonUrl?: string
    buttonDescription?: string
  }
  main_cta?: {
    enabled: boolean
    title: string
    subtitle?: string
    button_text: string
    button_url?: string
    background_color?: string
    text_color?: string
  }
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

function SolarProductsContent() {
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
  const [selectedPlans, setSelectedPlans] = useState<Record<string, { months: number; apr: number }>>({})
  const [selectedDeposits, setSelectedDeposits] = useState<Record<string, number>>({})
  const [monthlyPayments, setMonthlyPayments] = useState<Record<string, number>>({})
  const [showWhatsIncluded, setShowWhatsIncluded] = useState(false)
  const [selectedProductForWhatsIncluded, setSelectedProductForWhatsIncluded] = useState<PartnerProduct | null>(null)
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [isHorizontalLayout, setIsHorizontalLayout] = useState(true)
  const [pageStartTime, setPageStartTime] = useState<number>(Date.now())
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [panelCount, setPanelCount] = useState(9)
  
  // Product pagination states
  const [visibleProductsCount, setVisibleProductsCount] = useState(6)
  const productsPerBatch = 6

  // Filters
  const [filterSystemSize, setFilterSystemSize] = useState<string | null>(null)
  const [filterBedroom, setFilterBedroom] = useState<string | null>(null)
  const [filterBathroom, setFilterBathroom] = useState<string | null>(null)
  // Prefill baseline captured from submission answers
  const [prefillSystemSize, setPrefillSystemSize] = useState<string | null>(null)
  const [prefillBedroom, setPrefillBedroom] = useState<string | null>(null)
  const [prefillBathroom, setPrefillBathroom] = useState<string | null>(null)

  // Read submission id to persist context (if present)
  const submissionId = searchParams?.get('submission') ?? null
  
  // Debug logging
  console.log('Solar products page - submissionId from URL:', submissionId)
  console.log('Solar products page - all search params:', Object.fromEntries(searchParams?.entries() || []))

  // Resolve brand color and classes
  const brandColor = partnerInfo?.company_color || '#2563eb'
  const classes = useDynamicStyles(brandColor)



  // Helper function to get system capacity based on panel count and power per panel
  const getSystemCapacity = (product: PartnerProduct): string => {
    const priceAndPower = (product.product_fields as any)?.price_and_power_per_panels
    if (priceAndPower && priceAndPower.power) {
      const powerPerPanel = parseFloat(priceAndPower.power)
      const totalPower = (powerPerPanel * panelCount).toFixed(1)
      return `${totalPower}kW System (${panelCount} panels)`
    }
    // Fallback to default calculation
    return `${(panelCount * 0.45).toFixed(1)}kW System (${panelCount} panels)`
  }

  const getCurrentPrice = (product: PartnerProduct): number => {
    // Calculate price based on panel count and price_and_power_per_panels
    const priceAndPower = (product.product_fields as any)?.price_and_power_per_panels
    if (priceAndPower && priceAndPower.price && parseFloat(priceAndPower.price) > 0) {
      const panelPrice = parseFloat(priceAndPower.price)
      const basePrice = panelPrice * panelCount
      
      // Add additional costs from form answers
      const additionalCosts = getTotalAnswersCost()
      return basePrice + additionalCosts
    }
    
    // Fallback to product price
    const basePrice = product.price || 0
    const additionalCosts = getTotalAnswersCost()
    return basePrice + additionalCosts
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
        const typedQuestion = question as { question_id: string } & FormQuestion;
        acc[typedQuestion.question_id] = typedQuestion;
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
    
    // Convert object to array if it's not already an array
    const answersArray = Array.isArray(submissionInfo.form_answers) 
      ? submissionInfo.form_answers 
      : Object.values(submissionInfo.form_answers)
    
    return answersArray.reduce((total: number, answer: any) => {
      return total + getAnswerCost(answer.question_id, answer.answer);
    }, 0);
  };

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

  // Helper function to build product data structure for tracking
  const buildProductData = (product: PartnerProduct, isSelected: boolean = false) => {
    const currentPrice = getCurrentPrice(product)
    const monthlyPayment = getMonthlyPayment(product)
    const selectedPlan = getSelectedPlan(product)
    const selectedDeposit = getSelectedDeposit(product)
    
    // Extract warranty from specifications
    const warranty = (product.specifications as any)?.warranty || 
                    (product.specifications as any)?.warranty_years || 
                    (product.specifications as any)?.guarantee || 
                    'Not specified'
    
    return {
      product_id: product.partner_product_id,
      name: product.name,
      price: currentPrice,
      monthly_price: monthlyPayment,
      capacity: getSystemCapacity(product),
      panel_count: panelCount,
      warranty: warranty,
      image_url: product.image_url,
      description: product.description,
      is_selected: isSelected,
      selected_at: isSelected ? new Date().toISOString() : null,
      calculator_settings: {
        selected_plan: selectedPlan,
        selected_deposit: selectedDeposit,
        monthly_payment: monthlyPayment
      },
      specifications: product.specifications
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

  // Fetch solar service category id and then load products
  useEffect(() => {
    async function loadProducts() {
      if (!partnerInfo?.user_id) return
      setLoading(true)
      setError(null)

      try {
        // Get solar category id
        const { data: category, error: categoryError } = await supabase
          .from('ServiceCategories')
          .select('service_category_id')
          .eq('slug', 'solar')
          .eq('is_active', true)
          .single()

        if (categoryError || !category) {
          throw new Error('Solar category not found')
        }

        const { data: partnerProducts, error: productsError } = await supabase
          .from('PartnerProducts')
          .select('*')
          .eq('partner_id', partnerInfo.user_id)
          .eq('service_category_id', category.service_category_id as string)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (productsError) {
          throw productsError
        }

        setProducts((partnerProducts || []) as unknown as PartnerProduct[])

        // Fetch Partner Settings for this partner + service category
        const { data: settings, error: settingsError } = await supabase
          .from('PartnerSettings')
          .select('*')
          .eq('partner_id', partnerInfo.user_id)
          .eq('service_category_id', category.service_category_id as string)
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
          setSubmissionInfo(partnerLead as unknown as QuoteSubmission)
          
          // Fetch question details for cost calculation
          const formAnswers = partnerLead.form_answers as any
          const answersArray = Array.isArray(formAnswers) 
            ? formAnswers 
            : Object.values(formAnswers) as Array<{ question_id: string; question_text: string; answer: string | string[] }>
          
          const questionIds = answersArray.map(a => a.question_id)
          if (questionIds.length > 0) {
            fetchQuestionDetails(questionIds)
          }
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
          setSubmissionInfo(submission as unknown as QuoteSubmission)
          
          // Fetch question details for cost calculation
          const formAnswers = submission.form_answers as any
          const answersArray = Array.isArray(formAnswers) 
            ? formAnswers 
            : Object.values(formAnswers) as Array<{ question_id: string; question_text: string; answer: string | string[] }>
          
          const questionIds = answersArray.map(a => a.question_id)
          if (questionIds.length > 0) {
            fetchQuestionDetails(questionIds)
          }
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
      // Calculate initial monthly payment for products
      if (typeof product.price === 'number' && product.price > 0 && partnerSettings?.apr_settings) {
        const selectedPlan = getSelectedPlan(product)
        const availableTerms = Object.keys(partnerSettings.apr_settings).map(Number).sort((a, b) => a - b)
        if (availableTerms.length > 0) {
          const term = selectedPlan?.months || availableTerms[0]
          const apr = partnerSettings.apr_settings[term]
          if (apr && apr > 0) {
            const depositPercentage = getSelectedDeposit(product)
            const additionalCosts = getTotalAnswersCost()
            const totalPrice = getCurrentPrice(product)
            const monthlyPayment = calculateMonthlyPaymentWithDeposit(totalPrice, apr, term, depositPercentage)
            setMonthlyPayments(prev => ({
              ...prev,
              [product.partner_product_id]: monthlyPayment
            }))
          }
        }
      }
      
      return { ...product }
    })
  }, [products, panelCount, partnerSettings])

  // Normalization helpers for filtering
  const normalizeNumberToBucket = (value: any, cap: number): string | null => {
    if (value === null || value === undefined) return null
    
    // Handle object format with text property
    let raw: string
    if (typeof value === 'object' && value.text) {
      raw = String(value.text).toLowerCase().trim()
    } else if (Array.isArray(value)) {
      // Handle array of objects or strings
      const firstItem = value[0]
      if (typeof firstItem === 'object' && firstItem.text) {
        raw = String(firstItem.text).toLowerCase().trim()
      } else {
        raw = String(firstItem).toLowerCase().trim()
      }
    } else {
      raw = String(value).toLowerCase().trim()
    }
    
    if (!raw) return null
    
    // Handle "plus" or "+" indicators
    if (raw.includes('+') || raw.includes('plus')) {
      const n = parseInt(raw.replace(/[^0-9]/g, ''), 10)
      if (!Number.isNaN(n)) return `${n}+`
    }
    
    // Extract first number found
    const match = raw.match(/\d+/)
    if (match) {
      const n = parseInt(match[0], 10)
      if (!Number.isNaN(n)) {
        return n >= cap ? `${cap}+` : String(n)
      }
    }
    
    // Handle text representations of numbers
    const textNumbers: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6,
      'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    }
    
    for (const [text, num] of Object.entries(textNumbers)) {
      if (raw.includes(text)) {
        return num >= cap ? `${cap}+` : String(num)
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

  const getSystemSizes = (product: PartnerProduct): string[] => {
    const raw = (product.product_fields as any)?.system_size || (product.product_fields as any)?.capacity || (product.product_fields as any)?.system_capacity
    if (!raw) return []
    const arr = Array.isArray(raw) ? raw : [raw]
    return arr
      .map((v) => String(v).toLowerCase().trim())
      .filter(Boolean)
  }

  const normalizeSystemSizeAnswer = (value: any): string | null => {
    console.log('normalizeSystemSizeAnswer input:', { value, type: typeof value, isArray: Array.isArray(value) })
    
    if (value === null || value === undefined) return null
    
    // Handle object format with text property
    let raw: string
    if (typeof value === 'object' && value.text) {
      raw = String(value.text).toLowerCase().trim()
      console.log('normalizeSystemSizeAnswer - object with text:', raw)
    } else if (Array.isArray(value)) {
      // Handle array of objects or strings
      const firstItem = value[0]
      if (typeof firstItem === 'object' && firstItem.text) {
        raw = String(firstItem.text).toLowerCase().trim()
        console.log('normalizeSystemSizeAnswer - array with object:', raw)
      } else {
        raw = String(firstItem).toLowerCase().trim()
        console.log('normalizeSystemSizeAnswer - array with string:', raw)
      }
    } else {
      raw = String(value).toLowerCase().trim()
      console.log('normalizeSystemSizeAnswer - simple string:', raw)
    }
    
    if (!raw) {
      console.log('normalizeSystemSizeAnswer - empty raw value')
      return null
    }
    
    // Extract kW capacity from the answer
    const kwMatch = raw.match(/(\d+(?:\.\d+)?)\s*kw/i)
    if (kwMatch) {
      const kw = parseFloat(kwMatch[1])
      if (kw <= 3) return 'small'
      if (kw <= 6) return 'medium'
      if (kw <= 10) return 'large'
      return 'extra-large'
    }
    
    // Try to match common variations
    if (raw.includes('small') || raw.includes('3kw') || raw.includes('3 kw')) {
      console.log('normalizeSystemSizeAnswer - matched small')
      return 'small'
    }
    if (raw.includes('medium') || raw.includes('6kw') || raw.includes('6 kw')) {
      console.log('normalizeSystemSizeAnswer - matched medium')
      return 'medium'
    }
    if (raw.includes('large') || raw.includes('10kw') || raw.includes('10 kw')) {
      console.log('normalizeSystemSizeAnswer - matched large')
      return 'large'
    }
    if (raw.includes('extra') || raw.includes('15kw') || raw.includes('15 kw')) {
      console.log('normalizeSystemSizeAnswer - matched extra-large')
      return 'extra-large'
    }
    
    console.log('normalizeSystemSizeAnswer - no match found for:', raw)
    return null
  }

  // Derive prefill values from submission answers when they load
  useEffect(() => {
    const answers = submissionInfo?.form_answers
    if (!answers) {
      setPrefillBathroom(null)
      setPrefillBedroom(null)
      setPrefillSystemSize(null)
      return
    }

    // Convert object to array if it's not already an array
    const answersArray = Array.isArray(answers) 
      ? answers 
      : Object.values(answers) as Array<{ question_id: string; question_text: string; answer: string | string[] }>

    // Debug logging - show all available questions and answers
    const allQuestions = answersArray.map(a => ({ 
      question_id: a.question_id, 
      question_text: a.question_text, 
      answer: a.answer,
      answerType: typeof a.answer,
      isArray: Array.isArray(a.answer)
    }))
    console.log('Prefill Debug - All available questions:', allQuestions)

    // Find questions by text content (more robust than hardcoded IDs)
    const findQuestionByText = (searchTerms: string[]) => {
      return answersArray.find((a) => 
        searchTerms.some(term => 
          a.question_text.toLowerCase().includes(term.toLowerCase())
        )
      )
    }

    // Try multiple search terms for each question type
    const bathroomQuestion = findQuestionByText(['bathroom', 'bath', 'shower', 'toilet'])
    const bedroomQuestion = findQuestionByText(['bedroom', 'bed', 'room'])
    
    // Search for system size/capacity questions
    const systemSizeQuestion = findQuestionByText(['system size', 'capacity', 'kw', 'kilowatt', 'solar system size', 'panel capacity'])

    const bathroomAns = bathroomQuestion?.answer
    const bedroomAns = bedroomQuestion?.answer
    const sizeAns = systemSizeQuestion?.answer

    // Debug logging
    const foundQuestions = {
      bathroomQuestion: bathroomQuestion ? { 
        question_id: bathroomQuestion.question_id,
        question_text: bathroomQuestion.question_text, 
        answer: bathroomQuestion.answer,
        answerType: typeof bathroomQuestion.answer
      } : null,
      bedroomQuestion: bedroomQuestion ? { 
        question_id: bedroomQuestion.question_id,
        question_text: bedroomQuestion.question_text, 
        answer: bedroomQuestion.answer,
        answerType: typeof bedroomQuestion.answer
      } : null,
      systemSizeQuestion: systemSizeQuestion ? { 
        question_id: systemSizeQuestion.question_id,
        question_text: systemSizeQuestion.question_text, 
        answer: systemSizeQuestion.answer,
        answerType: typeof systemSizeQuestion.answer
      } : null
    }
    console.log('Prefill Debug - Found questions:', foundQuestions)

    const normalizedBathroom = normalizeNumberToBucket(bathroomAns, 4)
    const normalizedBedroom = normalizeNumberToBucket(bedroomAns, 6)
    const normalizedSystemSize = normalizeSystemSizeAnswer(sizeAns)

    const normalizedValues = {
      normalizedBathroom,
      normalizedBedroom,
      normalizedSystemSize
    }
    console.log('Prefill Debug - Normalized values:', normalizedValues)

    // Store debug info for display
    setDebugInfo({
      allQuestions,
      foundQuestions,
      normalizedValues,
      rawAnswers: {
        bathroomAns,
        bedroomAns,
        sizeAns
      }
    })

    setPrefillBathroom(normalizedBathroom)
    setPrefillBedroom(normalizedBedroom)
    setPrefillSystemSize(normalizedSystemSize)
  }, [submissionInfo?.form_answers])

  // Apply prefill to filters initially (without overriding user changes later)
  useEffect(() => {
    console.log('Filter Application Debug:', {
      filterBathroom,
      filterBedroom,
      filterSystemSize,
      prefillBathroom,
      prefillBedroom,
      prefillSystemSize
    })

    if (filterBathroom === null && prefillBathroom) {
      console.log('Setting bathroom filter to:', prefillBathroom)
      setFilterBathroom(prefillBathroom)
    }
    if (filterBedroom === null && prefillBedroom) {
      console.log('Setting bedroom filter to:', prefillBedroom)
      setFilterBedroom(prefillBedroom)
    }
    if (filterSystemSize === null && prefillSystemSize) {
      console.log('Setting system size filter to:', prefillSystemSize)
      setFilterSystemSize(prefillSystemSize)
    }
  }, [prefillBathroom, prefillBedroom, prefillSystemSize])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterSystemSize) {
        const sizes = getSystemSizes(p)
        if (!sizes.length || !sizes.includes(filterSystemSize)) return false
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
  }, [products, filterSystemSize, filterBedroom, filterBathroom])

  const displayProducts = useMemo(() => {
    return filteredProducts.sort((a, b) => {
      // Get current price for each product (considering capacity options)
      const priceA = getCurrentPrice(a)
      const priceB = getCurrentPrice(b)
      return priceA - priceB
    })
  }, [filteredProducts])

  // Get visible products based on pagination
  const visibleProducts = useMemo(() => {
    return displayProducts.slice(0, visibleProductsCount)
  }, [displayProducts, visibleProductsCount])

  // Calculate remaining products
  const remainingProducts = displayProducts.length - visibleProductsCount
  const hasMoreProducts = remainingProducts > 0

  // Helper function to check if review section is enabled
  const isReviewSectionEnabled = () => {
    return partnerSettings?.review_section?.enabled && partnerSettings.review_section.reviews.length > 0
  }

  // Helper function to check if main CTA is enabled
  const isMainCtaEnabled = () => {
    return partnerSettings?.main_cta?.enabled && partnerSettings.main_cta.title && partnerSettings.main_cta.button_text
  }

  const productsForEmail = useMemo(() => {
    return displayProducts.map((p) => ({
      id: p.partner_product_id,
      name: p.name,
      priceLabel: `£${formatPrice(getCurrentPrice(p))}`,
    }))
  }, [displayProducts])

  const clearFilters = () => {
    setFilterSystemSize(null)
    setFilterBedroom(null)
    setFilterBathroom(null)
  }

  const resetFiltersToSubmission = () => {
    setFilterSystemSize(prefillSystemSize)
    setFilterBedroom(prefillBedroom)
    setFilterBathroom(prefillBathroom)
  }

  // Handle showing more products
  const showMoreProducts = () => {
    const nextBatch = Math.min(visibleProductsCount + productsPerBatch, displayProducts.length)
    setVisibleProductsCount(nextBatch)
  }

  // Handle showing all products
  const showAllProducts = () => {
    setVisibleProductsCount(displayProducts.length)
  }

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleProductsCount(6)
  }, [filterSystemSize, filterBedroom, filterBathroom])

  const handleRestart = () => {
    // Redirect to the solar quote page to restart the journey
    const url = new URL('/solar/quote', window.location.origin)
    window.location.href = url.toString()
  }

  // Handle save quote dialog opening
  const handleSaveQuoteOpen = () => {
    // Show popup immediately for better UX
    const event = new CustomEvent('openSaveQuoteDialog', {
      detail: {
        products: productsForEmail,
        saveType: 'all_products',
        detailedAllProductsData: [] // Will be populated after data loads
      }
    });
    window.dispatchEvent(event);

    // Handle data loading in background
    if (submissionId && partnerInfo?.user_id) {
      const loadDataInBackground = async () => {
        try {
          const totalTimeOnPage = Date.now() - pageStartTime;
          const allProductsData = products.map(p => buildProductData(p, false));
          
          // Build detailed products data for all products
          const detailedAllProductsData = displayProducts.map(p => ({
            product_id: p.partner_product_id,
            name: p.name,
            price: getCurrentPrice(p),
            monthly_price: getMonthlyPayment(p),
            capacity: getSystemCapacity(p),
            warranty: (p.specifications as any)?.warranty || 
                     (p.specifications as any)?.warranty_years || 
                     (p.specifications as any)?.guarantee || 
                     'Not specified',
            image_url: p.image_url,
            description: p.description,
            is_selected: false,
            selected_at: null,
            specifications: p.specifications,
            product_fields: p.product_fields
          }));

          // Update the dialog with loaded data
          const updateEvent = new CustomEvent('updateSaveQuoteData', {
            detail: {
              detailedAllProductsData: detailedAllProductsData
            }
          });
          window.dispatchEvent(updateEvent);

          // Save to database in background
          await saveLeadSubmissionData(
            supabase,
            submissionId,
            partnerInfo.user_id,
            products[0]?.service_category_id || '',
            {
              products_data: {
                all_products: allProductsData,
                total_products_viewed: displayProducts.length,
                save_quote_opened_at: new Date().toISOString(),
                total_time_on_page_ms: totalTimeOnPage,
                action: 'save_all_products_quote'
              },
              conversion_events: [{
                event: 'save_all_products_quote',
                timestamp: new Date().toISOString(),
                data: {
                  total_products: displayProducts.length,
                  action: 'save_all_products_quote'
                }
              }]
            },
            'products',
            ['quote']
          );
        } catch (error) {
          console.error('Error loading save quote data:', error);
        }
      };

      // Run data loading without blocking UI
      loadDataInBackground();
    }
  }

  // Handle save single product quote
  const handleSaveSingleProductQuote = (product: PartnerProduct) => {
    setLoadingAction(`${product.partner_product_id}-save`)
    // Build detailed product data immediately
    const detailedProductData = {
      product_id: product.partner_product_id,
      name: product.name,
      price: getCurrentPrice(product),
      monthly_price: getMonthlyPayment(product),
      capacity: getSystemCapacity(product),
      warranty: (product.specifications as any)?.warranty || 
               (product.specifications as any)?.warranty_years || 
               (product.specifications as any)?.guarantee || 
               'Not specified',
      image_url: product.image_url,
      description: product.description,
      is_selected: false,
      selected_at: null,
      specifications: product.specifications,
      product_fields: product.product_fields
    };

    // Open save quote dialog with single product immediately
    const singleProductForEmail = [{
      id: product.partner_product_id,
      name: product.name,
      priceLabel: `£${formatPrice(getCurrentPrice(product))}`
    }];

    // Trigger the save quote dialog with single product
    const event = new CustomEvent('openSaveQuoteDialog', {
      detail: {
        products: singleProductForEmail,
        saveType: 'single_product',
        detailedProductData: detailedProductData
      }
    });
    window.dispatchEvent(event);

    // Handle database operations in background
    if (submissionId && partnerInfo?.user_id) {
      const saveToDatabase = async () => {
        try {
          const totalTimeOnPage = Date.now() - pageStartTime;
          const singleProductData = buildProductData(product, false);
          
          // Save to lead_submission_data
          await saveLeadSubmissionData(
            supabase,
            submissionId,
            partnerInfo.user_id,
            product.service_category_id,
            {
              products_data: {
                selected_product: singleProductData,
                total_products_viewed: displayProducts.length,
                save_quote_opened_at: new Date().toISOString(),
                total_time_on_page_ms: totalTimeOnPage,
                action: 'save_single_product_quote'
              },
              conversion_events: [{
                event: 'save_single_product_quote',
                timestamp: new Date().toISOString(),
                data: {
                  product_id: product.partner_product_id,
                  product_name: product.name,
                  action: 'save_single_product_quote'
                }
              }]
            },
            'products',
            ['quote']
          );
        } catch (error) {
          console.error('Error saving single product quote:', error);
        }
      };

      // Run database save without blocking UI
      saveToDatabase();
    }
  }

  const openFinanceCalculator = (product: PartnerProduct) => {
    setSelectedProductForFinance(product)
    setShowFinanceCalculator(true)
    
    // Calculate and store monthly payment for this product (includes additional costs)
    const currentPrice = getCurrentPrice(product) // This now includes additional costs
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
    setLoadingProductId(product.partner_product_id)
    setLoadingAction(`${product.partner_product_id}-book`)
    try {
      console.log('persistProductAndGo called with:', { submissionId, partnerInfo: partnerInfo?.user_id })
      
      if (!submissionId || !partnerInfo?.user_id) {
        console.error('Missing submissionId or partnerInfo:', { submissionId, partnerUserId: partnerInfo?.user_id })
        const url = new URL('/solar/addons', window.location.origin)
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
      const currentPrice = getCurrentPrice(product)
      const selectedPlan = getSelectedPlan(product)
      const selectedDeposit = getSelectedDeposit(product)
      
      const updated = {
        ...existing,
        product_id: product.partner_product_id,
        panel_count: panelCount,
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
          panel_count: panelCount,
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
          image_url: product.image_url,
        }
      })

      // Save products data to lead_submission_data
      const totalTimeOnPage = Date.now() - pageStartTime;
      const allProductsData = products.map(p => buildProductData(p, p.partner_product_id === product.partner_product_id));
      
      await saveLeadSubmissionData(
        supabase,
        submissionId,
        partnerInfo.user_id,
        product.service_category_id,
        {
          products_data: {
            selected_product: buildProductData(product, true),
            all_products: allProductsData,
            total_products_viewed: displayProducts.length,
            selection_timestamp: new Date().toISOString(),
            total_time_on_page_ms: totalTimeOnPage,
            action: 'book_and_pick_install_date'
          },
          conversion_events: [{
            event: 'product_selected',
            timestamp: new Date().toISOString(),
            data: {
              product_id: product.partner_product_id,
              product_name: product.name,
              price: currentPrice,
              action: 'book_and_pick_install_date'
            }
          }],
          page_timings: {
            products_page: {
              total_time_ms: totalTimeOnPage,
              started_at: new Date(pageStartTime).toISOString(),
              completed_at: new Date().toISOString()
            }
          }
        },
        'addons',
        ['quote', 'products']
      );
      
      // Verify what was actually saved in the database (for console logging only)
      const { data: verifyData, error: verifyError } = await supabase
        .from('partner_leads')
        .select('cart_state, product_info, calculator_info, progress_step, last_seen_at')
        .eq('submission_id', submissionId)
        .single()
      
      if (verifyError) {
        console.error('Database update successful but verification failed:', verifyError)
      } else {
        const typedVerifyData = verifyData as {
          progress_step: string;
          last_seen_at: string;
          cart_state: { product_id?: string };
          product_info: { product_id?: string; name?: string; price?: number; selected_capacity?: any };
          calculator_info: any;
        };
        console.log('Database update successful - verification:', {
          submissionId,
          productName: product.name,
          productId: product.partner_product_id,
          progressStep: typedVerifyData.progress_step,
          timestamp: typedVerifyData.last_seen_at,
          cartStateProductId: typedVerifyData.cart_state?.product_id,
          productInfoProductId: typedVerifyData.product_info?.product_id,
          productInfoName: typedVerifyData.product_info?.name,
          productInfoPrice: typedVerifyData.product_info?.price,
          productInfoSelectedCapacity: typedVerifyData.product_info?.selected_capacity,
          calculatorInfo: typedVerifyData.calculator_info
        })
      }
      
      const url = new URL('/solar/addons', window.location.origin)
      url.searchParams.set('submission', submissionId)
      window.location.href = url.toString()
    } catch (e) {
      console.error('Failed to persist product selection:', e)
      setLoadingProductId(null)
      setLoadingAction(null)
      const fallback = new URL('/solar/addons', window.location.origin)
      if (submissionId) fallback.searchParams.set('submission', submissionId)
      fallback.searchParams.set('product', product.partner_product_id)
      window.location.href = fallback.toString()
    }
  }

  // Persist selected product (with snapshot) in partner_leads.cart_state and go to survey
  const persistProductAndGoToSurvey = async (product: PartnerProduct) => {
    setLoadingProductId(product.partner_product_id)
    setLoadingAction(`${product.partner_product_id}-survey`)
    try {
      console.log('persistProductAndGoToSurvey called with:', { 
        submissionId, 
        partnerUserId: partnerInfo?.user_id,
        productId: product.partner_product_id,
        productName: product.name
      })
      
      if (!submissionId) {
        console.warn('No submissionId found - redirecting to survey without saving product data')
        setLoadingProductId(null)
        setLoadingAction(null)
        const url = new URL('/solar/survey', window.location.origin)
        window.location.href = url.toString()
        return
      }

      if (!partnerInfo?.user_id) {
        console.error('Missing partnerInfo.user_id:', partnerInfo)
        setLoadingProductId(null)
        setLoadingAction(null)
        const url = new URL('/solar/survey', window.location.origin)
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
      const currentPrice = getCurrentPrice(product)
      const selectedPlan = getSelectedPlan(product)
      const selectedDeposit = getSelectedDeposit(product)
      
      const updated = {
        ...existing,
        product_id: product.partner_product_id,
        panel_count: panelCount,
        current_price: currentPrice,
        calculator_settings: {
          selected_plan: selectedPlan,
          selected_deposit: selectedDeposit,
        }
      }
      
      const updateResult = await supabase
        .from('partner_leads')
        .update({
          cart_state: updated,
          product_info: {
            product_id: product.partner_product_id,
            name: product.name,
            price: currentPrice,
            panel_count: panelCount,
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
        throw new Error('Database update failed')
      }
      
      // Save products data to lead_submission_data
      const totalTimeOnPage = Date.now() - pageStartTime;
      const allProductsData = products.map(p => buildProductData(p, p.partner_product_id === product.partner_product_id));
      
      await saveLeadSubmissionData(
        supabase,
        submissionId,
        partnerInfo.user_id,
        product.service_category_id,
        {
          products_data: {
            selected_product: buildProductData(product, true),
            all_products: allProductsData,
            total_products_viewed: displayProducts.length,
            selection_timestamp: new Date().toISOString(),
            total_time_on_page_ms: totalTimeOnPage,
            action: 'go_to_survey'
          },
          conversion_events: [{
            event: 'product_selected',
            timestamp: new Date().toISOString(),
            data: {
              product_id: product.partner_product_id,
              product_name: product.name,
              price: currentPrice,
              action: 'go_to_survey'
            }
          }],
          page_timings: {
            products_page: {
              total_time_ms: totalTimeOnPage,
              started_at: new Date(pageStartTime).toISOString(),
              completed_at: new Date().toISOString()
            }
          }
        },
        'survey',
        ['quote', 'products']
      );
      
      const url = new URL('/solar/survey', window.location.origin)
      url.searchParams.set('submission', submissionId)
      window.location.href = url.toString()
    } catch (e) {
      console.error('Failed to persist product selection:', e)
      setLoadingProductId(null)
      setLoadingAction(null)
      const fallback = new URL('/solar/survey', window.location.origin)
      if (submissionId) fallback.searchParams.set('submission', submissionId)
      fallback.searchParams.set('product', product.partner_product_id)
      window.location.href = fallback.toString()
    }
  }

  // Show loading overlay while loading
  const showLoadingOverlay = loading

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Solar Products</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Iframe Navigation Tracker */}
      <IframeNavigationTracker categorySlug="solar" />
      
      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg z-50 flex items-center justify-center">
          <ProductLoadingSteps 
            brandColor={brandColor}
            onShowQuotes={() => {
              // This will be called when the loading animation completes
              // The actual products will show automatically when loading is done
            }}
            isLoading={showLoadingOverlay}
            submissionInfo={submissionInfo}
          />
        </div>
      )}
      
       {/* Header */}
       <ProductHeaderTile 
         count={displayProducts.length}
         postcode={submissionInfo?.postcode}
         category="solar"
         includedItems={partnerSettings?.included_items}
         nonIncludedItems={partnerSettings?.non_included_items}
         brandColor={brandColor}
         defaultFirstName={submissionInfo?.first_name}
         defaultLastName={submissionInfo?.last_name}
         defaultEmail={submissionInfo?.email}
         defaultPhone={submissionInfo?.phone}
         submissionId={submissionId}
         productsForEmail={productsForEmail}
         onRestart={handleRestart}
         onSaveQuoteOpen={handleSaveQuoteOpen}
         panelCount={panelCount}
         onPanelCountChange={setPanelCount}
       />

      {/* Main Content */}
      <div className="max-w-[1500px] mx-auto md:px-6 px-4 py-6 ">
        

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {visibleProducts.map((product) => {
              const currentPrice = getCurrentPrice(product)
              const monthlyPayment = getMonthlyPayment(product)
              const isLoading = loadingProductId === product.partner_product_id
              const isSavingQuote = loadingAction === `${product.partner_product_id}-save`

              return (
                  <Card key={product.partner_product_id} className="overflow-hidden relative transition-shadow">
                   {/* Product Image Gallery */}
                   <ImageGallery
                     images={(() => {
                       const gallery = (product.product_fields as any)?.image_gallery
                       if (Array.isArray(gallery) && gallery.length > 0) {
                         return gallery
                       }
                       return product.image_url ? [{ image: product.image_url }] : []
                     })()}
                     productName={product.name}
                     className="bg-gray-100 p-6 pt-10 rounded-2xl"
                     height="h-[250px]"
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
                                 const featureImage = feature.image
                                 return (
                                   <Badge
                                     key={index}
                                     variant="secondary"
                                     className="px-3 py-1 flex items-center gap-2"
                                     style={{ 
                                       backgroundColor: `${brandColor}20`, 
                                       color: brandColor,
                                     }}
                                   >
                                     {featureImage && (
                                       <img 
                                         src={featureImage} 
                                         alt={featureText}
                                         className="w-4 h-4 object-contain"
                                       />
                                     )}
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
                     {(() => {
                       const brandImage = (product.product_fields as any)?.brand_image
                       if (brandImage) {
                         return (
                           <div className="mb-2 absolute top-20 left-0 p-5">
                             <img 
                               src={brandImage} 
                               alt="Brand Logo"
                               className="h-8 object-contain"
                             />
                           </div>
                         )
                       }
                     })()}

                     {/* Product Name */}
                     <div className="flex items-center gap-2 mb-3">
                       <h3 className="text-2xl font-semibold text-gray-900">{product.name}</h3>
                     </div>

                     {/* Product Description */}
                     {product.description && (
                       <div className="mb-4">
                         <p className="text-sm text-gray-600">{product.description}</p>
                       </div>
                     )}

                     {/* Specifications List */}
                     {(() => {
                       const specs = (product.product_fields as any)?.specs
                       if (specs && Array.isArray(specs) && specs.length > 0) {
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

                     {/* Pricing Section */}
                     <div className="mb-6 border border-gray-200 rounded-lg bg-gray-100">
                       <div className="flex items-end justify-between p-4 bg-white rounded-t-lg">
                         {/* Left Section - Fixed Price */}
                         <div className="border-r border-gray-200 pr-4 w-1/2 flex flex-col items-center justify-center">
                           <p className="text-xs text-gray-600 mb-1">Fixed price (inc. VAT)</p>
                           <div className="flex items-end gap-2">
                             <span className="md:text-xl text-lg font-medium text-gray-900">£{formatPrice(currentPrice)}</span>
                             <span className="text-xs text-red-500 line-through">£{formatPrice(currentPrice + 250)}</span>
                           </div>
                         </div>
                         
                         {/* Right Section - Monthly Price */}
                         <div className="text-left w-1/2 flex flex-col items-center justify-center">
                           <p className="text-xs text-gray-600 mb-1">or, monthly from</p>
                           <div className="flex items-center gap-2">
                             <span className="md:text-xl text-lg font-medium text-gray-900">£{formatPrice(monthlyPayment || 0)}</span>
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
                         className="text-sm text-gray-600 hover:text-gray-800 underline font-medium p-3 h-auto bg-gray-100 w-full text-center justify-center flex cursor-pointer rounded-b-lg md:rounded-b-none"
                       >
                         What's included in my installation?
                       </span>
                     </div>

                     {/* Action Buttons */}
                     <div className="space-y-3">
                       {/* Primary Action Button */}
                       <Button
                         className={`w-full py-3 px-4 font-semibold transition-colors flex items-center justify-center gap-2 ${isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:opacity-90'}`}
                         onClick={() => persistProductAndGo(product)}
                         disabled={isLoading}
                         style={{ backgroundColor: brandColor }}
                       >
                         {isLoading ? (
                           <>
                             <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                             Loading...
                           </>
                         ) : (
                           'Enquire about this package'
                         )}
                       </Button>

                       {/* Save Quote Button */}
                       <Button
                         variant="outline"
                         className={`w-full py-3 px-4 font-medium transition-colors border-gray-300 text-gray-700 hover:bg-gray-50 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                         onClick={() => handleSaveSingleProductQuote(product)}
                         disabled={isLoading}
                       >
                         {isSavingQuote ? 'Loading...' : 'Save this quote'}
                       </Button>

                       {/* Survey Button */}
                       <Button
                         variant="outline"
                         className={`w-full py-3 px-4 font-medium transition-colors border-gray-300 text-gray-700 hover:bg-gray-50 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                         onClick={() => persistProductAndGo(product)}
                         disabled={isLoading}
                       >
                         or, book a call to discuss
                       </Button>
                     </div>

                     {/* System Capacity Display */}
                     <div className="mt-4 px-3 py-2 bg-gray-100 rounded-lg">
                       <div className="flex items-center gap-2 text-sm justify-center">
                         <span className="text-gray-900">
                           {getSystemCapacity(product)}
                         </span>
                       </div>
                     </div>
                   </div>
                 </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Solar Products Coming Soon!</h2>
              <p className="text-gray-600 mb-6">We're currently setting up our solar product catalog. Check back soon for our range of solar panel systems.</p>
              <Button onClick={handleRestart} className="bg-blue-600 hover:bg-blue-700">
                Start Your Solar Quote
              </Button>
            </div>
          </div>
        )}

        {/* Load More Products */}
        {hasMoreProducts && products.length > 0 && (
          <div className="text-center mb-8">
            <Button
              onClick={showMoreProducts}
              variant="outline"
              className="mr-4"
            >
              Show {Math.min(productsPerBatch, remainingProducts)} More
            </Button>
            <Button
              onClick={showAllProducts}
              variant="outline"
            >
              Show All ({remainingProducts} remaining)
            </Button>
          </div>
        )}

      </div>

      {/* End sections - Review section and Main CTA at the end (outside main section for full width) */}
      {displayProducts.length > 0 && (
        <>
          {/* Review section at the end */}
          {isReviewSectionEnabled() && (
            <div className="w-full">
              <ReviewSection
                title={partnerSettings?.review_section?.title || ''}
                subtitle={partnerSettings?.review_section?.subtitle}
                reviews={partnerSettings?.review_section?.reviews || []}
                buttonText={partnerSettings?.review_section?.buttonText}
                buttonUrl={partnerSettings?.review_section?.buttonUrl}
                buttonDescription={partnerSettings?.review_section?.buttonDescription}
                brandColor={brandColor}
              />
            </div>
          )}
          
          {/* Main CTA at the end */}
          {isMainCtaEnabled() && (
            <div className="w-full">
              <MainCTA
                title={partnerSettings?.main_cta?.title || ''}
                subtitle={partnerSettings?.main_cta?.subtitle}
                buttonText={partnerSettings?.main_cta?.button_text || ''}
                buttonUrl={partnerSettings?.main_cta?.button_url}
                backgroundColor={partnerSettings?.main_cta?.background_color}
                textColor={partnerSettings?.main_cta?.text_color}
                brandColor={brandColor}
              />
            </div>
          )}
        </>
      )}

      {/* Finance Calculator Modal */}
      {showFinanceCalculator && selectedProductForFinance && (
        <FinanceCalculator
          isOpen={showFinanceCalculator}
          onClose={closeFinanceCalculator}
          productPrice={getCurrentPrice(selectedProductForFinance)}
          productName={selectedProductForFinance.name}
          productImageUrl={selectedProductForFinance.image_url}
          aprSettings={partnerSettings?.apr_settings || null}
          brandColor={brandColor}
          selectedPlan={getSelectedPlan(selectedProductForFinance)}
          selectedDeposit={getSelectedDeposit(selectedProductForFinance)}
          onPlanChange={(plan) => {
            setSelectedPlans(prev => ({
              ...prev,
              [selectedProductForFinance.partner_product_id]: plan
            }))
          }}
          onDepositChange={(deposit) => {
            setSelectedDeposits(prev => ({
              ...prev,
              [selectedProductForFinance.partner_product_id]: deposit
            }))
          }}
          onMonthlyPaymentUpdate={(payment: number) => {
            setMonthlyPayments(prev => ({
              ...prev,
              [selectedProductForFinance.partner_product_id]: payment
            }))
          }}
        />
      )}

      {/* What's Included Modal */}
      {showWhatsIncluded && selectedProductForWhatsIncluded && (
        <Dialog open={showWhatsIncluded} onOpenChange={setShowWhatsIncluded}>
          <DialogContent className="max-w-2xl" variant="sidebar">
            <DialogHeader>
              <DialogTitle>What's Included</DialogTitle>
              <DialogDescription>
                Everything included with {selectedProductForWhatsIncluded.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {(() => {
                // First check for product-specific included items
                const productIncludedItems = (selectedProductForWhatsIncluded?.product_fields as any)?.what_s_included
                
                if (productIncludedItems && Array.isArray(productIncludedItems) && productIncludedItems.length > 0) {
                  return (
                    <div>
                   
                      <div className="space-y-3">
                        {productIncludedItems.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            {item.items?.image && (
                              <img 
                                src={item.items.image} 
                                alt={item.items.title || 'Included item'}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.items?.title || item.items}</div>
                              {item.items?.subtitle && (
                                <div className="text-sm text-gray-600">{item.items.subtitle}</div>
                              )}
                            </div>
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0" strokeWidth={2} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                
                // Fallback to partner settings
                const includedItems = partnerSettings?.included_items
                const nonIncludedItems = partnerSettings?.non_included_items
                
                if (includedItems && includedItems.length > 0) {
                  return (
                    <div>
                      <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        Included in Price
                      </h4>
                      <div className="space-y-2">
                        {includedItems.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" strokeWidth={2} />
                            <span>{item.items || item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                
                if (nonIncludedItems && nonIncludedItems.length > 0) {
                  return (
                    <div>
                      <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                        <Box className="w-5 h-5" />
                        Not Included
                      </h4>
                      <div className="space-y-2">
                        {nonIncludedItems.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                            <Box className="w-4 h-4 text-orange-500 flex-shrink-0" strokeWidth={2} />
                            <span>{item.items || item}</span>
                          </div>
                        ))}
                      </div>
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
      <UserInfoSection 
        submissionInfo={submissionInfo} 
        partnerInfo={partnerInfo} 
        onRestart={handleRestart} 
        brandColor={brandColor} 
        submissionId={submissionId}
        additionalCosts={getTotalAnswersCost()}
        questionDetails={questionDetails}
      />

      {/* FAQs at bottom */}
      <ProductFaqs faqs={partnerSettings?.faqs || null} />

      {/* Debug Panel */}
      {debugInfo && (
        <div className="hidden fixed bottom-4 right-4 bg-white border-2 border-red-500 rounded-lg p-4 max-w-md max-h-96 overflow-y-auto shadow-lg z-50">
          <div className="text-sm font-bold text-red-600 mb-2">🔍 DEBUG INFO</div>
          
          <div className="mb-3">
            <div className="font-semibold text-gray-800">All Questions ({debugInfo.allQuestions?.length || 0}):</div>
            <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
              {debugInfo.allQuestions?.map((q: any, i: number) => (
                <div key={i} className="mb-1">
                  <strong>{q.question_text}</strong>: {JSON.stringify(q.answer)} ({q.answerType})
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <div className="font-semibold text-gray-800">Found Questions:</div>
            <div className="text-xs text-gray-600">
              <div><strong>Bathroom:</strong> {debugInfo.foundQuestions?.bathroomQuestion ? 
                `${debugInfo.foundQuestions.bathroomQuestion.question_text} → ${JSON.stringify(debugInfo.foundQuestions.bathroomQuestion.answer)}` : 
                'Not found'}
              </div>
              <div><strong>Bedroom:</strong> {debugInfo.foundQuestions?.bedroomQuestion ? 
                `${debugInfo.foundQuestions.bedroomQuestion.question_text} → ${JSON.stringify(debugInfo.foundQuestions.bedroomQuestion.answer)}` : 
                'Not found'}
              </div>
              <div><strong>System Size:</strong> {debugInfo.foundQuestions?.systemSizeQuestion ? 
                `${debugInfo.foundQuestions.systemSizeQuestion.question_text} → ${JSON.stringify(debugInfo.foundQuestions.systemSizeQuestion.answer)}` : 
                'Not found'}
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className="font-semibold text-gray-800">Normalized Values:</div>
            <div className="text-xs text-gray-600">
              <div>Bathroom: {debugInfo.normalizedValues?.normalizedBathroom || 'null'}</div>
              <div>Bedroom: {debugInfo.normalizedValues?.normalizedBedroom || 'null'}</div>
              <div>System Size: {debugInfo.normalizedValues?.normalizedSystemSize || 'null'}</div>
            </div>
          </div>

          <div className="mb-3">
            <div className="font-semibold text-gray-800">Current Filters:</div>
            <div className="text-xs text-gray-600">
              <div>Filter Bathroom: {filterBathroom || 'null'}</div>
              <div>Filter Bedroom: {filterBedroom || 'null'}</div>
              <div>Filter System Size: {filterSystemSize || 'null'}</div>
            </div>
          </div>

          <div className="mb-3">
            <div className="font-semibold text-gray-800">Prefill Values:</div>
            <div className="text-xs text-gray-600">
              <div>Prefill Bathroom: {prefillBathroom || 'null'}</div>
              <div>Prefill Bedroom: {prefillBedroom || 'null'}</div>
              <div>Prefill System Size: {prefillSystemSize || 'null'}</div>
            </div>
          </div>
        </div>
      )}

  
    </div>
  )
}

export default function SolarProductsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SolarProductsContent />
    </Suspense>
  )
}