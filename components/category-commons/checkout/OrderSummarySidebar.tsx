'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { MinusCircle, PlusCircle, Info, ChevronRight, X, Calculator, ChevronDown, Loader2 } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'

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

export interface BundleLite {
  bundle_id: string
  partner_id: string
  title: string
  description: string | null
  discount_type: 'fixed' | 'percent'
  discount_value: number
  service_category_id: string | null
  BundlesAddons?: {
    bundle_addon_id: string
    bundle_id: string
    addon_id: string
    quantity: number
    Addons?: AddonLite
  }[]
}

export interface SelectedProductLite {
  partner_product_id: string
  partner_id: string
  name: string
  price: number | null
  image_url: string | null
  product_fields?: Record<string, unknown>
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
  [key: string]: any
}

export interface OrderSummarySidebarProps {
  selectedProduct?: SelectedProductLite | null
  selectedAddons: (AddonLite & { quantity: number })[]
  selectedBundles: { bundle: BundleLite, quantity: number, unitPrice: number }[]
  companyColor?: string | null
  partnerSettings?: {
    apr_settings: Record<number, number> | null
  } | null
  currentCalculatorSettings?: {
    selected_plan?: { months: number; apr: number } | null
    selected_deposit?: number
  } | null
  onContinue: () => void
  onAddonQuantityChange?: (addon: AddonLite, change: number) => void
  onBundleQuantityChange?: (bundleId: string, change: number) => void
  onToggleBundle?: (bundle: BundleLite) => void
  onOpenFinanceCalculator?: () => void
  continueButtonText?: string
  showContinueButton?: boolean
  showInstallationIncluded?: boolean
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

export default function OrderSummarySidebar({
  selectedProduct,
  selectedAddons,
  selectedBundles,
  companyColor = null,
  partnerSettings = null,
  currentCalculatorSettings = null,
  onContinue,
  onAddonQuantityChange,
  onBundleQuantityChange,
  onToggleBundle,
  onOpenFinanceCalculator,
  continueButtonText = "Continue to Installation",
  showContinueButton = true,
  showInstallationIncluded = true,
  isLoading = false,
}: OrderSummarySidebarProps) {
  const classes = useDynamicStyles(companyColor || null)

  const basePrice = useMemo(() => {
    if (selectedProduct?.selected_power?.price) {
      return selectedProduct.selected_power.price
    }
    return (typeof selectedProduct?.price === 'number' ? selectedProduct.price : 0)
  }, [selectedProduct?.price, selectedProduct?.selected_power?.price])

  const addonsTotal = useMemo(() => selectedAddons.reduce((sum, a) => sum + a.quantity * a.price, 0), [selectedAddons])
  const bundlesTotal = useMemo(() => selectedBundles.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0), [selectedBundles])
  const orderTotal = useMemo(() => Math.max(0, basePrice + addonsTotal + bundlesTotal), [basePrice, addonsTotal, bundlesTotal])

  // Calculate monthly payment using finance calculator settings and total order price
  const monthlyPayment = useMemo(() => {
    // Use total order price (product + addons + bundles) for monthly payment calculation
    const totalOrderPrice = orderTotal
    
    // Use current calculator settings if available, otherwise fall back to selectedProduct settings
    const calculatorSettings = currentCalculatorSettings || selectedProduct?.calculator_settings
    
    if (!calculatorSettings?.selected_plan || !totalOrderPrice) {
      return null
    }
    
    const { months, apr } = calculatorSettings.selected_plan
    const depositPercentage = calculatorSettings.selected_deposit || 0
    
    return calculateMonthlyPayment(totalOrderPrice, months, apr, depositPercentage)
  }, [currentCalculatorSettings, selectedProduct?.calculator_settings, orderTotal])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-gray-900">Install total</h2>
          
        </div>
      </div>

