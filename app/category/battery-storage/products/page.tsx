'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ProductFilters from '@/components/products/ProductFilters'

interface Product {
  partner_product_id: string
  name: string
  description: string
  price: number
  image_url: string
  slug: string 
  product_fields: Record<string, any>
}

interface Category {
  service_category_id: string
  name: string
}

interface PartnerProfile {
  user_id: string
  subdomain: string
}

export default function BatteryStorageProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchData() {
      const host = window.location.host
      const subdomain = host.split('.')[0]

      // Fetch partner profile
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('*')
        .eq('subdomain', subdomain)
        .single()

      if (profile) {
        setPartnerProfile(profile)

        // Fetch category
        const { data: categoryData } = await supabase
          .from('ServiceCategories')
          .select('*')
          .eq('slug', 'battery-storage')
          .single()

        if (categoryData) {
          setCategory(categoryData)

          // Fetch products
          const { data: productsData } = await supabase
            .from('PartnerProducts')
            .select('*')
            .eq('partner_id', profile.user_id)
            .eq('service_category_id', categoryData.service_category_id)
            .eq('is_active', true)

          if (productsData) {
            setProducts(productsData)
            setFilteredProducts(productsData)
          }
        }
      }
    }

    fetchData()
  }, [supabase])

  const handleFilterChange = (filters: Record<string, string[]>) => {
    // Filter products based on selected filters
    const filtered = products.filter(product => {
      // Check each filter
      return Object.entries(filters).every(([key, values]) => {
        // If no values selected for this filter, include the product
        if (values.length === 0) return true

        // Get the product's value for this field
        const productValue = product.product_fields?.[key]
        
        // If the product has no value for this field, don't include it
        if (!productValue) return false

        // For array values in product fields
        if (Array.isArray(productValue)) {
          return values.some(value => productValue.includes(value))
        }
        
        // For single values
        return values.includes(productValue.toString())
      })
    })

    setFilteredProducts(filtered)
  }

  if (!category || !partnerProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Loading...</h1>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Our Battery Storage Solutions</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <div className="lg:col-span-1">
          <ProductFilters
            categoryId={category.service_category_id}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div 
                key={product.partner_product_id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {product.image_url && (
                  <div className="relative h-48">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
                  <p className="text-gray-600 mb-4">{product.description}</p>
                  
                  {product.price && (
                    <p className="text-2xl font-bold text-primary mb-4">
                      £{product.price.toLocaleString()}
                    </p>
                  )}

                  <Link
                    href={`/category/battery-storage/products/${product.slug}`}
                    className="inline-block bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No products match the selected filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 