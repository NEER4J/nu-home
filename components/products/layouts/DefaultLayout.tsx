// components/products/layouts/DefaultLayout.tsx

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types/product.types';

type DefaultLayoutProps = {
  product: Product;
  categorySlug: string;
};

export default function DefaultLayout({ product, categorySlug }: DefaultLayoutProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
      {product.image_url ? (
        <div className="relative h-40 mb-4">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain rounded-md"
          />
        </div>
      ) : (
        <div className="h-40 bg-gray-100 flex items-center justify-center mb-4 rounded-md">
          <span className="text-gray-400">No image</span>
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
      {product.price ? (
        <p className="text-lg font-bold mb-4">£{product.price.toFixed(2)}</p>
      ) : (
        <p className="text-sm italic text-gray-500 mb-4">Price on request</p>
      )}
      <Link
        href={`/services/${categorySlug}/products/${product.slug}`}
        className="block text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
      >
        View Details
      </Link>
    </div>
  );
}