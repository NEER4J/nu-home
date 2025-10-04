'use client'

import { useMemo, useState, useEffect } from 'react'
import Image from 'next/image'
import { MinusCircle, PlusCircle, Info, ChevronRight, X, CheckCircle, Calculator, Check } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import FinanceCalculator from '@/components/FinanceCalculator'
import OrderSummarySidebar from '@/components/category-commons/checkout/OrderSummarySidebar'
import AddonTypeInfoPopup from './AddonTypeInfoPopup'

export type BundleDiscountType = 'fixed' | 'percent'

export interface AddonTypeLite {
  id: string
  name: string
  allow_multiple_selection: boolean
  info?: string // Add info field
}

export interface CategoryLite {
  service_category_id: string
  name: string
  addon_types: AddonTypeLite[]
}

export interface AddonLite {
  addon_id: string
  title: string
  description: string
  price: number
  image_link: string | null
  allow_multiple: boolean
  max_count: number | null
  addon_type_id: string
}

export interface BundleAddonItemLite {
  bundle_addon_id: string
  bundle_id: string
  addon_id: string
  quantity: number
  Addons?: AddonLite
}

export interface BundleLite {
  bundle_id: string
  partner_id: string
  title: string
  description: string | null
  discount_type: BundleDiscountType
  discount_value: number
  service_category_id: string | null
  BundlesAddons?: BundleAddonItemLite[]
}

export interface SelectedProductLite {
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

export interface AddonsLayoutProps {
  category: CategoryLite | null
  addons: AddonLite[]
  bundles?: BundleLite[]
  selectedAddons: Record<string, number>
  selectedBundles?: Record<string, number>
  selectedProduct?: SelectedProductLite | null
  companyColor?: string | null
  partnerSettings?: {
    apr_settings: Record<number, number> | null
  } | null
  onChangeAddonQuantity: (addon: AddonLite, change: number) => void
  onToggleBundle?: (bundle: BundleLite) => void
  onChangeBundleQuantity?: (bundleId: string, change: number) => void
  onContinue: (selectedAddons: (AddonLite & { quantity: number })[], selectedBundles: { bundle: BundleLite, quantity: number, unitPrice: number }[]) => void
  onCalculatorPlanChange?: (plan: { months: number; apr: number }) => void
  onCalculatorDepositChange?: (deposit: number) => void
  onCalculatorMonthlyPaymentUpdate?: (monthlyPayment: number) => void
  currentCalculatorSettings?: {
    selected_plan?: { months: number; apr: number } | null
    selected_deposit?: number
  } | null
  backHref?: string
  backLabel?: string
  showBack?: boolean
  isLoading?: boolean
}

function getImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return url
  return `/${url}`
}

