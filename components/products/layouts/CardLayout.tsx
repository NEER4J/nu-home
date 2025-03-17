// components/products/layouts/CardLayout.tsx

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types/product.types';

type CardLayoutProps = {
  product: Product;
  categorySlug: string;
};

export default function CardLayout({ product, categorySlug }: CardLayoutProps) {
  // Extract common custom fields
  const warranty = product.product_fields?.warranty || '25';
  const apr = product.product_fields?.apr || '12.9%';
  const monthlyPrice = product.product_fields?.monthly_price || '130.12';
  const brandLogo = product.product_fields?.brand_logo;
  
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md">
      {/* Color badge */}
      <div className="flex items-center px-2 py-1 gap-2">
        <div className="w-4 h-4 rounded-full bg-gray-400" />
        <span className="text-xs">{warranty} year {apr} APR</span>
      </div>
      
      {/* Product image */}
      <div className="bg-blue-50 p-6 flex justify-center">
        <div className="relative h-64 w-64">
          {product.image_url ? (
            <Image 
              src={product.image_url} 
              alt={product.name} 
              fill 
              className="object-contain" 
            />
          ) : (
            <div className="h-full w-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6">
        {/* Brand logo */}
        <div className="h-12 mb-4">
          {brandLogo ? (
            <Image 
              src={brandLogo} 
              alt="Brand" 
              width={100} 
              height={40} 
              className="object-contain" 
            />
          ) : (
            <div className="h-12 w-32 bg-gray-100 rounded" />
          )}
        </div>
        
        {/* Product name */}
        <h3 className="text-xl font-bold mb-1">{product.name}</h3>
        <p className="text-sm text-gray-600">Up to {warranty} year {apr} APR</p>
        
        {/* Description */}
        <div className="my-4 text-sm text-gray-700">
          <p>{product.description}</p>
        </div>
        
        {/* Pricing */}
        <div className="mt-4 flex justify-between items-center border-t pt-4">
          <div>
            <p className="text-xs text-gray-500">Price estimate</p>
            <p className="text-xl font-bold">
              £{product.price ? product.price.toFixed(2) : '7896'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">or, monthly from</p>
            <p className="text-xl">£{monthlyPrice}</p>
          </div>
        </div>
        
        {/* What's included link */}
        <div className="text-center my-2">
          <button className="text-sm text-blue-600 hover:underline">
            What's Included
          </button>
        </div>
        
        {/* CTA Button */}
        <Link
          href={`/services/${categorySlug}/products/${product.slug}`}
          className="block w-full mt-4 p-3 bg-teal-700 text-white text-center rounded hover:bg-teal-800"
        >
          Book Your Free Survey
        </Link>
      </div>
    </div>
  );
}