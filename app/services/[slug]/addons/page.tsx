'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState, use } from 'react'
import Image from 'next/image'
import { MinusCircle, PlusCircle, Info, ShoppingCart, ChevronRight, X } from 'lucide-react'
import { resolvePartnerByHost } from '@/lib/partner'

interface AddonType {
  id: string
  name: string
  allow_multiple_selection: boolean
}

interface Addon {
  addon_id: string
  title: string
  description: string
  price: number
  image_link: string | null
  allow_multiple: boolean
  max_count: number | null
  addon_type_id: string
  partner_id: string
  partner_profile?: {
    company_name: string
    logo_url: string | null
  }
  quantity?: number // For tracking selected quantity
}

interface Category {
  service_category_id: string
  name: string
  addon_types: AddonType[]
}

export default function AddonsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = use(params)
  const [addons, setAddons] = useState<Addon[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({})
  const [showCart, setShowCart] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Get the hostname from window location
        const hostname = window.location.hostname
        
        // First verify the category exists and get its details
        const { data: categoryData, error: categoryError } = await supabase
          .from('ServiceCategories')
          .select('service_category_id, name, addon_types')
          .eq('slug', resolvedParams.slug)
          .single()

        if (categoryError) {
          console.error('Category error:', categoryError)
          setError('Failed to load category')
          return
        }

        if (!categoryData) {
          setError('Category not found')
          return
        }

        setCategory(categoryData)

        // Get partner details from hostname if it exists
        let partnerId: string | null = null
        if (hostname && hostname !== 'localhost') {
          const partner = await resolvePartnerByHost(supabase, hostname)

          if (partner) {
            partnerId = partner.user_id
          } else {
            setError('Partner not found for this domain')
            return
          }
        } else {
          setError('Please access this page through a partner domain')
          return
        }

        // Build the query for addons
        let query = supabase
          .from('Addons')
          .select('*')
          .eq('service_category_id', categoryData.service_category_id)

        // Filter by partner_id
        query = query.eq('partner_id', partnerId)

        // Execute the query
        const { data: addonsData, error: addonsError } = await query

        if (addonsError) {
          console.error('Addons error:', addonsError)
          setError('Failed to load addons')
          return
        }

        if (!addonsData || addonsData.length === 0) {
          setAddons([])
          return
        }

        // Then get the user profiles for these addons
        const { data: userProfiles, error: profilesError } = await supabase
          .from('UserProfiles')
          .select('user_id, company_name, logo_url')
          .in('user_id', addonsData.map(addon => addon.partner_id))

        if (profilesError) {
          console.error('Profiles error:', profilesError)
          setError('Failed to load partner profiles')
          return
        }

        // Create a map of partner_id to profile for easy lookup
        const profileMap = new Map(
          userProfiles?.map(profile => [profile.user_id, profile]) || []
        )

        // Combine the data
        const processedAddons = addonsData.map(addon => ({
          ...addon,
          partner_profile: profileMap.get(addon.partner_id),
          quantity: 0
        }))

        setAddons(processedAddons)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams.slug])

  const handleQuantityChange = (addon: Addon, change: number) => {
    const currentQty = selectedAddons[addon.addon_id] || 0
    const newQty = Math.max(0, currentQty + change)
    
    // Check max count for multiple addons
    if (addon.allow_multiple && addon.max_count && newQty > addon.max_count) {
      return
    }
    
    // For single addons, only allow 0 or 1
    if (!addon.allow_multiple && newQty > 1) {
      return
    }

    // Create a new copy of selected addons
    const updatedSelectedAddons = { ...selectedAddons }
    
    // If adding an addon and the addon type doesn't allow multiple selection
    if (change > 0 && newQty > 0 && category?.addon_types) {
      // Find the current addon's type
      const addonType = category.addon_types.find(type => type.id === addon.addon_type_id)
      
      // If this type doesn't allow multiple selection
      if (addonType && !addonType.allow_multiple_selection) {
        // Find all addons of the same type
        const sameTypeAddons = addons.filter(a => a.addon_type_id === addon.addon_type_id)
        
        // Remove any previously selected addons of the same type
        sameTypeAddons.forEach(sameTypeAddon => {
          if (sameTypeAddon.addon_id !== addon.addon_id) {
            updatedSelectedAddons[sameTypeAddon.addon_id] = 0
          }
        })
      }
    }
    
    // Update the quantity for the current addon
    updatedSelectedAddons[addon.addon_id] = newQty
    
    setSelectedAddons(updatedSelectedAddons)
  }

  const getImageUrl = (url: string | null) => {
    if (!url) return null
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (url.startsWith('/')) return url
    return `/${url}`
  }

  // Get selected addons with their details
  const getSelectedAddonsList = () => {
    return Object.entries(selectedAddons)
      .filter(([_, qty]) => qty > 0)
      .map(([addonId, qty]) => {
        const addon = addons.find(a => a.addon_id === addonId)
        if (!addon) return null
        return {
          ...addon,
          quantity: qty
        }
      })
      .filter(Boolean) as (Addon & { quantity: number })[]
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 lg:pb-8 lg:flex lg:gap-8">
        <div className="flex-1">
          {/* Back button skeleton */}
          <div className="mb-6">
            <div className="w-32 h-5 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Addon types skeleton */}
          {[...Array(2)].map((_, typeIndex) => (
            <div key={typeIndex} className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-7 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="w-24 h-6 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="relative p-4 bg-white rounded-t-xl">
                      <div className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-2/3 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="w-full h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop cart panel skeleton */}
        <div className="hidden lg:block w-[400px] flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <div className="w-24 h-7 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-32 h-6 bg-gray-200 rounded-full animate-pulse"></div>
            </div>

            <div className="text-center py-8">
              <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-2 animate-pulse"></div>
              <div className="w-24 h-5 bg-gray-200 rounded mx-auto animate-pulse"></div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-24 h-7 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="w-full h-12 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="w-32 h-5 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile bottom bar skeleton */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="w-24 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="flex items-center gap-4">
              <div>
                <div className="w-16 h-4 bg-gray-200 rounded mb-1 animate-pulse"></div>
                <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="w-28 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  // Group addons by type
  const addonsByType = addons.reduce((acc, addon) => {
    if (!acc[addon.addon_type_id]) {
      acc[addon.addon_type_id] = []
    }
    acc[addon.addon_type_id].push(addon)
    return acc
  }, {} as Record<string, Addon[]>)

  const totalPrice = Object.entries(selectedAddons).reduce((total, [addonId, quantity]) => {
    const addon = addons.find(a => a.addon_id === addonId)
    return total + (addon ? addon.price * quantity : 0)
  }, 0)

  const selectedAddonsList = getSelectedAddonsList()
  const itemsCount = selectedAddonsList.reduce((count, addon) => count + addon.quantity, 0)

  return (
    <div className="container mx-auto px-4 py-8 lg:pb-8 lg:flex lg:gap-8">
      <div className="flex-1">
        {/* Back button */}
        <div className="mb-6">
          <a href={`/category/${resolvedParams.slug}/products`} className="inline-flex items-center text-gray-600 hover:text-gray-800">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Products
          </a>
        </div>

        {/* Main content */}
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
                  <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                    Select one only
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {typeAddons.map((addon) => {
                  const isSelected = (selectedAddons[addon.addon_id] || 0) > 0;
                  const quantity = selectedAddons[addon.addon_id] || 0;
                  
                  return (
                    <div
                      key={addon.addon_id}
                      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                    >
                      <div className="relative p-4 bg-white rounded-t-xl">
                        <div className="relative h-48 w-full flex items-center justify-center bg-white">
                          <Image
                            src={getImageUrl(addon.image_link) || '/placeholder-image.jpg'}
                            alt={addon.title}
                            fill
                            className="object-contain p-2"
                          />
                        </div>
                        

                        
                        {addon.allow_multiple && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white rounded-full shadow-sm border border-gray-100 p-1">
                            <button
                              onClick={() => handleQuantityChange(addon, -1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50"
                              disabled={!quantity}
                            >
                              <MinusCircle size={18} />
                            </button>
                            <span className="w-6 text-center font-medium text-sm">{quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(addon, 1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700"
                              disabled={addon.max_count ? quantity >= addon.max_count : false}
                            >
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
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{addon.description}</p>
                        
                        {!addon.allow_multiple && (
                          <button 
                            className={`w-full py-2.5 px-4 rounded-lg transition-colors ${
                              isSelected
                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                            onClick={() => handleQuantityChange(addon, isSelected ? -1 : 1)}
                          >
                            {isSelected ? 'Added' : 'Add to Quote'}
                          </button>
                        )}
                        
                        {addon.max_count && (
                          <p className="text-xs text-gray-500 text-center mt-2">
                            Maximum: {addon.max_count}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        })}

        {addons.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No add-ons available for this category
              {category?.addon_types && category.addon_types.length > 0 && (
                <>
                  <br />
                  <span className="text-sm mt-2 block">
                    Available addon types: {category.addon_types.map(type => type.name).join(', ')}
                  </span>
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Desktop cart panel */}
      <div className="hidden lg:block w-[400px] flex-shrink-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-gray-900">Your order</h2>
            <div className="bg-yellow-50 px-3 py-1 rounded-full">
              <span className="text-sm font-medium text-yellow-800">10 Year Warranty</span>
            </div>
          </div>

          {selectedAddonsList.length > 0 ? (
            <>
              <div className="space-y-4 mb-6">
                {selectedAddonsList.map(addon => (
                  <div key={addon.addon_id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                    <div className="relative h-16 w-16 flex-shrink-0 bg-white rounded-md p-2">
                      <Image
                        src={getImageUrl(addon.image_link) || '/placeholder-image.jpg'}
                        alt={addon.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">{addon.title}</h4>
                      <p className="text-gray-600 text-xs">{addon.quantity} × £{addon.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {addon.allow_multiple ? (
                        <>
                          <button 
                            onClick={() => handleQuantityChange(addon, -1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200"
                          >
                            <MinusCircle size={14} />
                          </button>
                          <span className="w-6 text-center text-sm">{addon.quantity}</span>
                          <button 
                            onClick={() => handleQuantityChange(addon, 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200"
                            disabled={addon.max_count ? addon.quantity >= addon.max_count : false}
                          >
                            <PlusCircle size={14} />
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleQuantityChange(addon, -1)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="text-xl font-semibold text-gray-900">£{totalPrice.toFixed(2)}</span>
                </div>
                <button className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium">
                  Continue to Installation <ChevronRight size={16} />
                </button>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Info size={16} />
                    <span>Installation Included</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
              <p>Your cart is empty</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile cart button and fixed bottom bar - only show on mobile */}
      {selectedAddonsList.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-10">
          <div className="container mx-auto flex justify-between items-center">
            <button 
              onClick={() => setShowCart(!showCart)}
              className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg relative"
            >
              <ShoppingCart size={20} />
              <span>Cart</span>
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                {itemsCount}
              </span>
            </button>
            
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-gray-500">Your order</p>
                <p className="text-lg font-semibold">£{totalPrice.toFixed(2)}</p>
              </div>
              <button className="bg-gray-800 text-white px-6 py-2.5 rounded-lg hover:bg-gray-900 flex items-center gap-1 transition-colors">
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
          
          {/* Expandable cart */}
          {showCart && (
            <div className="container mx-auto mt-4 bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900">Your Selected Items</h3>
                <button onClick={() => setShowCart(false)} className="text-gray-500">
                  <X size={18} />
                </button>
              </div>
              
              <div className="max-h-60 overflow-y-auto">
                {selectedAddonsList.map(addon => (
                  <div key={addon.addon_id} className="flex items-center gap-4 py-3 border-b border-gray-200 last:border-b-0">
                    <div className="relative h-16 w-16 flex-shrink-0 bg-white rounded-md p-2">
                      <Image
                        src={getImageUrl(addon.image_link) || '/placeholder-image.jpg'}
                        alt={addon.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">{addon.title}</h4>
                      <p className="text-gray-600 text-xs">{addon.quantity} × £{addon.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {addon.allow_multiple ? (
                        <>
                          <button 
                            onClick={() => handleQuantityChange(addon, -1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200"
                          >
                            <MinusCircle size={14} />
                          </button>
                          <span className="w-6 text-center text-sm">{addon.quantity}</span>
                          <button 
                            onClick={() => handleQuantityChange(addon, 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200"
                            disabled={addon.max_count ? addon.quantity >= addon.max_count : false}
                          >
                            <PlusCircle size={14} />
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleQuantityChange(addon, -1)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200"
                        >
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