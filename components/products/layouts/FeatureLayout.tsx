// components/products/layouts/FeatureLayout.tsx

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types/product.types';
import { ReactElement, JSXElementConstructor, ReactNode, ReactPortal, Key } from 'react';

type FeatureLayoutProps = {
  product: Product;
  categorySlug: string;
  isPopular?: boolean;
};

export default function FeatureLayout({ product, categorySlug, isPopular = false }: FeatureLayoutProps) {
  // Extract common custom fields
  const power = product.product_fields?.power || `${Math.floor(Math.random() * 10) + 20} kW`;
  const warranty = product.product_fields?.warranty || '10';
  const features = product.product_fields?.features || [];
  const monthlyPrice = product.product_fields?.monthly_price || '30.86';
  const apr = product.product_fields?.apr || '9.9%';
  const originalPrice = product.product_fields?.original_price || (parseFloat(product.price?.toString() || '2000') + 300).toFixed(2);
  const savings = product.product_fields?.savings || '300';
  
  // If no features are defined, create some default ones
  const defaultFeatures = [
    'Powers up to 15 radiators',
    'Wide power range helps to reduce gas consumption and lower energy bills',
    'Innovative water saving function helps you reduce water waste',
    'The modern design comes with an easy to use color display',
    'Operates extremely well in low water pressure areas',
    'One of the quietest combi boilers available',
    'Suitable for small to medium homes'
  ];
  
  const displayFeatures = features.length > 0 ? features : defaultFeatures;
  
  return (
    <div className="border border-green-400 rounded-lg overflow-hidden mb-8 relative">
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute top-0 left-0 bg-green-400 text-white px-4 py-1 rounded-br-lg z-10">
          Most Popular
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
        {/* Product image and warranty badge */}
        <div className="md:col-span-1 relative">
          <div className="relative h-64 w-full">
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
          
          {/* Warranty badge */}
          <div className="absolute top-0 left-0 bg-green-400 text-white w-20 h-20 flex flex-col items-center justify-center rounded-lg">
            <span className="text-2xl font-bold">{warranty}</span>
            <span className="text-xs">Year<br/>Warranty</span>
          </div>
          
          {/* Finance badge */}
          <div className="mt-4 bg-blue-500 text-white text-center py-2 px-4 rounded">
            0% Finance available
          </div>
          
          {/* Dimensions */}
          <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm2 5h2v2H9v-2zm0 3h2v2H9v-2z" clipRule="evenodd" />
            </svg>
            W 724 x H 400 x D 310
          </div>
        </div>
        
        {/* Product details and features */}
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold mb-4">{product.name}</h2>
          
          {/* Power rating */}
          <div className="mb-4 flex items-center">
            <p>Boiler power: {power}</p>
            <button className="ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Warranty info */}
          <div className="mb-4 bg-purple-100 text-purple-800 px-3 py-1 inline-flex items-center rounded">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            EXCLUSIVE {warranty}-Year warranty*
          </div>
          
          {/* Features list */}
          <div className="space-y-2">
            {displayFeatures.map((feature: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, index: Key | null | undefined) => (
              <p key={index} className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{feature}</span>
              </p>
            ))}
          </div>
        </div>
        
        {/* Pricing and CTA */}
        <div className="md:col-span-1 flex flex-col">
          {/* Price header */}
          <div className="text-right mb-4">
            <p className="text-sm text-blue-800 font-semibold">Your fixed installation price</p>
            <p className="text-xs text-right">(Inc VAT)</p>
          </div>
          
          {/* Price with savings */}
          <p className="text-right text-sm text-green-600">
            £{originalPrice} Save £{savings}
          </p>
          
          {/* Current price */}
          <p className="text-right text-3xl font-bold text-gray-900 mb-1">
            £{product.price ? product.price.toFixed(2) : '2,345.00'}
          </p>
          
          {/* Monthly payment */}
          <p className="text-right text-xs text-gray-600 mb-4">
            or from £{monthlyPrice} / mo ({apr} APR) <span className="text-blue-600 hover:underline cursor-pointer">Calculate finance</span>
          </p>
          
          {/* CTA Buttons */}
          <Link
            href={`/services/${categorySlug}/products/${product.slug}`}
            className="w-full py-2 bg-green-400 text-black text-center rounded mb-2 hover:bg-green-500 transition-colors"
          >
            Secure my fixed price
          </Link>
          
          <button className="w-full py-2 border border-blue-700 text-blue-700 rounded mb-2 hover:bg-blue-50 transition-colors">
            Get a remote survey
          </button>
          
          <button className="w-full py-2 bg-blue-700 text-white rounded mb-2 hover:bg-blue-800 transition-colors">
            Save this quote
          </button>
          
          <button className="w-full text-xs text-blue-700 flex items-center justify-center gap-2 hover:underline">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Compare my boiler
          </button>
        </div>
      </div>
    </div>
  );
}