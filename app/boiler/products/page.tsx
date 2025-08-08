'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'

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

export default function BoilerProductsPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null)
  const [products, setProducts] = useState<PartnerProduct[]>([])
  const [submissionInfo, setSubmissionInfo] = useState<QuoteSubmission | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<PartnerProduct | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Read submission id to persist context (if present)
  const submissionId = searchParams?.get('submission') ?? null

  // Resolve brand color and classes
  const brandColor = partnerInfo?.company_color || '#2563eb'
  const classes = useDynamicStyles(brandColor)

  // Fetch partner from subdomain
  useEffect(() => {
    async function fetchPartnerFromSubdomain() {
      try {
        const hostname = window.location.hostname
        const subdomain = hostname.split('.')[0]

        if (!subdomain || subdomain === 'localhost' || subdomain === 'www') {
          setError('Partner not found for this subdomain')
          setLoading(false)
          return
        }

        const { data: partner, error: partnerError } = await supabase
          .from('UserProfiles')
          .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color')
          .eq('subdomain', subdomain)
          .eq('status', 'active')
          .single()

        if (partnerError || !partner) {
          setError('Partner not found for this subdomain')
          setLoading(false)
          return
        }

        setPartnerInfo(partner as PartnerInfo)
      } catch (err) {
        console.error('Error fetching partner from subdomain:', err)
        setError('Failed to load partner information')
        setLoading(false)
      }
    }

    fetchPartnerFromSubdomain()
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
      const priceLabel = typeof product.price === 'number' ? `£${product.price.toFixed(2)}` : 'Contact for price'
      return { ...product, priceLabel }
    })
  }, [products])

  const handleMoreDetails = (product: PartnerProduct) => {
    setSelectedProduct(product)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedProduct(null)
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
    <div className="min-h-screen bg-gray-50 pt-24">
      {/* Header Section */}
      <div className=" border-b ">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {formattedProducts.length} available installation packages
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-sm text-gray-600">Suitable for</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  1 bedroom
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  1 bathroom
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  in {submissionInfo?.postcode || 'your area'}
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                What's included?
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Save for later
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {formattedProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-600">
            No products available right now.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {formattedProducts.map((product) => (
              <div key={product.partner_product_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Product Header */}
                <div className="relative p-6 pb-4">
                  {/* Product Image */}
                  <div className="relative h-48 bg-gray-50 rounded-lg mb-4">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm rounded-lg">
                        No image
                      </div>
                    )}
                  </div>

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

                  {/* Key Features from Product Fields */}
                  {product.product_fields && Object.keys(product.product_fields).length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                      <span className="text-sm text-gray-700">
                        {Object.entries(product.product_fields).slice(0, 1).map(([key, value]) => 
                          `${key}: ${typeof value === 'string' || typeof value === 'number' ? String(value) : 'Yes'}`
                        )}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {product.description && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-700">{product.description}</p>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Fixed price (inc. VAT)</span>
                      <span className="text-lg font-bold text-gray-900">{product.priceLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">or, monthly from</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {product.price ? `£${(product.price / 12).toFixed(2)}` : 'Contact us'}
                        </span>
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Action Links */}
                  <div className="space-y-3">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      What's included in my installation?
                    </button>
                    
                    {/* Primary Action Button */}
                    <button
                      className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                      onClick={() => {
                        const url = new URL('/boiler/quote', window.location.origin)
                        if (submissionId) url.searchParams.set('submission', submissionId)
                        url.searchParams.set('product', product.partner_product_id)
                        window.location.href = url.toString()
                      }}
                    >
                      Continue with this
                    </button>
                    
                    {/* Secondary Action Button */}
                    <button
                      className="w-full py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      onClick={() => handleMoreDetails(product)}
                    >
                      More details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Product Details Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedProduct.name}</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Product Image */}
              {selectedProduct.image_url && (
                <div className="flex justify-center">
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="max-w-md h-64 object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Description */}
              {selectedProduct.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700">{selectedProduct.description}</p>
                </div>
              )}

              {/* All Specifications */}
              {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Specifications</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700 font-medium">{String(key)}:</span>
                        <span className="text-gray-900">
                          {typeof value === 'string' || typeof value === 'number' ? String(value) : 'Yes'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Product Fields */}
              {selectedProduct.product_fields && Object.keys(selectedProduct.product_fields).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Details</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(selectedProduct.product_fields).map(([key, value]) => (
                      <div key={key} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700 font-medium">{String(key)}:</span>
                        <span className="text-gray-900">
                          {typeof value === 'string' || typeof value === 'number' ? String(value) : 'Yes'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fixed price (inc. VAT)</span>
                    <span className="text-xl font-bold text-gray-900">
                      {typeof selectedProduct.price === 'number' ? `£${selectedProduct.price.toFixed(2)}` : 'Contact for price'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly payment</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {selectedProduct.price ? `£${(selectedProduct.price / 12).toFixed(2)}/month` : 'Contact us'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  className="flex-1 py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  onClick={() => {
                    const url = new URL('/boiler/quote', window.location.origin)
                    if (submissionId) url.searchParams.set('submission', submissionId)
                    url.searchParams.set('product', selectedProduct.partner_product_id)
                    window.location.href = url.toString()
                  }}
                >
                  Continue with this
                </button>
                <button
                  onClick={closeModal}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
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


