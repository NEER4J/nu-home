'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Minus, Plus, PlusCircle, MinusCircle, Info, ChevronRight, X, Calculator, ChevronDown, Loader2, ShoppingCart, CheckCircle } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
  showMobileCard?: boolean
}

function getImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return url
  return `/${url}`
}

// Normalize various shapes of "what's included" items coming from product fields
function normalizeIncludedItem(item: any): { title: string; subtitle: string | null; imageUrl: string | null } {
  const data = item?.items || item || {}
  const title: string = typeof data.title === 'string' ? data.title : 'Included item'
  const subtitle: string | null =
    typeof data.subtitle === 'string'
      ? data.subtitle
      : typeof data.description === 'string'
        ? data.description
        : null
  const rawImage: string | null =
    typeof data.image === 'string'
      ? data.image
      : typeof data.image_url === 'string'
        ? data.image_url
        : null
  const imageUrl = rawImage ? getImageUrl(rawImage) : null
  return { title, subtitle, imageUrl }
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

// Mobile Cart Popup Component
function MobileCartPopup({
  isOpen,
  onClose,
  selectedProduct,
  selectedAddons,
  selectedBundles,
  orderTotal,
  monthlyPayment,
  onAddonQuantityChange,
  onBundleQuantityChange,
  onToggleBundle,
  onOpenFinanceCalculator,
  onContinue,
  continueButtonText,
  showContinueButton,
  showInstallationIncluded,
  isLoading,
  normalizeIncludedItem,
  getImageUrl,
  companyColor
}: {
  isOpen: boolean
  onClose: () => void
  selectedProduct?: SelectedProductLite | null
  selectedAddons: (AddonLite & { quantity: number })[]
  selectedBundles: { bundle: BundleLite, quantity: number, unitPrice: number }[]
  orderTotal: number
  monthlyPayment: number | null
  onAddonQuantityChange?: (addon: AddonLite, change: number) => void
  onBundleQuantityChange?: (bundleId: string, change: number) => void
  onToggleBundle?: (bundle: BundleLite) => void
  onOpenFinanceCalculator?: () => void
  onContinue: () => void
  continueButtonText: string
  showContinueButton: boolean
  showInstallationIncluded: boolean
  isLoading: boolean
  normalizeIncludedItem: (item: any) => { title: string; subtitle: string | null; imageUrl: string | null }
  getImageUrl: (url: string | null) => string | null
  companyColor?: string | null
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent variant="bottom" className="lg:hidden p-0 max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-0">
          <h3 className="text-base text-gray-600">Your order summary</h3>
          </div>

        <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
          <div className="space-y-6 p-4">

            {/* Pricing Section */}
            <div className="border rounded-lg p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-500">Fixed price (inc. VAT)</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-medium text-gray-900">£{orderTotal.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 line-through">£{(orderTotal + 250).toFixed(2)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">or, monthly from</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-medium text-green-800">£{monthlyPayment?.toFixed(0) || '0'}</p>
                    {selectedProduct && onOpenFinanceCalculator && (
                      <button
                        onClick={onOpenFinanceCalculator}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        title="Open Finance Calculator"
                      >
                        <ChevronDown size={14} className="text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
             
              {showContinueButton && (
                <button
                  className={`mt-3 w-full text-white px-6 py-3 rounded-full flex items-center justify-center gap-2 font-medium transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: companyColor || '#3B82F6' }}
                  onClick={onContinue}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      {continueButtonText} <ChevronRight size={14} />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Main Product */}
            {selectedProduct && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Your package</h3>
                <div className="flex items-center gap-4">
                  <div className="relative h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md p-2">
                    <Image src={getImageUrl(selectedProduct.image_url) || '/placeholder-image.jpg'} alt={selectedProduct.name} fill className="object-contain" />
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
            
            {/* Bundles */}
            {selectedBundles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Your bundles</h3>
                <div className="space-y-3">
                  {selectedBundles.map(({ bundle }) => (
                    <div key={bundle.bundle_id} className="">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 flex items-center justify-center rounded-md bg-blue-100 text-blue-600 font-semibold text-sm">B</div>
                          <div className="flex-grow min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 truncate">{bundle.title}</h4>
                            {bundle.description && (
                              <p className="text-xs text-gray-500 truncate mt-1">{bundle.description}</p>
                            )}
                          </div>
                        </div>
                        {onToggleBundle && (
                          <button onClick={() => onToggleBundle(bundle)} className="text-xs text-gray-600 underline shrink-0">Remove</button>
                        )}
                      </div>
                      {Array.isArray(bundle.BundlesAddons) && bundle.BundlesAddons.length > 0 && (
                        <div className="ml-13 space-y-2">
                          {bundle.BundlesAddons.map((i) => (
                            <div key={i.bundle_addon_id} className="flex items-center gap-3">
                              <div className="relative h-10 w-10 flex-shrink-0 bg-gray-200 rounded-md p-1.5">
                                {i.Addons?.image_link ? (
                                  <img src={i.Addons.image_link} alt={i.Addons?.title || 'Addon'} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="text-[10px] text-gray-400 flex items-center justify-center w-full h-full">No image</div>
                                )}
                              </div>
                              <div className="flex-grow min-w-0">
                                <p className="text-sm text-gray-900 truncate">{i.Addons?.title || 'Addon'}</p>
                                <p className="text-xs text-gray-500">Quantity: {i.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Addons */}
            {selectedAddons.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Your add-ons</h3>
                <div className="space-y-3">
                  {selectedAddons.map(addon => (
                    <div key={addon.addon_id} className="flex items-center gap-4">
                      <div className="relative h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md p-2">
                        <Image src={getImageUrl(addon.image_link) || '/placeholder-image.jpg'} alt={addon.title} fill className="object-contain" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">{addon.title}</h4>
                        <p className="text-gray-600 text-xs">{addon.quantity} × £{addon.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {addon.allow_multiple && onAddonQuantityChange ? (
                          <>
                            <button onClick={() => onAddonQuantityChange(addon, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-gray-300 hover:bg-gray-400 transition-colors">
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">{addon.quantity}</span>
                            <button onClick={() => onAddonQuantityChange(addon, 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-gray-300 hover:bg-gray-400 transition-colors" disabled={addon.max_count ? addon.quantity >= addon.max_count : false}>
                              <Plus size={14} />
                            </button>
                          </>
                        ) : onAddonQuantityChange ? (
                          <button onClick={() => onAddonQuantityChange(addon, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-gray-300 hover:bg-gray-400 transition-colors">
                            <X size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* What's Included */}
            {Boolean(
              showInstallationIncluded &&
              (selectedProduct?.product_fields as any)?.what_s_included &&
              Array.isArray((selectedProduct?.product_fields as any).what_s_included) &&
              ((selectedProduct?.product_fields as any).what_s_included as any[]).length > 0
            ) && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">What's Included in Your Installation</h3>
                <div className="space-y-3">
                  {(selectedProduct?.product_fields as any).what_s_included.map((item: any, index: number) => {
                    const normalized = normalizeIncludedItem(item)
                    return (
                      <div key={index} className="flex items-center gap-4">
                        <div className="relative h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md p-2">
                          {normalized.imageUrl ? (
                            <Image src={normalized.imageUrl || '/placeholder-image.jpg'} alt={normalized.title} fill className="object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <CheckCircle size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 truncate">{normalized.title}</h4>
                          {normalized.subtitle && (
                            <p className="text-gray-600 text-xs truncate">{normalized.subtitle}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Mobile Bottom Bar Component
function MobileBottomBar({
  selectedProduct,
  selectedAddons,
  selectedBundles,
  orderTotal,
  monthlyPayment,
  onOpenFinanceCalculator,
  onContinue,
  continueButtonText,
  showContinueButton,
  isLoading,
  onOpenCart,
  companyColor
}: {
  selectedProduct?: SelectedProductLite | null
  selectedAddons: (AddonLite & { quantity: number })[]
  selectedBundles: { bundle: BundleLite, quantity: number, unitPrice: number }[]
  orderTotal: number
  monthlyPayment: number | null
  onOpenFinanceCalculator?: () => void
  onContinue: () => void
  continueButtonText: string
  showContinueButton: boolean
  isLoading: boolean
  onOpenCart: () => void
  companyColor?: string | null
}) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-10">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4"> 
        <button onClick={onOpenCart} className="flex items-center gap-2 bg-gray-200 px-3 py-2 rounded-full w-10 h-10 relative">
          <ShoppingCart size={18} className="text-gray-600" />
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-semibold rounded-full w-4 h-4 flex items-center justify-center">
            {selectedAddons.length + selectedBundles.length}
          </span>
        </button>

        <div className="text-right">
            <div className="flex flex-col items-start gap-0">
              <p className="text-base font-semibold text-gray-900">£{orderTotal.toFixed(2)}</p>
              {monthlyPayment && (
                <>
                  <p onClick={onOpenFinanceCalculator} className="text-sm font-normal text-green-800 border-b border-dashed border-green-600 flex items-center gap-1">or £{monthlyPayment.toFixed(0)}/mo <ChevronDown size={14} className="text-green-800" /></p>
                </>
              )}
            </div>
          </div>
          </div>

        <div className="flex items-center gap-3">
          
        
          
          {showContinueButton && (
            <button
              className={`text-white px-4 py-3 rounded-full flex items-center gap-1 text-sm font-medium transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: companyColor || '#3B82F6' }}
              onClick={onContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Continue <ChevronRight size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
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
  showMobileCard = false,
}: OrderSummarySidebarProps) {
  const classes = useDynamicStyles(companyColor || null)
  const [showCart, setShowCart] = useState(false)

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
    <>
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium text-gray-900">Install total</h2>
            
          </div>
        </div>

        {Boolean(selectedProduct) || selectedAddons.length > 0 || selectedBundles.length > 0 ? (
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
                    <div className="flex items-center gap-2 cursor-pointer border-b border-dashed border-green-600 text-green-800" onClick={onOpenFinanceCalculator}>
                      <span className="text-xl font-medium">£{monthlyPayment.toFixed(2)}</span>
                      {selectedProduct && onOpenFinanceCalculator && (
                        <button
                          onClick={onOpenFinanceCalculator}
                          className="p-1 text-lg font-medium  rounded transition-colors">
                          <ChevronDown size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {showContinueButton && (
                <button
                  className={`w-full text-white px-6 py-3 rounded-full flex items-center justify-center gap-2 font-medium transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: companyColor || '#3B82F6' }}
                  onClick={onContinue}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      {continueButtonText} <ChevronRight size={14} />
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
                    <div className="flex-grow min-w-0">
                      <h3 className="text-lg font-medium text-gray-900">{bundle.title}</h3>
                      {bundle.description && (
                        <p className="text-sm text-gray-600 mt-1">{bundle.description}</p>
                      )}
                    </div>
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
                          <p className="text-gray-600 text-xs">Quantity: {i.quantity}</p>
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
                              <button onClick={() => onAddonQuantityChange(addon, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-gray-300 hover:bg-gray-400 transition-colors">
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{addon.quantity}</span>
                              <button onClick={() => onAddonQuantityChange(addon, 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-gray-300 hover:bg-gray-400 transition-colors" disabled={addon.max_count ? addon.quantity >= addon.max_count : false}>
                                <Plus size={14} />
                              </button>
                            </>
                          ) : onAddonQuantityChange ? (
                            <button onClick={() => onAddonQuantityChange(addon, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-gray-300 hover:bg-gray-400 transition-colors">
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
              {(() => {
                const productFields = selectedProduct?.product_fields as any | undefined
                if (!productFields) return null
                const includedItems = productFields?.what_s_included
                
                if (Array.isArray(includedItems) && includedItems.length > 0) {
                  return (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">What's Included in Your Installation</h3>
                      <div className="space-y-2">
                        {includedItems.map((item: any, index: number) => {
                          const normalized = normalizeIncludedItem(item)
                          return (
                            <div key={index} className="flex items-center gap-4">
                              {normalized.imageUrl && (
                                <div className="relative h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md p-2">
                                  <img
                                    src={normalized.imageUrl}
                                    alt={normalized.title}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-grow min-w-0">
                                <h4 className="font-medium text-sm text-gray-900 truncate">{normalized.title}</h4>
                                {normalized.subtitle && (
                                  <p className="text-gray-600 text-xs truncate">{normalized.subtitle}</p>
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

      {/* Mobile Components */}
      {showMobileCard && (selectedProduct || selectedAddons.length > 0 || selectedBundles.length > 0) && (
        <>
          <MobileBottomBar
            selectedProduct={selectedProduct}
            selectedAddons={selectedAddons}
            selectedBundles={selectedBundles}
            orderTotal={orderTotal}
            monthlyPayment={monthlyPayment}
            onOpenFinanceCalculator={onOpenFinanceCalculator}
            onContinue={onContinue}
            continueButtonText={continueButtonText}
            showContinueButton={showContinueButton}
            isLoading={isLoading}
            onOpenCart={() => setShowCart(true)}
            companyColor={companyColor}
          />
          
          <MobileCartPopup
            isOpen={showCart}
            onClose={() => setShowCart(false)}
            selectedProduct={selectedProduct}
            selectedAddons={selectedAddons}
            selectedBundles={selectedBundles}
            orderTotal={orderTotal}
            monthlyPayment={monthlyPayment}
            onAddonQuantityChange={onAddonQuantityChange}
            onBundleQuantityChange={onBundleQuantityChange}
            onToggleBundle={onToggleBundle}
            onOpenFinanceCalculator={onOpenFinanceCalculator}
            onContinue={onContinue}
            continueButtonText={continueButtonText}
            showContinueButton={showContinueButton}
            showInstallationIncluded={showInstallationIncluded}
            isLoading={isLoading}
            normalizeIncludedItem={normalizeIncludedItem}
            getImageUrl={getImageUrl}
            companyColor={companyColor}
          />
        </>
      )}
    </>
  )
}
