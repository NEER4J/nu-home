'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import SurveyLayout from '@/components/category-commons/survey/SurveyLayout'

interface PartnerInfo {
  user_id: string
  company_name: string
  company_color: string | null
  logo_url: string | null
}

interface PartnerProduct {
  partner_product_id: string
  partner_id: string
  name: string
  price: number | null
  image_url: string | null
}

function SurveyContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<PartnerProduct | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<any[]>([])
  const [selectedBundles, setSelectedBundles] = useState<any[]>([])
  const [partnerSettings, setPartnerSettings] = useState<any>(null)
  const [prefillUserInfo, setPrefillUserInfo] = useState<any>(null)
  const [currentCalculatorSettings, setCurrentCalculatorSettings] = useState<any>(null)

  // Read submission id to persist context (if present)
  const submissionId = searchParams?.get('submission') ?? null

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        // Get partner info from URL or submission
        let partnerId: string | null = null

                 if (submissionId) {
           // Get partner info from submission
           const { data: submissionData, error: submissionError } = await supabase
             .from('partner_leads')
             .select('assigned_partner_id, first_name, last_name, email, phone, postcode, notes, cart_state, product_info, addon_info, bundle_info, calculator_info')
             .eq('submission_id', submissionId)
             .single()

           if (submissionError) {
             console.error('Error loading submission:', submissionError)
             setError('Failed to load submission data')
             return
           }

           if (submissionData) {
             partnerId = submissionData.assigned_partner_id
             
             // Pre-fill user info from existing submission data
             if (submissionData.first_name || submissionData.last_name || submissionData.email) {
               setPrefillUserInfo({
                 first_name: submissionData.first_name || '',
                 last_name: submissionData.last_name || '',
                 email: submissionData.email || '',
                 phone: submissionData.phone || '',
                 postcode: submissionData.postcode || '',
                 notes: submissionData.notes || ''
               })
             }

             if (submissionData.product_info) {
               // Load complete product data including product_fields for "What's Included" section
               const { data: completeProduct } = await supabase
                 .from('PartnerProducts')
                 .select('partner_product_id, partner_id, name, price, image_url, product_fields')
                 .eq('partner_product_id', submissionData.product_info.product_id)
                 .eq('partner_id', partnerId)
                 .single()
               
               if (completeProduct) {
                 setSelectedProduct({
                   ...submissionData.product_info,
                   product_fields: completeProduct.product_fields || null
                 })
               } else {
                 setSelectedProduct(submissionData.product_info)
               }
             }
             
             if (submissionData.addon_info) {
               // Load complete addon data from database for full information
               const addonIds = submissionData.addon_info.map((a: any) => a.addon_id)
               if (addonIds.length > 0) {
                 const { data: addonRows } = await supabase
                   .from('Addons')
                   .select('*')
                   .in('addon_id', addonIds)
                   .eq('partner_id', partnerId)
                 
                 if (addonRows && addonRows.length > 0) {
                   // Merge with quantity information from submission
                   const addonsWithQuantities = addonRows.map(addon => {
                     const submissionAddon = submissionData.addon_info.find((a: any) => a.addon_id === addon.addon_id)
                     return {
                       ...addon,
                       quantity: submissionAddon?.quantity || 1
                     }
                   })
                   setSelectedAddons(addonsWithQuantities)
                 } else {
                   setSelectedAddons(submissionData.addon_info)
                 }
               } else {
                 setSelectedAddons(submissionData.addon_info)
               }
             }
             
             if (submissionData.bundle_info) {
               // Load complete bundle data from database for full information
               const bundleIds = submissionData.bundle_info.map((b: any) => b.bundle_id)
               if (bundleIds.length > 0) {
                 const { data: bundleRows } = await supabase
                   .from('Bundles')
                   .select('*, BundlesAddons(*, Addons(*))')
                   .in('bundle_id', bundleIds)
                   .eq('partner_id', partnerId)
                 
                 if (bundleRows && bundleRows.length > 0) {
                   // Merge with quantity information from submission
                   const bundlesWithQuantities = bundleRows.map(bundle => {
                     const submissionBundle = submissionData.bundle_info.find((b: any) => b.bundle_id === bundle.bundle_id)
                     return {
                       bundle,
                       quantity: submissionBundle?.quantity || 1,
                       unitPrice: 0 // This will be calculated by the OrderSummarySidebar
                     }
                   })
                   setSelectedBundles(bundlesWithQuantities)
                 } else {
                   setSelectedBundles(submissionData.bundle_info)
                 }
               } else {
                 setSelectedBundles(submissionData.bundle_info)
               }
             }
             
             if (submissionData.calculator_info) {
               setCurrentCalculatorSettings(submissionData.calculator_info)
             }
           }
         }

                 if (!partnerId) {
           setError('No partner information found')
           return
         }

         // Get partner info from UserProfiles table
         const { data: partnerData, error: partnerError } = await supabase
           .from('UserProfiles')
           .select('user_id, company_name, company_color, logo_url')
           .eq('user_id', partnerId as string)
           .single()

        if (partnerError) {
          console.error('Error loading partner:', partnerError)
          setError('Failed to load partner information')
          return
        }

                 setPartnerInfo(partnerData)

         // Get partner settings for APR configurations
         const { data: boilerCategory } = await supabase
           .from('ServiceCategories')
           .select('service_category_id')
           .eq('slug', 'boiler')
           .single()
         
         if (boilerCategory) {
           // Load partner settings for APR configurations
           const { data: settingsData, error: settingsError } = await supabase
             .from('PartnerSettings')
             .select('apr_settings')
             .eq('partner_id', partnerId)
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

       } catch (err) {
        console.error('Error in loadData:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [submissionId, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading survey...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.href = '/boiler/products'} 
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Back to Products
          </button>
        </div>
      </div>
    )
  }

  if (!partnerInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Partner Not Found</div>
          <p className="text-gray-600">Unable to find partner information.</p>
          <button 
            onClick={() => window.location.href = '/boiler/products'} 
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Back to Products
          </button>
        </div>
      </div>
    )
  }

  return (
    <SurveyLayout
      selectedProduct={selectedProduct}
      selectedAddons={selectedAddons}
      selectedBundles={selectedBundles}
      companyColor={partnerInfo.company_color}
      partnerSettings={partnerSettings}
      currentCalculatorSettings={currentCalculatorSettings}
      prefillUserInfo={prefillUserInfo}
      submissionId={submissionId || undefined}
      backHref="/boiler/products"
      backLabel="Back to Products"
      showBack={true}
    />
  )
}

export default function SurveyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading survey...</p>
        </div>
      </div>
    }>
      <SurveyContent />
    </Suspense>
  )
}
