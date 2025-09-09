// components/products/layouts/CardLayout.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Product, Partner } from '@/types/product.types';

interface CardLayoutProps {
  product: Product;
  categorySlug: string;
  partner?: Partner;
}

export default function CardLayout({ product, categorySlug, partner }: CardLayoutProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="relative h-56 w-full">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400">No image</span>
          </div>
        )}
        
        {/* Partner Logo - Small overlay on the image */}
        {product.Partner?.logo_url && (
          <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
            <Image
              src={product.Partner.logo_url}
              alt={product.Partner.company_name}
              width={24}
              height={24}
              className="rounded-full"
            />
          </div>
        )}
      </div>
      
      {/* Product Details */}
      <div className="p-4">
        <h3 className="text-xl font-medium text-gray-900 mb-1">
          {product.name}
        </h3>
        
        {/* Partner Name */}
        {product.Partner && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">
              by {product.Partner.company_name}
            </span>
          </div>
        )}
        
        <p className="text-sm text-gray-500 mb-4 line-clamp-3">
          {product.description}
        </p>
        
        {/* Price and Action */}
        <div className="flex items-center justify-between mt-auto">
          {product.price !== null ? (
            <span className="text-lg font-semibold text-gray-900">
              ${product.price.toLocaleString()}
            </span>
          ) : (
            <span className="text-sm text-gray-500 italic">
              Price on request
            </span>
          )}
          <Link
            href={`/services/${categorySlug}/products/${product.slug}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}