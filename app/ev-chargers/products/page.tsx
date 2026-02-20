'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import { resolvePartnerByHost } from '@/lib/partner'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Info, ShieldCheck, ArrowLeft } from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"

// New component imports
import ProductHeaderTile from '@/components/category-commons/product/ProductHeaderTile'
import ProductFaqs from '@/components/category-commons/product/ProductFaqs'
import UserInfoSection from '@/components/category-commons/product/UserInfoSection'
import ReviewSection from '@/components/category-commons/product/ReviewSection'
import MainCTA from '@/components/category-commons/product/MainCTA'
import IframeNavigationTracker from '@/components/IframeNavigationTracker'

// Number formatting utility
const formatPrice = (price: number, showDecimals: boolean = true): string => {
  if (showDecimals) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  } else {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }
}

interface FormQuestion {
  question_id: string;
  question_text: string;
  is_multiple_choice: boolean;
  answer_options?: Array<{
    text: string;
    hasAdditionalCost?: boolean;
    additionalCost?: number;
  }>;
  answer?: string | string[];
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
  form_answers: any
}

interface PartnerSettings {
  setting_id: string
  partner_id: string
  service_category_id: string
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
}

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
  specifications: Record<string, any>
  product_fields: Record<string, any>
  is_active: boolean
  service_category_id: string
}

function EVchargersProductsLoading() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-64 rounded-full mx-auto" />
          <Skeleton className="h-[400px] w-full rounded-[2.5rem]" />
        </div>
        <p className="text-slate-500 font-medium animate-pulse">
          Please wait while we fetch the latest products for you...
        </p>
      </div>
    </div>
  )
}

function EVchargersProductsPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null)
  const [products, setProducts] = useState<PartnerProduct[]>([])
  const [partnerSettings, setPartnerSettings] = useState<PartnerSettings | null>(null)
  const [submissionInfo, setSubmissionInfo] = useState<QuoteSubmission | null>(null)
  const [questionDetails, setQuestionDetails] = useState<Record<string, FormQuestion>>({})
  const [isHorizontalLayout, setIsHorizontalLayout] = useState(false)
  const [filterChargerType, setFilterChargerType] = useState<string | null>(null)

  const submissionId = searchParams?.get('submission') ?? null
  const brandColor = partnerInfo?.company_color || '#0057A0'
  const classes = useDynamicStyles(brandColor)

  const isReviewSectionEnabled = () => {
    return partnerSettings?.review_section?.enabled && (partnerSettings.review_section.reviews?.length || 0) > 0
  }
  const isMainCtaEnabled = () => partnerSettings?.main_cta?.enabled || false

  // Filter products by charger type
  const filteredProducts = useMemo(() => {
    if (!filterChargerType) return products
    
    return products.filter((product) => {
      const chargerType = (product.product_fields as any)?.charger_type
      return chargerType === filterChargerType
    })
  }, [products, filterChargerType])

  const handleRestart = () => {
    router.push('/ev-chargers/quote')
  }

  const handleSaveQuoteOpen = () => {
    window.dispatchEvent(new CustomEvent('openSaveQuoteDialog', {
      detail: {
        products: productsForEmail,
        saveType: 'all_products'
      }
    }))
  }

  const productsForEmail = useMemo(() => {
    const productsToUse = filterChargerType ? filteredProducts : products
    return productsToUse.map((p: PartnerProduct) => ({
      id: p.partner_product_id,
      name: p.name,
      priceLabel: p.price ? formatPrice(p.price) : 'Contact for Price'
    }))
  }, [filteredProducts, products, filterChargerType])

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
        const typedQuestion = question as any;
        acc[typedQuestion.question_id] = typedQuestion;
        return acc;
      }, {} as Record<string, FormQuestion>) || {};

      setQuestionDetails(prev => ({ ...prev, ...questionMap }));
    } catch (error) {
      console.error('Error fetching question details:', error);
    }
  };

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

  const getTotalAnswersCost = (): number => {
    if (!submissionInfo?.form_answers) return 0;
    const answersArray = Array.isArray(submissionInfo.form_answers)
      ? submissionInfo.form_answers
      : Object.values(submissionInfo.form_answers)
    return answersArray.reduce((total: number, answer: any) => {
      return total + getAnswerCost(answer.question_id, answer.answer);
    }, 0);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const hostname = window.location.hostname
        const partner = await resolvePartnerByHost(supabase, hostname)

        if (!partner) {
          setError('We couldn\'t find the partner profile for this website.')
          return
        }
        setPartnerInfo(partner as PartnerInfo)

        // 1. Fetch the EVCHARGERS category
        const { data: category, error: categoryError } = await (supabase
          .from('ServiceCategories')
          .select('service_category_id')
          .eq('slug', 'ev-chargers')
          .single() as any)

        if (categoryError || !category) {
          console.error('Category error:', categoryError)
          setError('Heat Pump category configuration not found.')
          return
        }

        // 2. Fetch products for this partner and the EVCHARGERS category
        const { data: partnerProducts, error: productsError } = await (supabase
          .from('PartnerProducts')
          .select('*')
          .eq('partner_id', partner.user_id)
          .eq('service_category_id', category.service_category_id)
          .eq('is_active', true) as any)

        if (productsError) {
          console.error('Products fetch error:', productsError)
          setError('Failed to load products. Please try again later.')
          return
        }

        // 3. Fetch Partner Settings
        const { data: settings, error: settingsError } = await (supabase
          .from('PartnerSettings')
          .select('*')
          .eq('partner_id', partner.user_id)
          .eq('service_category_id', category.service_category_id)
          .single() as any)

        if (!settingsError && settings) {
          setPartnerSettings(settings)
        }

        // 4. Fetch Submission Info
        if (submissionId) {
          const { data: lead } = await supabase
            .from('partner_leads')
            .select('*')
            .eq('submission_id', submissionId)
            .single()

          if (lead) {
            setSubmissionInfo(lead as any)
            const formAnswers = lead.form_answers as any
            const answersArray = Array.isArray(formAnswers) ? formAnswers : Object.values(formAnswers)
            const questionIds = (answersArray as any[]).map(a => a.question_id)
            if (questionIds.length > 0) {
              fetchQuestionDetails(questionIds)
            }
          }
        }

        setProducts((partnerProducts as PartnerProduct[]) || [])
      } catch (err: any) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred while loading the page.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <EVchargersProductsLoading />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 text-center shadow-xl border border-red-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Info className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Something went wrong</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            {error}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full text-white rounded-full py-6 h-auto font-bold hover:opacity-90"
            style={{ backgroundColor: brandColor }}
          >
            Try Again
          </Button>
          <button
            onClick={() => router.push('/')}
            className="mt-6 text-slate-500 hover:text-slate-700 font-semibold flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <IframeNavigationTracker categorySlug="ev-chargers" />

      <ProductHeaderTile
        count={filteredProducts.length}
        postcode={submissionInfo?.postcode || null}
        category="ev-chargers"
        brandColor={brandColor}
        filterChargerType={filterChargerType}
        setFilterChargerType={setFilterChargerType}
        clearFilters={() => setFilterChargerType(null)}
        includedItems={partnerSettings?.included_items || null}
        nonIncludedItems={partnerSettings?.non_included_items || null}
        defaultFirstName={submissionInfo?.first_name || null}
        defaultLastName={submissionInfo?.last_name || null}
        defaultEmail={submissionInfo?.email || null}
        defaultPhone={submissionInfo?.phone || null}
        submissionId={submissionId}
        productsForEmail={productsForEmail}
        onRestart={handleRestart}
        onSaveQuoteOpen={handleSaveQuoteOpen}
        isHorizontalLayout={isHorizontalLayout}
        onLayoutChange={setIsHorizontalLayout}
      />

      <main className="max-w-[1600px] mx-auto px-4 py-10 mb-20">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {products.length === 0 ? 'No Products Available' : 'No Products Match Your Filter'}
            </h3>
            <p className="text-slate-500">
              {products.length === 0 
                ? "We couldn't find any EV charger products for this partner."
                : "Try selecting a different charger type filter."}
            </p>
          </div>
        ) : (
          <div className={isHorizontalLayout ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : "grid grid-cols-1 xl:grid-cols-2 gap-10"}>
            {filteredProducts.map((product) => (
              <EVchargersProductCard
                key={product.partner_product_id}
                product={product}
                brandColor={brandColor}
                onSelect={() => { }}
                isHorizontal={isHorizontalLayout}
              />
            ))}
          </div>
        )}
      </main>

      {/* Trust & FAQ Sections */}
      {filteredProducts.length > 0 && (
        <>
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

          <UserInfoSection
            submissionInfo={submissionInfo}
            partnerInfo={partnerInfo}
            onRestart={handleRestart}
            brandColor={brandColor}
            submissionId={submissionId}
            additionalCosts={getTotalAnswersCost()}
            questionDetails={questionDetails}
          />

          <ProductFaqs faqs={partnerSettings?.faqs || null} />
        </>
      )}
    </div>
  )
}

