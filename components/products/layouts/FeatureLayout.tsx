// components/products/layouts/FeatureLayout.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Product, Partner } from '@/types/product.types';

interface FeatureLayoutProps {
  product: Product;
  categorySlug: string;
  isPopular?: boolean;
  partner?: Partner;
}

export default function FeatureLayout({ product, categorySlug, isPopular = false, partner }: FeatureLayoutProps) {
  return (
    <div className={`
      bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden
      ${isPopular ? 'ring-2 ring-blue-500' : ''}
    `}>
      {isPopular && (
        <div className="bg-blue-500 text-white px-4 py-1 text-sm font-medium text-center">
          Most Popular
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {/* Left Column - Image */}
        <div className="relative h-64 md:h-full min-h-[300px]">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover rounded-lg"
            />
          ) : (
            <div className="h-full w-full bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          
          {/* Partner Logo - Small overlay on the image */}
          {product.Partner?.logo_url && (
            <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
              <Image
                src={product.Partner.logo_url}
                alt={product.Partner.company_name}
                width={32}
                height={32}
                className="rounded-full"
              />
            </div>
          )}
        </div>
        
        {/* Right Column - Details */}
        <div className="flex flex-col">
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            {product.name}
          </h3>
          
          {/* Partner Name */}
          {product.Partner && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">
                by {product.Partner.company_name}
              </span>
              {product.Partner.website_url && (
                <a
                  href={product.Partner.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Visit Partner Website
                </a>
              )}
            </div>
          )}
          
          <p className="text-gray-600 mb-6">
            {product.description}
          </p>
          
          {/* Product Fields */}
          {Object.keys(product.product_fields || {}).length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Key Features</h4>
              <ul className="space-y-2">
                {Object.entries(product.product_fields).map(([key, value]) => (
                  <li key={key} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600">{key}:</span>
                    <span className="text-gray-900">{String(value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Price and Action */}
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-4">
              {product.price !== null ? (
                <div>
                  <span className="text-2xl font-semibold text-gray-900">
                    ${product.price.toLocaleString()}
                  </span>
                  {isPopular && (
                    <span className="ml-2 text-sm text-green-600 font-medium">
                      Best Value
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-500 italic">
                  Price on request
                </span>
              )}
            </div>
            
            <Link
              href={`/services/${categorySlug}/products/${product.slug}`}
              className="block w-full text-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}