function calculateMonthlyPayment(price: number, months: number, apr: number, depositPercentage: number): number {
  if (depositPercentage > 0) {
    const depositAmount = (price * depositPercentage) / 100
    const loanAmount = price - depositAmount
    const monthlyRate = apr / 100 / 12
    return (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
           (Math.pow(1 + monthlyRate, months) - 1)
  } else {
    const monthlyRate = apr / 100 / 12
    return (price * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
           (Math.pow(1 + monthlyRate, months) - 1)
  }
}

export default function AddonsLayout({
  category,
  addons,
  bundles = [],
  selectedAddons,
  selectedBundles = {},
  selectedProduct = null,
  companyColor = null,
  partnerSettings = null,
  onChangeAddonQuantity,
  onToggleBundle,
  onChangeBundleQuantity,
  onContinue,
  onCalculatorPlanChange,
  onCalculatorDepositChange,
  onCalculatorMonthlyPaymentUpdate,
  currentCalculatorSettings = null,
  backHref = '/',
  backLabel = 'Back',
  showBack = true,
  isLoading = false,
}: AddonsLayoutProps) {
  const classes = useDynamicStyles(companyColor || null)

  const [showFinanceCalculator, setShowFinanceCalculator] = useState(false)
  const [showAddonTypeInfo, setShowAddonTypeInfo] = useState(false)
  const [selectedAddonType, setSelectedAddonType] = useState<AddonTypeLite | null>(null)
  const [showAddonDescription, setShowAddonDescription] = useState(false)
  const [selectedAddonDescription, setSelectedAddonDescription] = useState<{ name: string; info: string } | null>(null)
  const [showBundleDescription, setShowBundleDescription] = useState(false)
  const [selectedBundleDescription, setSelectedBundleDescription] = useState<{
    title: string
    description: string
    items: any[]
    discount: number
    unitPrice: number
    subtotal: number
  } | null>(null)

  const addonsByType = useMemo(() => {
    return addons.reduce((acc, addon) => {
      if (!acc[addon.addon_type_id]) acc[addon.addon_type_id] = []
      acc[addon.addon_type_id].push(addon)
      return acc
    }, {} as Record<string, AddonLite[]>)
  }, [addons])

  const selectedAddonsList = useMemo(() => {
    return Object.entries(selectedAddons)
      .filter(([_, qty]) => qty > 0)
      .map(([addonId, qty]) => {
        const addon = addons.find(a => a.addon_id === addonId)
        if (!addon) return null
        return { ...addon, quantity: qty }
      })
      .filter(Boolean) as (AddonLite & { quantity: number })[]
  }, [selectedAddons, addons])


  const addonsTotal = useMemo(() => selectedAddonsList.reduce((sum, a) => sum + a.quantity * a.price, 0), [selectedAddonsList])
  const basePrice = useMemo(() => {
    if (selectedProduct?.selected_power?.price) {
      return selectedProduct.selected_power.price
    }
    return (typeof selectedProduct?.price === 'number' ? selectedProduct.price : 0)
  }, [selectedProduct?.price, selectedProduct?.selected_power?.price])

  const getBundleUnitPrice = (bundle: BundleLite): number => {
    const items = bundle.BundlesAddons || []
    const subtotal = items.reduce((s, i) => s + (i.Addons?.price || 0) * (i.quantity || 0), 0)
    const dv = Number(bundle.discount_value || 0)
    const discount = bundle.discount_type === 'percent' ? Math.min(subtotal * (dv / 100), subtotal) : Math.min(dv, subtotal)
    return Math.max(0, subtotal - discount)
  }

  const selectedBundlesList = useMemo(() => {
    return Object.entries(selectedBundles)
      .filter(([_, qty]) => qty > 0)
      .map(([bundleId, quantity]) => {
        const bundle = bundles.find(b => b.bundle_id === bundleId)
        if (!bundle) return null
        return { bundle, quantity, unitPrice: getBundleUnitPrice(bundle) }
      })
      .filter(Boolean) as { bundle: BundleLite, quantity: number, unitPrice: number }[]
  }, [selectedBundles, bundles])

  const bundlesTotal = useMemo(() => selectedBundlesList.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0), [selectedBundlesList])
  const orderTotal = useMemo(() => Math.max(0, basePrice + addonsTotal + bundlesTotal), [basePrice, addonsTotal, bundlesTotal])
  
  // Calculate monthly payment using finance calculator settings and total order price
  const monthlyPayment = useMemo(() => {
    // Use total order price (product + addons + bundles) for monthly payment calculation
    const totalOrderPrice = orderTotal
    
    if (!selectedProduct?.calculator_settings?.selected_plan || !totalOrderPrice) {
      console.log('Monthly payment calculation - missing data:', {
        hasCalculatorSettings: !!selectedProduct?.calculator_settings,
        hasSelectedPlan: !!selectedProduct?.calculator_settings?.selected_plan,
        hasTotalPrice: !!totalOrderPrice,
        calculatorSettings: selectedProduct?.calculator_settings,
        totalOrderPrice,
        orderTotal
      })
      return null
    }
    
    const { months, apr } = selectedProduct.calculator_settings.selected_plan
    const depositPercentage = selectedProduct.calculator_settings.selected_deposit || 0
    
    const calculated = calculateMonthlyPayment(totalOrderPrice, months, apr, depositPercentage)
    console.log('Monthly payment calculated:', {
      totalOrderPrice,
      months,
      apr,
      depositPercentage,
      monthlyPayment: calculated
    })
    
    return calculated
  }, [selectedProduct?.calculator_settings, orderTotal])

  const bundleIncludedAddonIds = useMemo(() => {
    const set = new Set<string>()
    selectedBundlesList.forEach(({ bundle }) => {
      (bundle.BundlesAddons || []).forEach(i => set.add(i.addon_id))
    })
    return set
  }, [selectedBundlesList])

  // Debug: Log when monthly payment changes
  useEffect(() => {
    console.log('Monthly payment changed:', monthlyPayment)
  }, [monthlyPayment])

  // Handle info button click
  const handleInfoClick = (addonType: AddonTypeLite) => {
    setSelectedAddonType(addonType)
    setShowAddonTypeInfo(true)
  }

  // Close info popup
  const closeAddonTypeInfo = () => {
    setShowAddonTypeInfo(false)
    setSelectedAddonType(null)
  }

  return (
    <div className="mx-auto lg:flex lg:gap-8 p-0">
      <div className="flex-1">
        {showBack && (
          <div className="mb-6">
            <a href={backHref} className={`inline-flex items-center ${classes.link}`}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {backLabel}
            </a>
          </div>
        )}

        {bundles.length > 0 && (
          <div className="mb-8 border-b pb-8 border-gray-200 last:border-b-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Bundles</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bundles.map((b) => {
                const items = b.BundlesAddons || []
                const images = items.map(i => i.Addons?.image_link).filter(Boolean).slice(0, 4) as string[]
                const subtotal = items.reduce((s, i) => s + (i.Addons?.price || 0) * (i.quantity || 0), 0)
                const dv = Number(b.discount_value || 0)
                const discount = b.discount_type === 'percent' ? Math.min(subtotal * (dv / 100), subtotal) : Math.min(dv, subtotal)
                const unitPrice = Math.max(0, subtotal - discount)
                const selectedQty = selectedBundles[b.bundle_id] || 0
                const hasDescription = b.description && b.description.trim().length > 0
                
                return (
                  <div key={b.bundle_id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-gray-900">{b.title}</h3>
                      {hasDescription && (
                        <button 
                          className="text-sm text-gray-400 hover:text-gray-600 underline mt-1"
                          onClick={() => {
                            setSelectedBundleDescription({
                              title: b.title,
                              description: b.description || '',
                              items: items,
                              discount: discount,
                              unitPrice: unitPrice,
                              subtotal: subtotal
                            })
                            setShowBundleDescription(true)
                          }}
                        >
                          More details
                        </button>
                      )}
                    </div>
                    <div className="bg-white flex items-center px-5">
                      <div className="flex gap-2 flex-wrap justify-start">
                        {[0,1,2].map((n, idx) => (
                          <div key={idx} className=" bg-gray-200 rounded-2xl p-2 w-[calc(100%/3-6px)]">
                            {images[idx] ? (
                              <img src={images[idx] as string} alt="Bundle" className="w-full h-full object-contain p-2" />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-5">
                      <ul className="mt-3 space-y-2">
                        {items.map((i) => (
                          <li key={i.bundle_addon_id} className="flex items-start gap-2 text-sm text-gray-800">
                            <Check className="w-4 h-4 text-green-600 mt-0.5" />
                            <span>
                              {i.Addons?.title || 'Addon'}
                              {i.quantity && i.quantity > 1 ? ` × ${i.quantity}` : ''}
                              {typeof i.Addons?.price === 'number' && (
                                <span className="text-gray-500"> (worth £{(i.Addons!.price as number).toFixed(0)})</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-xl font-semibold text-gray-900">£{unitPrice.toFixed(0)}</div>
                          {discount > 0 && (
                            <span className={`text-xs px-2 py-1 rounded-full ${classes.badge}`}>Save £{discount.toFixed(0)}</span>
                          )}
                        </div>
                        <div>
                          {onToggleBundle && (
                            selectedQty > 0 ? (
                              <button className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${classes.bgLight} ${classes.textColored}`} onClick={() => onToggleBundle(b)}>Remove</button>
                            ) : (
                              <button className={`px-4 py-2 rounded-full ${classes.button} ${classes.buttonText}`} onClick={() => onToggleBundle(b)}>Add</button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {category?.addon_types.map((type) => {
          const typeAddons = addonsByType[type.id] || []
          if (typeAddons.length === 0) return null
          return (
            <div key={type.id} className="mb-8 border-b pb-8 border-gray-200 last:border-b-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-medium text-gray-900">{type.name}</h2>
                  <button 
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                    onClick={() => handleInfoClick(type)}
                    title={`Learn more about ${type.name}`}
                  >
                    <Info size={18} />
                  </button>
                </div>
               
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {typeAddons.map((addon) => {
                  const isSelected = (selectedAddons[addon.addon_id] || 0) > 0
                  const quantity = selectedAddons[addon.addon_id] || 0
                  const isInBundle = bundleIncludedAddonIds.has(addon.addon_id)
                  const hasDescription = addon.description && addon.description.trim().length > 0
                  
                  return (
                    <div key={addon.addon_id} className="bg-white rounded-2xl border border-gray-100">
                      {/* Header - Name */}
                      <div className="p-5">
                        <h3 className="text-lg font-medium text-gray-900 line-clamp-2">{addon.title}</h3>
                        {hasDescription && (
                          <button 
                            className="text-sm text-gray-400 hover:text-gray-600 underline mt-1"
                            onClick={() => {
                              setSelectedAddonDescription({
                                name: addon.title,
                                info: addon.description || ''
                              })
                              setShowAddonDescription(true)
                            }}
                          >
                            More details
                          </button>
                        )}
                      </div>

                      {/* Image Section */}
                      <div className="relative px-4">
                        <div className="relative h-40 w-full flex items-center justify-center bg-white">
                          <Image src={getImageUrl(addon.image_link) || '/placeholder-image.jpg'} alt={addon.title} fill className="object-contain p-5" />
                        </div>
                      
                      </div>

                      {/* Footer - Price and Button */}
                      <div className="p-5">
                        {isInBundle && (
                          <div className="mb-3">
                            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${classes.badge}`}>Included in bundle</span>
                          </div>
                        )}

                         
                        {addon.allow_multiple && isInBundle && (
                          <p className={`text-xs mt-2 ${classes.textColored}`}>You can add more.</p>
                        )}
                        
                        <div className="flex items-center justify-between gap-2">
                          {/* Price */}
                          <div className="text-lg font-semibold text-gray-900">
                            £{addon.price.toFixed(2)}
                          </div>
                          
                          {/* Action Button */}
                          <div>
                            {!addon.allow_multiple ? (
                              <button
                                className={`px-4 py-2 rounded-full transition-colors ${isSelected ? `${classes.bgLight} ${classes.textColored}` : (isInBundle && !addon.allow_multiple ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : `${classes.button} ${classes.buttonText}`)}`}
                                onClick={() => {
                                  if (!isSelected && isInBundle && !addon.allow_multiple) return
                                  onChangeAddonQuantity(addon, isSelected ? -1 : 1)
                                }}
                                disabled={!isSelected && isInBundle && !addon.allow_multiple}
                                title={!isSelected && isInBundle && !addon.allow_multiple ? 'Included in selected bundle' : undefined}
                              >
                                {isSelected ? 'Added' : (isInBundle ? 'Included' : 'Add')}
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                {quantity > 0 ? (
                                  <>
                                    {/* Minus button - show for all quantities */}
                                    <button
                                      onClick={() => onChangeAddonQuantity(addon, -1)}
                                      className="w-10 h-10 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-700 flex items-center justify-center transition-colors"
                                      title="Remove one"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                      </svg>
                                    </button>
                                    
                                    {/* Quantity display */}
                                    <span className="text-base font-medium text-gray-900 min-w-[24px] text-center">
                                      {quantity}
                                    </span>
                                    
                                    {/* Plus button - show for all quantities */}
                                    <button
                                      onClick={() => onChangeAddonQuantity(addon, 1)}
                                      className="w-10 h-10 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-700 flex items-center justify-center transition-colors"
                                      disabled={addon.max_count ? quantity >= addon.max_count : false}
                                      title="Add one more"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                      </svg>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className={`px-4 py-2 rounded-full transition-colors ${isInBundle && !addon.allow_multiple ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : `${classes.button} ${classes.buttonText}`}`}
                                    onClick={() => {
                                      if (isInBundle && !addon.allow_multiple) return
                                      onChangeAddonQuantity(addon, 1)
                                    }}
                                    disabled={isInBundle && !addon.allow_multiple}
                                    title={isInBundle && !addon.allow_multiple ? 'Included in bundle' : 'Add to selection'}
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                
                        

                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {addons.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No add-ons available for this category</p>
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-[400px] flex-shrink-0">
        <OrderSummarySidebar
          selectedProduct={selectedProduct}
          selectedAddons={selectedAddonsList}
          selectedBundles={selectedBundlesList}
          companyColor={companyColor}
          partnerSettings={partnerSettings}
          currentCalculatorSettings={currentCalculatorSettings}
          onContinue={() => onContinue(selectedAddonsList, selectedBundlesList)}
          onAddonQuantityChange={onChangeAddonQuantity}
          onBundleQuantityChange={onChangeBundleQuantity}
          onToggleBundle={onToggleBundle}
          onOpenFinanceCalculator={() => setShowFinanceCalculator(true)}
          continueButtonText="Continue to Installation"
          showContinueButton={true}
          showInstallationIncluded={true}
          isLoading={isLoading}
          showMobileCard={false}
        />
                 </div>
                 
      {/* Mobile Card - Always visible on mobile */}
      <div className="lg:hidden">
        <OrderSummarySidebar
          selectedProduct={selectedProduct}
          selectedAddons={selectedAddonsList}
          selectedBundles={selectedBundlesList}
          companyColor={companyColor}
          partnerSettings={partnerSettings}
          currentCalculatorSettings={currentCalculatorSettings}
          onContinue={() => onContinue(selectedAddonsList, selectedBundlesList)}
          onAddonQuantityChange={onChangeAddonQuantity}
          onBundleQuantityChange={onChangeBundleQuantity}
          onToggleBundle={onToggleBundle}
          onOpenFinanceCalculator={() => setShowFinanceCalculator(true)}
          continueButtonText="Continue to Installation"
          showContinueButton={true}
          showInstallationIncluded={true}
          isLoading={isLoading}
          showMobileCard={true}
        />
       </div>


      
      {/* Finance Calculator Modal */}
                {selectedProduct && (
        <FinanceCalculator
          isOpen={showFinanceCalculator}
          onClose={() => setShowFinanceCalculator(false)}
          productPrice={orderTotal}
          productName={`${selectedProduct.name} + Add-ons`}
          productImageUrl={selectedProduct.image_url}
          aprSettings={partnerSettings?.apr_settings || null}
          brandColor={companyColor || undefined}
          selectedPlan={currentCalculatorSettings?.selected_plan || selectedProduct.calculator_settings?.selected_plan || undefined}
          selectedDeposit={currentCalculatorSettings?.selected_deposit ?? selectedProduct.calculator_settings?.selected_deposit ?? 0}
          onPlanChange={onCalculatorPlanChange}
          onDepositChange={onCalculatorDepositChange}
          onMonthlyPaymentUpdate={onCalculatorMonthlyPaymentUpdate}
        />
      )}

      {/* Addon Type Info Popup */}
      <AddonTypeInfoPopup
        isOpen={showAddonTypeInfo}
        onClose={closeAddonTypeInfo}
        addonType={selectedAddonType ? {
          name: selectedAddonType.name,
          info: selectedAddonType.info
        } : null}
      />

      {/* Addon Description Popup */}
      <AddonTypeInfoPopup
        isOpen={showAddonDescription}
        onClose={() => {
          setShowAddonDescription(false)
          setSelectedAddonDescription(null)
        }}
        addonType={selectedAddonDescription}
      />
      
      {/* Bundle Description Popup */}
      <AddonTypeInfoPopup
        isOpen={showBundleDescription}
        onClose={() => {
          setShowBundleDescription(false)
          setSelectedBundleDescription(null)
        }}
        addonType={selectedBundleDescription ? {
          name: selectedBundleDescription.title,
          info: selectedBundleDescription.description
        } : null}
        bundleItems={selectedBundleDescription?.items || null}
        bundlePricing={selectedBundleDescription ? {
          subtotal: selectedBundleDescription.subtotal,
          discount: selectedBundleDescription.discount,
          unitPrice: selectedBundleDescription.unitPrice
        } : null}
      />
    </div>
  )
}