function EVchargersProductCard({ product, brandColor, onSelect, isHorizontal }: {
  product: PartnerProduct,
  brandColor: string,
  onSelect: () => void,
  isHorizontal: boolean
}) {
  const specs = product.specifications || {}

  const productFields = product.product_fields as any || {}
  const specifications = product.specifications as any || {}

  const cylinderDetails = productFields?.heat_pump_cylinder_details ||
    productFields?.cylinder_details ||
    specifications?.cylinder_details

  let cylinderCapacity = typeof cylinderDetails === 'object' ? cylinderDetails.capacity : null

  // Fallback for flat structure
  if (!cylinderCapacity) {
    const rawCylinder = productFields?.cylinder || specifications?.cylinder
    if (rawCylinder) {
      // Remove 'L' or 'l' suffix if present because UI adds it
      cylinderCapacity = String(rawCylinder).replace(/l$/i, '').trim()
    }
  }

  const heatPumpDetails = productFields?.heat_pump
  let heatPumpCapacity = typeof heatPumpDetails === 'object' ? heatPumpDetails.capacity : null

  // Fallback for flat structure
  if (!heatPumpCapacity) {
    heatPumpCapacity = typeof productFields?.heat_pump === 'string' ? productFields.heat_pump : null
  }

  const details = (product.product_fields as any)?.details
  const warranty = (product.product_fields as any)?.warranty ||
    (product.specifications as any)?.warranty ||
    (product.specifications as any)?.warranty_years ||
    (product.specifications as any)?.guarantee

  const discountValue = (product.product_fields as any)?.discount || (product.specifications as any)?.discount || 9000
  const grantAmount = 7500 // Standard grant amount shown in image

  return (
    <Card className={`overflow-hidden border-0 shadow-sm bg-white rounded-3xl p-4 md:p-6 mb-8 hover:shadow-md transition-all duration-300 ${!isHorizontal ? "h-full flex flex-col" : ""}`}>
      {/* Row 1: Product Name (Only for Horizontal) */}
      {isHorizontal && (
        <div className="mb-4 md:mb-5">
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">{product.name}</h3>
        </div>
      )}

      {/* Main Grid: Image and Details */}
      <div className={`grid grid-cols-1 ${isHorizontal ? "lg:grid-cols-2" : ""} gap-6 md:gap-8 mb-6 md:mb-8`}>
        {/* Column 1: Image (Always first in grid mode) */}
        <div className="bg-[#f8f9fa] rounded-3xl flex items-center justify-center p-4 md:p-6 relative overflow-hidden group">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className={`w-full ${isHorizontal ? "h-[220px] md:h-[260px]" : "h-[180px]"} object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500`}
            />
          ) : (
            <div className={`w-full ${isHorizontal ? "h-[220px] md:h-[260px]" : "h-[180px]"} flex items-center justify-center`}>
              <Info className="w-16 h-16 text-slate-200" />
            </div>
          )}
        </div>

        {/* Column 2: Specific Details */}
        <div className="flex flex-col gap-4 md:gap-5">
          {/* Product Name (Only for Grid) */}
          {!isHorizontal && (
            <div className="mb-1">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">{product.name}</h3>
            </div>
          )}

          {/* Sub-row 1: Capacity Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4">
            <div className="bg-[#f0f4f8] rounded-2xl p-3 md:p-4 flex justify-between items-center group/box">
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-black text-slate-900">{heatPumpCapacity}</span>
                <span className="text-xs md:text-sm text-slate-500 font-medium line-clamp-1">Heat Pump</span>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-transparent group-hover/box:bg-white/50 transition-colors">
                <Info className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              </div>
            </div>
            <div className="bg-[#f0f4f8] rounded-2xl p-3 md:p-4 flex justify-between items-center group/box">
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-black text-slate-900">{`${cylinderCapacity}L`}</span>
                <span className="text-xs md:text-sm text-slate-500 font-medium line-clamp-1">Cylinder</span>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-transparent group-hover/box:bg-white/50 transition-colors">
                <Info className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Sub-row 2: Feature List */}
          <div className="flex-1">
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
              {details && typeof details === 'object' ? (
                Object.values(details).slice(0, 5).map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-slate-900 mt-1 flex-shrink-0" />
                    <span className="text-sm md:text-base text-slate-700 font-semibold leading-snug">{String(detail)}</span>
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-slate-900 mt-1 flex-shrink-0" />
                    <span className="text-sm md:text-base text-slate-700 font-semibold">A+++ rated heat pump.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-slate-900 mt-1 flex-shrink-0" />
                    <span className="text-sm md:text-base text-slate-700 font-semibold">Eco-friendly R290 refrigerant.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-slate-900 mt-1 flex-shrink-0" />
                    <span className="text-sm md:text-base text-slate-700 font-semibold">Quiet at 47dB(A).</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-slate-900 mt-1 flex-shrink-0" />
                    <span className="text-sm md:text-base text-slate-700 font-semibold">Free First Service.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-slate-900 mt-1 flex-shrink-0" />
                    <span className="text-sm md:text-base text-slate-700 font-semibold">Includes radiator upgrades.</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Sub-row 3: Action Button */}
          <div className="mt-auto">
            <Button
              onClick={onSelect}
              className="w-full flex justify-between items-center rounded-full py-4 md:py-5 px-6 md:px-8 text-sm md:text-base font-black group shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: brandColor || '#0055A5' }}
            >
              <span>More details</span>
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <svg className="w-3 h-3 md:w-4 md:h-4" style={{ color: brandColor || '#0055A5' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Row 3: Footer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-auto">
        {/* Box 1: Warranty */}
        <div className="bg-[#9FE855] rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4 shadow-sm">
          <div className="bg-white/95 p-2 md:p-2 rounded-xl shadow-sm flex-shrink-0">
            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-[#9FE855]" />
          </div>
          <span className="text-white font-black text-sm md:text-base text-nowrap">{warranty && `${warranty} Year`} Warranty</span>
        </div>

        {/* Box 2: Estimated Cost */}
        <div className="bg-[#f0f4f8] rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-base md:text-lg font-black text-slate-900">
            {product.price ? formatPrice(Number(product.price)) : '£8,000.00'}
          </span>
          <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            Estimated Cost (Includes £{grantAmount.toLocaleString()} Grant)
          </span>
        </div>

        {/* Box 3: Discount Box */}
        <div className="bg-[#E8F8F1] rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center text-center relative group shadow-sm md:col-span-2 lg:col-span-1">
          <span className="text-[#0D8750] font-black text-sm md:text-base">Up to £{discountValue.toLocaleString()} discount</span>
          <span className="text-[9px] md:text-[10px] text-[#0D8750]/80 font-bold uppercase tracking-wider mt-1">
            Home Energy Scotland grant applied
          </span>
          <div className="absolute top-2 right-2 md:top-3 md:right-3">
            <Info className="w-3 h-3 md:w-4 md:h-4 text-[#0D8750]/40" />
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function EVchargersProductsPageWrapper() {
  return (
    <Suspense fallback={<EVchargersProductsLoading />}>
      <EVchargersProductsPage />
    </Suspense>
  )
}