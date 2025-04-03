'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState, use } from 'react'
import Image from 'next/image'
import { MinusCircle, PlusCircle, Info } from 'lucide-react'

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
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Get the host from window location
        const host = window.location.host
        const subdomain = host.split('.')[0]
        
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

        // Get partner details from subdomain if it exists
        let partnerId: string | null = null
        if (subdomain && subdomain !== 'localhost') {
          const { data: partner, error: partnerError } = await supabase
            .from('UserProfiles')
            .select('user_id')
            .eq('subdomain', subdomain)
            .eq('status', 'active')
            .single()

          if (partnerError) {
            console.error('Partner error:', partnerError)
            setError('Invalid partner subdomain')
            return
          } else if (partner) {
            partnerId = partner.user_id
          }
        } else {
          setError('Please access this page through a partner subdomain')
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
  }, [supabase, resolvedParams.slug])

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

    setSelectedAddons(prev => ({
      ...prev,
      [addon.addon_id]: newQty
    }))
  }

  const getImageUrl = (url: string | null) => {
    if (!url) return null
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (url.startsWith('/')) return url
    return `/${url}`
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-6 w-3/4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{category?.name} Add-ons</h1>

      {category?.addon_types.map((type) => {
        const typeAddons = addonsByType[type.id] || []
        if (typeAddons.length === 0) return null

        return (
          <div key={type.id} className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-semibold">{type.name}</h2>
              <button className="text-gray-500 hover:text-gray-700">
                <Info size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {typeAddons.map((addon) => (
                <div
                  key={addon.addon_id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {addon.image_link && (
                    <div className="relative h-48 w-full">
                      <Image
                        src={getImageUrl(addon.image_link) || '/placeholder-image.jpg'}
                        alt={addon.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold">{addon.title}</h3>
                      <p className="text-lg font-bold">£{addon.price.toFixed(2)}</p>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{addon.description}</p>
                    
                    {addon.partner_profile && (
                      <div className="flex items-center gap-2 mt-4">
                        {addon.partner_profile.logo_url && (
                          <div className="relative h-8 w-8">
                            <Image
                              src={getImageUrl(addon.partner_profile.logo_url) || '/placeholder-logo.jpg'}
                              alt={addon.partner_profile.company_name}
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
                        <span className="text-sm text-gray-500">
                          {addon.partner_profile.company_name}
                        </span>
                      </div>
                    )}
                    
                    <div className="mt-6">
                      {addon.allow_multiple ? (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleQuantityChange(addon, -1)}
                            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            disabled={!selectedAddons[addon.addon_id]}
                          >
                            <MinusCircle size={24} />
                          </button>
                          <span className="text-lg font-semibold">
                            {selectedAddons[addon.addon_id] || 0}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(addon, 1)}
                            className="p-2 text-gray-500 hover:text-gray-700"
                            disabled={addon.max_count ? selectedAddons[addon.addon_id] >= addon.max_count : false}
                          >
                            <PlusCircle size={24} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          className={`w-full py-2 px-4 rounded-md transition-colors ${
                            selectedAddons[addon.addon_id]
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                          onClick={() => handleQuantityChange(addon, selectedAddons[addon.addon_id] ? -1 : 1)}
                        >
                          {selectedAddons[addon.addon_id] ? 'Added' : 'Add to Quote'}
                        </button>
                      )}
                      {addon.max_count && (
                        <p className="text-sm text-gray-500 text-center mt-2">
                          Maximum: {addon.max_count}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Fixed bottom bar showing total and continue button */}
      {Object.keys(selectedAddons).length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div>
              <p className="text-lg font-semibold">Total Add-ons: £{totalPrice.toFixed(2)}</p>
            </div>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
              Continue
            </button>
          </div>
        </div>
      )}

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
  )
} 