      {selectedProduct || selectedAddons.length > 0 || selectedBundles.length > 0 ? (
        <>
          <div className="">
            <div className="flex items-end justify-around mb-3 border border-gray-200 p-4 rounded-lg ">
              {/* Left Section - Fixed Price */}
              <div className="border-r border-gray-200 pr-4">
                <p className="text-xs text-gray-600 mb-1">Fixed price (inc. VAT)</p>
                <div className="flex items-end gap-2">
                  <span className="text-xl font-medium text-gray-900">£{orderTotal.toFixed(2)}</span>
                  <span className="text-xs text-red-500 line-through">£{(orderTotal + 250).toFixed(2)}</span>
                </div>
              </div>
              
              {/* Right Section - Monthly Price */}
              {monthlyPayment && (
                <div className="text-left">
                  <p className="text-xs text-gray-600 mb-1">or, monthly from</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-medium text-gray-900">£{monthlyPayment.toFixed(2)}</span>
                    {selectedProduct && onOpenFinanceCalculator && (
                      <button
                        onClick={onOpenFinanceCalculator}
                        className="p-1 text-lg font-medium text-gray-900:bg-gray-100 rounded transition-colors"
                        title="Open Finance Calculator"
                      >
                        <ChevronDown size={16} className="text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {showContinueButton && (
              <button
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                onClick={onContinue}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    {continueButtonText} <ChevronRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-6 mt-3">
            {selectedProduct && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Your package</h3>
                <div className="flex items-center gap-4">
                  <div className="relative h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md p-2">
                    <Image src={getImageUrl(selectedProduct.image_url) || '/placeholder-image.jpg'} alt={selectedProduct.name} fill className="object-contain  !relative" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 truncate">{selectedProduct.name}</h4>
                    <p className="text-gray-600 text-xs">
                      {selectedProduct.selected_power && ` (${selectedProduct.selected_power.power}kW)`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedBundles.map(({ bundle, quantity, unitPrice }) => (
              <div key={bundle.bundle_id}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">{bundle.title}</h3>
                  {onToggleBundle && (
                    <button onClick={() => onToggleBundle(bundle)} className="text-sm text-gray-600 underline">Remove</button>
                  )}
                </div>
                <div className="space-y-2">
                  {(bundle.BundlesAddons || []).map((i) => (
                    <div key={i.bundle_addon_id} className="flex items-center gap-4">
                      <div className="relative h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md p-2">
                        {i.Addons?.image_link ? (
                          <img src={i.Addons.image_link} alt={i.Addons?.title || 'Addon'} className="h-full w-full object-cover" />
                        ) : (
                          <div className="text-[10px] text-gray-400">No image</div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">{i.Addons?.title || 'Addon'}</h4>
                        <p className="text-gray-600 text-xs">test</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {selectedAddons.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Your add-ons</h3>
                <div className="space-y-2">
                                    {selectedAddons.map(addon => (
                    <div key={addon.addon_id} className="flex items-center gap-4">
                      <div className="relative h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md p-2">
                        <Image src={getImageUrl(addon.image_link) || '/placeholder-image.jpg'} alt={addon.title} fill className="object-contain !relative" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">{addon.title}</h4>
                        <p className="text-gray-600 text-xs">{addon.quantity} × £{addon.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {addon.allow_multiple && onAddonQuantityChange ? (
                          <>
                            <button onClick={() => onAddonQuantityChange(addon, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 text-lg font-medium text-gray-900:text-gray-700 bg-white border border-gray-200">
                              <MinusCircle size={14} />
                            </button>
                            <span className="w-6 text-center text-sm">{addon.quantity}</span>
                            <button onClick={() => onAddonQuantityChange(addon, 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 text-lg font-medium text-gray-900:text-gray-700 bg-white border border-gray-200" disabled={addon.max_count ? addon.quantity >= addon.max_count : false}>
                              <PlusCircle size={14} />
                            </button>
                          </>
                        ) : onAddonQuantityChange ? (
                          <button onClick={() => onAddonQuantityChange(addon, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 text-lg font-medium text-gray-900:text-gray-700 bg-white border border-gray-200">
                            <X size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What's Included Section - At the end */}
            {selectedProduct?.product_fields && (() => {
              const includedItems = (selectedProduct.product_fields as any)?.what_s_included
              
              if (Array.isArray(includedItems) && includedItems.length > 0) {
                return (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">What's Included in Your Installation</h3>
                    <div className="space-y-2">
                      {includedItems.map((item: any, index: number) => {
                        const itemData = item.items || item
                        const { image, title, subtitle } = itemData
                        return (
                          <div key={index} className="flex items-center gap-4">
                            {image && (
                              <div className="relative h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md p-2">
                                <img 
                                  src={image} 
                                  alt={title} 
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-grow min-w-0">
                              <h4 className="font-medium text-sm text-gray-900 truncate">{title}</h4>
                              {subtitle && (
                                <p className="text-gray-600 text-xs truncate">{subtitle}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }
              return null
            })()}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No items selected</p>
        </div>
      )}
    </div>
  )
}
