'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import SurveyLayout from '@/components/category-commons/survey/SurveyLayout'
import IframeNavigationTracker from '@/components/IframeNavigationTracker'
import { resolvePartnerByHost } from '@/lib/partner'

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
  console.log('=== saveLeadSubmissionData CALLED ===')
  console.log('Parameters:', { submissionId, partnerId, serviceCategoryId, currentPage, pagesCompleted })
  
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

    // Get existing form submissions to append new ones
    let existingFormSubmissions = []
    if (data.form_submissions) {
      try {
        const { data: existingData } = await supabase
          .from('lead_submission_data')
          .select('form_submissions')
          .eq('submission_id', submissionId)
          .single()
        
        if (existingData?.form_submissions) {
          existingFormSubmissions = Array.isArray(existingData.form_submissions) 
            ? existingData.form_submissions 
            : []
        }
      } catch (err) {
        console.warn('Could not fetch existing form submissions:', err)
      }
    }

    // Prepare the payload
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

    // Append new form submissions to existing ones
    if (data.form_submissions && Array.isArray(data.form_submissions)) {
      payload.form_submissions = [...existingFormSubmissions, ...data.form_submissions]
      console.log('Form submissions count:', payload.form_submissions.length)
    }

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
  const [serviceCategoryId, setServiceCategoryId] = useState<string | null>(null)
  const [pageStartTime, setPageStartTime] = useState<number>(Date.now())

  // Read submission id to persist context (if present)
  const submissionId = searchParams?.get('submission') ?? null

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        // Load service category ID
        const { data: boilerCategory } = await supabase
          .from('ServiceCategories')
          .select('service_category_id')
          .eq('slug', 'boiler')
          .single()
        
        if (boilerCategory) {
          setServiceCategoryId(boilerCategory.service_category_id as string)
        }

        // Get partner info from URL or submission
        let partnerId: string | null = null
        let submissionData: any = null

        if (submissionId) {
           // Get partner info from submission
           const { data: submissionDataResult, error: submissionError } = await supabase
             .from('partner_leads')
             .select('assigned_partner_id, first_name, last_name, email, phone, postcode, notes, cart_state, product_info, addon_info, bundle_info, calculator_info')
             .eq('submission_id', submissionId)
             .single()

           if (submissionError) {
             console.error('Error loading submission:', submissionError)
             setError('Failed to load submission data')
             return
           }

           if (submissionDataResult) {
             partnerId = submissionDataResult.assigned_partner_id
             submissionData = submissionDataResult
             
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

        // If no partnerId from submission, try to get it from hostname
        if (!partnerId) {
          try {
            const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
            const partner = await resolvePartnerByHost(supabase, hostname)
            if (partner) {
              partnerId = partner.user_id
              setPartnerInfo(partner as PartnerInfo)
            }
          } catch (err) {
            console.error('Error resolving partner from host:', err)
          }
        }

        if (!partnerId) {
          setError('No partner information found')
          return
        }

         // Get partner info from UserProfiles table (only if not already loaded from hostname)
         if (!partnerInfo) {
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
         }

         // Load partner settings for APR configurations
         if (serviceCategoryId) {
           const { data: settingsData, error: settingsError } = await supabase
             .from('PartnerSettings')
             .select('apr_settings')
             .eq('partner_id', partnerId)
             .eq('service_category_id', serviceCategoryId)
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

         // If no submission data, load available products for the partner
         if (!submissionData && partnerId) {
           try {
             const { data: productsData, error: productsError } = await supabase
               .from('PartnerProducts')
               .select('partner_product_id, partner_id, name, price, image_url, product_fields')
               .eq('partner_id', partnerId)
               .eq('is_active', true)
               .order('price', { ascending: true })
               .limit(1) // Load the first/cheapest product as default

             if (!productsError && productsData && productsData.length > 0) {
               setSelectedProduct(productsData[0])
               console.log('Loaded default product for survey:', productsData[0])
             }
           } catch (err) {
             console.error('Error loading default product:', err)
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

  // Custom survey submission handler
  const handleSurveySubmit = async (surveyDetails: any) => {
    console.log('=== SURVEY SUBMISSION HANDLER CALLED ===')
    console.log('Survey details:', surveyDetails)
    
    try {
      if (submissionId && partnerInfo && serviceCategoryId) {
        const totalTimeOnPage = Date.now() - pageStartTime;
        
        // Prepare survey data for lead_submission_data
        const surveyData = {
          survey_details: {
            user_details: {
              first_name: surveyDetails.firstName,
              last_name: surveyDetails.lastName,
              email: surveyDetails.email,
              phone: surveyDetails.phone,
              postcode: surveyDetails.postcode,
              notes: surveyDetails.notes || ''
            },
            selected_items: {
              product_id: selectedProduct?.partner_product_id || null,
              addon_ids: selectedAddons && selectedAddons.length > 0 ? selectedAddons.map(addon => ({
                addon_id: addon.addon_id,
                quantity: addon.quantity
              })) : [],
              bundle_ids: selectedBundles && selectedBundles.length > 0 ? selectedBundles.map(bundle => ({
                bundle_id: bundle.bundle.bundle_id,
                quantity: bundle.quantity
              })) : []
            },
            calculator_settings: currentCalculatorSettings,
            total_amount: (selectedProduct?.price || 0) + (selectedAddons?.reduce((sum, a) => sum + (a.price * a.quantity), 0) || 0) + (selectedBundles?.reduce((sum, b) => sum + (b.unitPrice * b.quantity), 0) || 0),
            survey_completed_at: new Date().toISOString(),
            total_time_on_page_ms: totalTimeOnPage
          }
        };

        // Prepare form submission data
        const formSubmissionData = {
          form_type: 'survey',
          submitted_at: new Date().toISOString(),
          form_data: {
            user_details: {
              first_name: surveyDetails.firstName,
              last_name: surveyDetails.lastName,
              email: surveyDetails.email,
              phone: surveyDetails.phone,
              postcode: surveyDetails.postcode,
              notes: surveyDetails.notes || ''
            },
            selected_items: {
              product_id: selectedProduct?.partner_product_id || null,
              addon_ids: selectedAddons && selectedAddons.length > 0 ? selectedAddons.map(addon => ({
                addon_id: addon.addon_id,
                quantity: addon.quantity
              })) : [],
              bundle_ids: selectedBundles && selectedBundles.length > 0 ? selectedBundles.map(bundle => ({
                bundle_id: bundle.bundle.bundle_id,
                quantity: bundle.quantity
              })) : []
            },
            calculator_settings: currentCalculatorSettings,
            total_amount: (selectedProduct?.price || 0) + (selectedAddons?.reduce((sum, a) => sum + (a.price * a.quantity), 0) || 0) + (selectedBundles?.reduce((sum, b) => sum + (b.unitPrice * b.quantity), 0) || 0)
          },
          submission_metadata: {
            page_url: typeof window !== 'undefined' ? window.location.href : '',
            user_agent: typeof window !== 'undefined' ? navigator.userAgent : '',
            timestamp: Date.now(),
            session_id: typeof window !== 'undefined' ? 
              (window as any).sessionStorage?.getItem('session_id') || 
              `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
              `server_${Date.now()}`
          }
        };

        console.log('Prepared survey data:', surveyData);
        console.log('Form submission data:', formSubmissionData);

        // Save survey data to lead_submission_data
        await saveLeadSubmissionData(
          supabase,
          submissionId,
          partnerInfo.user_id,
          serviceCategoryId,
          {
            survey_data: surveyData,
            form_submissions: [formSubmissionData]
          },
          'enquiry',
          ['quote', 'products', 'addons', 'survey']
        );

        console.log('Survey data saved successfully');

        // Send survey email and wait for completion before redirecting
        console.log('=== SENDING SURVEY EMAIL ===')
        try {
          const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
          const subdomain = hostname || null
          const isIframe = typeof window !== 'undefined' ? window.self !== window.top : false

          const emailData = {
            first_name: surveyDetails.firstName,
            last_name: surveyDetails.lastName,
            email: surveyDetails.email,
            phone: surveyDetails.phone,
            postcode: surveyDetails.postcode,
            notes: surveyDetails.notes || '',
            submission_id: submissionId,
            subdomain,
            is_iframe: isIframe,
            order_details: {
              product: selectedProduct ? {
                id: selectedProduct.partner_product_id,
                name: selectedProduct.name,
                price: selectedProduct.price || 0
              } : null,
              addons: selectedAddons && selectedAddons.length > 0 ? selectedAddons.map(addon => ({
                title: addon.title,
                quantity: addon.quantity,
                price: addon.price
              })) : [],
              bundles: selectedBundles && selectedBundles.length > 0 ? selectedBundles.map(bundle => ({
                title: bundle.bundle.title,
                quantity: bundle.quantity,
                unitPrice: bundle.unitPrice || 0
              })) : [],
              total: (selectedProduct?.price || 0) + (selectedAddons?.reduce((sum, a) => sum + (a.price * a.quantity), 0) || 0) + (selectedBundles?.reduce((sum, b) => sum + (b.unitPrice * b.quantity), 0) || 0)
            }
          };

          console.log('Sending survey email to: /api/email/boiler/survey-submitted-v2')
          const emailResponse = await fetch('/api/email/boiler/survey-submitted-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData),
          });

          if (emailResponse.ok) {
            console.log('Survey email sent successfully')
          } else {
            console.warn('Failed to send survey email:', await emailResponse.text())
          }
        } catch (emailError) {
          console.warn('Error sending survey email:', emailError)
        }

        // Redirect to enquiry page after email is sent
        console.log('=== REDIRECTING TO ENQUIRY PAGE ===')
        const url = new URL('/boiler/enquiry', window.location.origin);
        if (submissionId) url.searchParams.set('submission', submissionId);
        window.location.href = url.toString();
      } else {
        console.error('Missing submissionId, partnerInfo, or serviceCategoryId for survey');
        alert('Error: Missing required information for survey submission');
      }
    } catch (error) {
      console.error('Error processing survey submission:', error);
      alert('Error processing survey submission. Please try again.');
    }
  };

  return (
    <>
      {/* Iframe Navigation Tracker */}
      <IframeNavigationTracker categorySlug="boiler" />
      
      <SurveyLayout
        selectedProduct={selectedProduct}
        selectedAddons={selectedAddons}
        selectedBundles={selectedBundles}
        companyColor={partnerInfo.company_color}
        partnerSettings={partnerSettings}
        currentCalculatorSettings={currentCalculatorSettings}
        prefillUserInfo={prefillUserInfo}
        submissionId={submissionId || undefined}
        onSurveySubmit={handleSurveySubmit}
        backHref="/boiler/products"
        backLabel="Back to Products"
        showBack={true}
      />
    </>
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
