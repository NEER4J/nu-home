'use client'

import { useMemo, useState, useEffect } from 'react'
import Image from 'next/image'
import { MinusCircle, PlusCircle, Info, ShoppingCart, ChevronRight, X, CheckCircle } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'

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
  onChangeAddonQuantity: (addon: AddonLite, change: number) => void
  onToggleBundle?: (bundle: BundleLite) => void
  onChangeBundleQuantity?: (bundleId: string, change: number) => void
  onContinue: (selectedAddons: (AddonLite & { quantity: number })[], selectedBundles: { bundle: BundleLite, quantity: number, unitPrice: number }[]) => void
  backHref?: string
  backLabel?: string
  showBack?: boolean
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
  onChangeAddonQuantity,
  onToggleBundle,
  onChangeBundleQuantity,
  onContinue,
  backHref = '/',
  backLabel = 'Back',
  showBack = true,
}: AddonsLayoutProps) {
  const classes = useDynamicStyles(companyColor || null)
  const [showCart, setShowCart] = useState(false)

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
  
  // Calculate monthly payment using finance calculator settings
  const monthlyPayment = useMemo(() => {
    if (!selectedProduct?.calculator_settings?.selected_plan || !selectedProduct.price) {
      console.log('Monthly payment calculation - missing data:', {
        hasCalculatorSettings: !!selectedProduct?.calculator_settings,
        hasSelectedPlan: !!selectedProduct?.calculator_settings?.selected_plan,
        hasPrice: !!selectedProduct?.price,
        calculatorSettings: selectedProduct?.calculator_settings,
        price: selectedProduct?.price
      })
      return null
    }
    
    const { months, apr } = selectedProduct.calculator_settings.selected_plan
    const depositPercentage = selectedProduct.calculator_settings.selected_deposit || 0
    const productPrice = selectedProduct.selected_power?.price || selectedProduct.price
    
    const calculated = calculateMonthlyPayment(productPrice, months, apr, depositPercentage)
    console.log('Monthly payment calculated:', {
      productPrice,
      months,
      apr,
      depositPercentage,
      monthlyPayment: calculated
    })
    
    return calculated
  }, [selectedProduct?.calculator_settings, selectedProduct?.price, selectedProduct?.selected_power?.price])

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
                     {/* Main Product Price Display */}
           {selectedProduct && (
             <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
               <div className="text-center">
                 <h3 className="text-sm font-medium text-gray-700 mb-2">Your Selected Product</h3>
                 <div className="flex items-center justify-center gap-3 mb-3">
                   <div className="relative h-16 w-16 flex-shrink-0 bg-white rounded-lg p-2 shadow-sm">
                     <Image src={getImageUrl(selectedProduct.image_url) || '/placeholder-image.jpg'} alt={selectedProduct.name} fill className="object-contain" />
                   </div>
                   <div className="text-left">
                     <h4 className="font-semibold text-gray-900 text-lg leading-tight">{selectedProduct.name}</h4>
                     <div className="space-y-1">
                       {/* Main Price Display */}
                       {typeof selectedProduct.price === 'number' && (
                         <p className="text-2xl font-bold text-blue-600">£{selectedProduct.price.toFixed(0)}</p>
                       )}
                       {/* Power-specific details */}
                       {selectedProduct.selected_power && (
                         <>
                           <p className="text-sm text-gray-600">{selectedProduct.selected_power.power}kW</p>
                           {selectedProduct.selected_power.additional_cost > 0 && (
                             <p className="text-xs text-gray-500">+£{selectedProduct.selected_power.additional_cost} additional</p>
                           )}
                         </>
                       )}
                     </div>
                   </div>
                 </div>
                 
                 {/* Finance Calculator Info - if available */}
                 {selectedProduct && typeof selectedProduct.price === 'number' && (
                   <div className="text-center">
                     <p className="text-sm text-gray-600 mb-1">Monthly from</p>
                     {(() => {
                       const productPrice = selectedProduct.price
                       
                       if (selectedProduct.calculator_settings?.selected_plan) {
                         return (
                           <>
                             <p className="text-lg font-semibold text-gray-900">
                               £{calculateMonthlyPayment(
                                 productPrice,
                                 selectedProduct.calculator_settings.selected_plan.months,
                                 selectedProduct.calculator_settings.selected_plan.apr,
                                 selectedProduct.calculator_settings.selected_deposit || 0
                               ).toFixed(0)}/month
                             </p>
                             <p className="text-xs text-gray-500">
                               {selectedProduct.calculator_settings.selected_plan.months} months at {selectedProduct.calculator_settings.selected_plan.apr}% APR
                               {selectedProduct.calculator_settings.selected_deposit ? ` with ${selectedProduct.calculator_settings.selected_deposit}% deposit` : ''}
                             </p>
                           </>
                         )
                       } else {
                         return (
                           <>
                             <p className="text-lg font-semibold text-gray-900">£{(productPrice / 12).toFixed(0)}/month</p>
                             <p className="text-xs text-gray-500">Interest-free over 12 months</p>
                           </>
                         )
                       }
                     })()}
                   </div>
                 )}
                 
                 {/* Monthly Payment Summary */}
                 {monthlyPayment && (
                   <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                     <div className="text-center">
                       <p className="text-sm text-gray-600 mb-1">Your monthly payment</p>
                       <p className="text-xl font-bold text-green-600">£{monthlyPayment.toFixed(0)}/month</p>
                       <p className="text-xs text-gray-500">
                         Based on your selected finance plan
                       </p>
                     </div>
                   </div>
                 )}
                 
                 {/* Additional Product Details */}
                 <div className="mt-4 text-left">
                   <h5 className="text-sm font-medium text-gray-700 mb-2">Product Details</h5>
                   <div className="space-y-2 text-xs text-gray-600">
                     {selectedProduct.partner_product_id && (
                       <div className="flex justify-between">
                         <span>Product ID:</span>
                         <span className="font-mono text-gray-500">{selectedProduct.partner_product_id.slice(0, 8)}...</span>
                       </div>
                     )}
                     {selectedProduct.partner_id && (
                       <div className="flex justify-between">
                         <span>Partner ID:</span>
                         <span className="font-mono text-gray-500">{selectedProduct.partner_id.slice(0, 8)}...</span>
                       </div>
                     )}
                     {selectedProduct.selected_power && (
                       <>
                         <div className="flex justify-between">
                           <span>Power Rating:</span>
                           <span className="font-medium">{selectedProduct.selected_power.power}kW</span>
                         </div>
                         <div className="flex justify-between">
                           <span>Base Price:</span>
                           <span className="font-medium">£{selectedProduct.selected_power.price.toFixed(0)}</span>
                         </div>
                         {selectedProduct.selected_power.additional_cost > 0 && (
                           <div className="flex justify-between">
                             <span>Additional Cost:</span>
                             <span className="font-medium text-orange-600">+£{selectedProduct.selected_power.additional_cost.toFixed(0)}</span>
                           </div>
                         )}
                       </>
                     )}
                     {selectedProduct.calculator_settings && (
                       <>
                         <div className="border-t border-gray-200 pt-2 mt-2">
                           <h6 className="text-xs font-medium text-gray-700 mb-1">Finance Options</h6>
                           {selectedProduct.calculator_settings.selected_plan && (
                             <>
                               <div className="flex justify-between">
                                 <span>Term:</span>
                                 <span className="font-medium">{selectedProduct.calculator_settings.selected_plan.months} months</span>
                               </div>
                               <div className="flex justify-between">
                                 <span>APR:</span>
                                 <span className="font-medium">{selectedProduct.calculator_settings.selected_plan.apr}%</span>
                               </div>
                             </>
                           )}
                           {selectedProduct.calculator_settings.selected_deposit !== undefined && (
                             <div className="flex justify-between">
                               <span>Deposit:</span>
                               <span className="font-medium">{selectedProduct.calculator_settings.selected_deposit}%</span>
                             </div>
                           )}
                         </div>
                       </>
                     )}
                     
                     {/* Show any other fields that might exist */}
                     {Object.entries(selectedProduct).map(([key, value]) => {
                       // Skip fields we've already displayed
                       if (['partner_product_id', 'partner_id', 'name', 'price', 'image_url', 'selected_power', 'calculator_settings'].includes(key)) {
                         return null
                       }
                       
                       if (value && typeof value === 'object') {
                         return (
                           <div key={key} className="border-t border-gray-200 pt-2 mt-2">
                             <h6 className="text-xs font-medium text-gray-700 mb-1">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h6>
                             <pre className="text-xs text-gray-500 overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
                           </div>
                         )
                       } else if (value !== null && value !== undefined) {
                         return (
                           <div key={key} className="flex justify-between">
                             <span>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                             <span className="font-medium">{String(value)}</span>
                           </div>
                         )
                       }
                       return null
                     })}
                   </div>
                 </div>
               </div>
             </div>
           )}

          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <h2 className="text-sm font-medium text-gray-900">Your fixed price including installation</h2>
          </div>
          {selectedProduct || selectedAddonsList.length > 0 || selectedBundlesList.length > 0 ? (
            <>
              <div className="border-gray-100 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-semibold text-gray-900">£{orderTotal.toFixed(2)}</span>
                </div>
                
                {/* Monthly Payment Display */}
                {monthlyPayment && (
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Monthly payment</p>
                    <p className="text-lg font-semibold text-blue-600">£{monthlyPayment.toFixed(0)}/month</p>
                    {selectedProduct?.calculator_settings?.selected_plan && (
                      <p className="text-xs text-gray-500">
                        {selectedProduct.calculator_settings.selected_plan.months} months at {selectedProduct.calculator_settings.selected_plan.apr}% APR
                        {selectedProduct.calculator_settings.selected_deposit ? ` with ${selectedProduct.calculator_settings.selected_deposit}% deposit` : ''}
                      </p>
                    )}
                  </div>
                )}
                
                <button
                  className={`w-full ${classes.button} ${classes.buttonText} px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-medium`}
                  onClick={() => onContinue(selectedAddonsList, selectedBundlesList)}
                >
                  Continue to Installation <ChevronRight size={16} />
                </button>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Info size={16} />
                    <span>Installation Included</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                {selectedProduct && (
                  <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md p-3">
                      <Image src={getImageUrl(selectedProduct.image_url) || '/placeholder-image.jpg'} alt={selectedProduct.name} fill className="object-contain" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">{selectedProduct.name}</h4>
                      <p className="text-gray-600 text-xs">
                        £{selectedProduct.price?.toFixed(0) || 'Contact for price'}
                        {selectedProduct.selected_power && ` (${selectedProduct.selected_power.power}kW)`}
                      </p>
                    </div>
                  </div>
                )}
                {selectedBundlesList.map(({ bundle, quantity, unitPrice }) => (
                  <div key={bundle.bundle_id} className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 flex items-center justify-center rounded-md bg-white text-blue-600 font-semibold">B</div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 truncate">{bundle.title}</h4>
                          <p className="text-gray-600 text-xs">£{unitPrice.toFixed(2)}</p>
                        </div>
                      </div>
                      {onToggleBundle && (
                        <button onClick={() => onToggleBundle(bundle)} className={`text-xs ${classes.link}`}>Remove</button>
                      )}
                    </div>
                    <div className="mt-2 space-y-2">
                      {(bundle.BundlesAddons || []).map((i) => (
                        <div key={i.bundle_addon_id} className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-white rounded-md overflow-hidden flex items-center justify-center border">
                            {i.Addons?.image_link ? (
                              <img src={i.Addons.image_link} alt={i.Addons?.title || 'Addon'} className="h-full w-full object-cover" />
                            ) : (
                              <div className="text-[10px] text-gray-400">No image</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-900 truncate">{i.Addons?.title || 'Addon'}</div>
                            {i.Addons?.description && (
                              <div className="text-[11px] text-gray-500 truncate">{i.Addons.description}</div>
                            )}
                          </div>
                          {i.quantity && i.quantity > 1 && (
                            <div className="text-[11px] text-gray-600">×{i.quantity}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {selectedAddonsList.map(addon => (
                  <div key={addon.addon_id} className="flex items-center gap-4">
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
             </>
           ) : (
             <div className="text-center py-8 text-gray-500">
               <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
               <p>No items selected</p>
             </div>
           )}
           
           {/* Debug: Raw Product Info */}
           {selectedProduct && process.env.NODE_ENV === 'development' && (
             <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
               <h6 className="text-xs font-medium text-gray-700 mb-2">Debug: Raw Product Info</h6>
               <pre className="text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap">
                 {JSON.stringify(selectedProduct, null, 2)}
               </pre>
             </div>
           )}
         </div>
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
              <div>
                <p className="text-sm text-gray-500">Your order</p>
                <p className="text-lg font-semibold">£{orderTotal.toFixed(2)}</p>
                {monthlyPayment && (
                  <p className="text-xs text-blue-600">£{monthlyPayment.toFixed(0)}/month</p>
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
                     {typeof selectedProduct.price === 'number' && (
                       <div className="space-y-1">
                         <p className="text-xl font-bold text-blue-600">£{selectedProduct.price.toFixed(0)}</p>
                         {selectedProduct.selected_power && (
                           <>
                             <p className="text-sm text-gray-600">{selectedProduct.selected_power.power}kW</p>
                             {selectedProduct.selected_power.additional_cost > 0 && (
                               <p className="text-xs text-orange-600">+£{selectedProduct.selected_power.additional_cost} additional</p>
                             )}
                           </>
                         )}
                         {(() => {
                           const productPrice = selectedProduct.price
                           
                           if (selectedProduct.calculator_settings?.selected_plan) {
                             return (
                               <p className="text-sm text-gray-600">
                                 Monthly from £{calculateMonthlyPayment(
                                   productPrice,
                                   selectedProduct.calculator_settings.selected_plan.months,
                                   selectedProduct.calculator_settings.selected_plan.apr,
                                   selectedProduct.calculator_settings.selected_deposit || 0
                                 ).toFixed(0)}/month
                               </p>
                             )
                           } else {
                             return (
                               <p className="text-sm text-gray-600">Monthly from £{(productPrice / 12).toFixed(0)}/month</p>
                             )
                           }
                         })()}
                       </div>
                     )}
                     
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
                        £{selectedProduct.price?.toFixed(0) || 'Contact for price'}
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
    </div>
  )
}


