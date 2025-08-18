'use client'

import { useMemo, useState, useEffect } from 'react'
import Image from 'next/image'
import { MinusCircle, PlusCircle, Info, ShoppingCart, ChevronRight, X, CheckCircle, Calculator } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import FinanceCalculator from '@/components/FinanceCalculator'
import OrderSummarySidebar from '@/components/category-commons/checkout/OrderSummarySidebar'

export type BundleDiscountType = 'fixed' | 'percent'

export interface AddonTypeLite {
  id: string
  name: string
  allow_multiple_selection: boolean
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
  const [showCart, setShowCart] = useState(false)
  const [showFinanceCalculator, setShowFinanceCalculator] = useState(false)

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

  const itemsCount = useMemo(() => selectedAddonsList.reduce((n, a) => n + a.quantity, 0), [selectedAddonsList])
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

  return (
    <div className="container mx-auto px-4 py-8 pb-32 lg:pb-8 lg:flex lg:gap-8">
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
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Bundles</h2>
              <span className={`text-sm ${classes.textColored}`}>Save with pre-selected add-ons</span>
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
                return (
                  <div key={b.bundle_id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="bg-white h-48 sm:h-56 flex items-center justify-center">
                      <div className="flex -space-x-6">
                        {[0,1,2].map((n, idx) => (
                          <div key={idx} className="w-36 h-24 sm:w-44 sm:h-28 rounded-xl bg-gray-50 border flex items-center justify-center">
                            {images[idx] ? (
                              <img src={images[idx] as string} alt="Bundle" className="w-full h-full object-contain p-2" />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-gray-900">{b.title}</h3>
                      <ul className="mt-3 space-y-2">
                        {items.map((i) => (
                          <li key={i.bundle_addon_id} className="flex items-start gap-2 text-sm text-gray-800">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
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
            <div key={type.id} className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-medium text-gray-900">{type.name}</h2>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Info size={18} />
                  </button>
                </div>
                {!type.allow_multiple_selection && (
                  <div className={`text-sm px-3 py-1 rounded-full ${classes.badge}`}>Select one only</div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {typeAddons.map((addon) => {
                  const isSelected = (selectedAddons[addon.addon_id] || 0) > 0
                  const quantity = selectedAddons[addon.addon_id] || 0
                  const isInBundle = bundleIncludedAddonIds.has(addon.addon_id)
                  return (
                    <div key={addon.addon_id} className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border ${isSelected ? 'border-blue-500' : 'border-gray-100'}`}>
                      <div className="relative p-4 bg-white rounded-t-xl">
                        <div className="relative h-48 w-full flex items-center justify-center bg-white">
                          <Image src={getImageUrl(addon.image_link) || '/placeholder-image.jpg'} alt={addon.title} fill className="object-contain p-2" />
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {addon.allow_multiple && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white rounded-full shadow-sm border border-gray-100 p-1">
                            <button onClick={() => onChangeAddonQuantity(addon, -1)} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50" disabled={!quantity}>
                              <MinusCircle size={18} />
                            </button>
                            <span className="w-6 text-center font-medium text-sm">{quantity}</span>
                            <button onClick={() => onChangeAddonQuantity(addon, 1)} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700" disabled={addon.max_count ? quantity >= addon.max_count : false}>
                              <PlusCircle size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{addon.title}</h3>
                          <p className="text-lg font-semibold text-gray-900">£{addon.price.toFixed(2)}</p>
                        </div>
                        {isInBundle && (
                          <div className="mb-2">
                            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${classes.badge}`}>Included in bundle</span>
                          </div>
                        )}
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{addon.description}</p>
                        {!addon.allow_multiple && (
                          <button
                            className={`w-full py-2.5 px-4 rounded-lg transition-colors ${isSelected ? `${classes.bgLight} ${classes.textColored}` : (isInBundle ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : `${classes.button} ${classes.buttonText}`)}`}
                            onClick={() => {
                              if (!isSelected && isInBundle) return
                              onChangeAddonQuantity(addon, isSelected ? -1 : 1)
                            }}
                            disabled={!isSelected && isInBundle}
                            title={!isSelected && isInBundle ? 'Included in selected bundle' : undefined}
                          >
                            {isSelected ? 'Added' : (isInBundle ? 'Included' : 'Add to Quote')}
                          </button>
                        )}
                        {addon.max_count && <p className="text-xs text-gray-500 text-center mt-2">Maximum: {addon.max_count}</p>}
                        {addon.allow_multiple && isInBundle && (
                          <p className={`text-xs text-center mt-2 ${classes.textColored}`}>Included in bundle; you can add more.</p>
                        )}
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
        />
       </div>

      {(selectedProduct || selectedAddonsList.length > 0 || selectedBundlesList.length > 0) && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-10">
          <div className="container mx-auto flex justify-between items-center">
            <button onClick={() => setShowCart(!showCart)} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg relative">
              <ShoppingCart size={20} />
              <span>Cart</span>
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{itemsCount}</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
              <div>
                <p className="text-sm text-gray-500">Your order</p>
                  <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">£{orderTotal.toFixed(2)}</p>
                {monthlyPayment && (
                      <>
                        <span className="text-sm text-gray-500">or</span>
                        <p className="text-lg font-bold text-green-600">£{monthlyPayment.toFixed(0)}/mo</p>
                      </>
                    )}
                  </div>
                </div>
                {selectedProduct && (
                  <button
                    onClick={() => setShowFinanceCalculator(true)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    title="Open Finance Calculator"
                  >
                    <Calculator size={16} className="text-gray-600" />
                  </button>
                )}
              </div>

              
              <button
                className={`${classes.button} ${classes.buttonText} px-6 py-2.5 rounded-lg flex items-center gap-1`}
                onClick={() => onContinue(selectedAddonsList, selectedBundlesList)}
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
          {showCart && (
            <div className="container mx-auto mt-4 bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900">Your Selected Items</h3>
                <button onClick={() => setShowCart(false)} className="text-gray-500"><X size={18} /></button>
              </div>
              
                             {/* Main Product Price Display - Mobile */}
               {selectedProduct && (
                 <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                   <div className="text-center">
                     <h4 className="font-semibold text-gray-900 text-base mb-2">{selectedProduct.name}</h4>
                     {(() => {
                       const productPrice = selectedProduct.selected_power?.price || selectedProduct.price
                       if (typeof productPrice === 'number') {
                         return (
                           <div className="space-y-2">
                             <div className="flex items-center justify-center gap-2">
                               <p className="text-xl font-bold text-blue-600">£{productPrice.toFixed(0)}</p>
                               {/* Monthly Payment Display */}
                               {monthlyPayment && (
                                 <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
                                   <span className="text-xs text-green-700 font-medium">or</span>
                                   <span className="text-sm font-bold text-green-700">£{monthlyPayment.toFixed(0)}/mo</span>
                                 </div>
                               )}
                             </div>
                         {selectedProduct.selected_power && (
                           <>
                             <p className="text-sm text-gray-600">{selectedProduct.selected_power.power}kW</p>
                             {selectedProduct.selected_power.additional_cost > 0 && (
                               <p className="text-xs text-orange-600">+£{selectedProduct.selected_power.additional_cost} additional</p>
                             )}
                           </>
                         )}
                           </div>
                         )
                       }
                       return null
                         })()}
                     
                     {/* Additional Product Details - Mobile */}
                     <div className="mt-3 text-left text-xs">
                       <div className="space-y-1 text-gray-600">
                         {selectedProduct.selected_power && (
                           <>
                             <div className="flex justify-between">
                               <span>Power:</span>
                               <span className="font-medium">{selectedProduct.selected_power.power}kW</span>
                             </div>
                             {selectedProduct.selected_power.additional_cost > 0 && (
                               <div className="flex justify-between">
                                 <span>Extra:</span>
                                 <span className="font-medium text-orange-600">+£{selectedProduct.selected_power.additional_cost}</span>
                               </div>
                             )}
                           </>
                         )}
                         {selectedProduct.calculator_settings?.selected_plan && (
                           <>
                             <div className="flex justify-between">
                               <span>Term:</span>
                               <span className="font-medium">{selectedProduct.calculator_settings.selected_plan.months}m</span>
                             </div>
                             <div className="flex justify-between">
                               <span>APR:</span>
                               <span className="font-medium">{selectedProduct.calculator_settings.selected_plan.apr}%</span>
                             </div>
                           </>
                         )}
                         {selectedProduct.calculator_settings?.selected_deposit !== undefined && (
                           <div className="flex justify-between">
                             <span>Deposit:</span>
                             <span className="font-medium">{selectedProduct.calculator_settings.selected_deposit}%</span>
                           </div>
                         )}
                       </div>
                     </div>
                     
                     {/* Monthly Payment Summary - Mobile */}
                     {monthlyPayment && (
                       <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
                         <div className="text-center">
                           <p className="text-xs text-gray-600 mb-1">Monthly payment</p>
                           <p className="text-lg font-bold text-green-600">£{monthlyPayment.toFixed(0)}/month</p>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               )}
              
              <div className="max-h-60 overflow-y-auto">
                {selectedProduct && (
                  <div className="flex items-center gap-4 py-3 border-b border-gray-200">
                    <div className="relative h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md p-3">
                      <Image src={getImageUrl(selectedProduct.image_url) || '/placeholder-image.jpg'} alt={selectedProduct.name} fill className="object-contain" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">{selectedProduct.name}</h4>
                      <p className="text-gray-600 text-xs">
                        {selectedProduct.selected_power && ` (${selectedProduct.selected_power.power}kW)`}
                      </p>
                    </div>
                  </div>
                )}
                {selectedBundlesList.map(({ bundle, quantity, unitPrice }) => (
                  <div key={bundle.bundle_id} className="flex items-center gap-4 py-3 border-b border-gray-200">
                    <div className="h-10 w-10 flex items-center justify-center rounded-md bg-white text-indigo-600 font-semibold">B</div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">{bundle.title}</h4>
                      <p className="text-gray-600 text-xs">{quantity} × £{unitPrice.toFixed(2)}</p>
                    </div>
                    {onChangeBundleQuantity && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => onChangeBundleQuantity(bundle.bundle_id, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200">-</button>
                        <span className="w-6 text-center text-sm">{quantity}</span>
                        <button onClick={() => onChangeBundleQuantity(bundle.bundle_id, 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200">+</button>
                      </div>
                    )}
                  </div>
                ))}
                {selectedAddonsList.map(addon => (
                  <div key={addon.addon_id} className="flex items-center gap-4 py-3 border-b border-gray-200 last:border-b-0">
                    <div className="relative h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md p-3">
                      <Image src={getImageUrl(addon.image_link) || '/placeholder-image.jpg'} alt={addon.title} fill className="object-contain" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">{addon.title}</h4>
                      <p className="text-gray-600 text-xs">{addon.quantity} × £{addon.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {addon.allow_multiple ? (
                        <>
                          <button onClick={() => onChangeAddonQuantity(addon, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200">
                            <MinusCircle size={14} />
                          </button>
                          <span className="w-6 text-center text-sm">{addon.quantity}</span>
                          <button onClick={() => onChangeAddonQuantity(addon, 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200" disabled={addon.max_count ? addon.quantity >= addon.max_count : false}>
                            <PlusCircle size={14} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => onChangeAddonQuantity(addon, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Finance Calculator Modal */}
      {selectedProduct && (
        <FinanceCalculator
          isOpen={showFinanceCalculator}
          onClose={() => setShowFinanceCalculator(false)}
          productPrice={orderTotal}
          productName={`${selectedProduct.name} + Add-ons`}
          aprSettings={partnerSettings?.apr_settings || null}
          brandColor={companyColor || undefined}
          selectedPlan={currentCalculatorSettings?.selected_plan || selectedProduct.calculator_settings?.selected_plan || undefined}
          selectedDeposit={currentCalculatorSettings?.selected_deposit ?? selectedProduct.calculator_settings?.selected_deposit ?? 0}
          onPlanChange={onCalculatorPlanChange}
          onDepositChange={onCalculatorDepositChange}
          onMonthlyPaymentUpdate={onCalculatorMonthlyPaymentUpdate}
        />
      )}
    </div>
  )
}


