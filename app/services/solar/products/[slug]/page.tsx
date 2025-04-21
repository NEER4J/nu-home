import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies, headers } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Product {
  partner_product_id: string
  name: string
  description: string
  price: number
  image_url: string
  slug: string
  product_fields: Record<string, string | string[]>
}

interface Category {
  service_category_id: string
  name: string
}

interface PartnerProfile {
  user_id: string
  subdomain: string
  company_name: string
}

type Props = {
  params: Promise<{
    slug: string
  }>
}

export default async function SolarProductPage({ params }: Props) {
  const resolvedParams = await params;
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Get the host from headers
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const subdomain = host.split('.')[0]

  // Fetch partner profile
  const { data: profile } = await supabase
    .from('UserProfiles')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (!profile) {
    notFound()
  }

  // Fetch category
  const { data: category } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', 'solar')
    .single()

  if (!category) {
    notFound()
  }

  // Fetch product
  const { data: product } = await supabase
    .from('PartnerProducts')
    .select('*')
    .eq('partner_id', profile.user_id)
    .eq('service_category_id', category.service_category_id)
    .eq('slug', resolvedParams.slug)
    .eq('is_active', true)
    .single()

  if (!product) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-gray-600 mb-6">{product.description}</p>

          {product.price && (
            <p className="text-3xl font-bold text-primary mb-6">
              £{product.price.toLocaleString()}
            </p>
          )}

          {/* Product Fields */}
          {Object.entries(product.product_fields || {}).map(([key, value]) => (
            <div key={key} className="mb-4">
              <h3 className="text-lg font-semibold capitalize mb-2">
                {key.replace(/_/g, ' ')}
              </h3>
              <p className="text-gray-600">
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </p>
            </div>
          ))}

          {/* CTA Button */}
          <Link
            href={`/category/solar/quote?product=${product.partner_product_id}`}
            className="inline-block bg-primary text-white px-8 py-3 rounded-md hover:bg-primary-dark transition-colors mt-6"
          >
            Get a Quote
          </Link>
        </div>
      </div>
    </div>
  )
} 