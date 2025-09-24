"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, Edit } from "lucide-react";
import DeleteProductButton from "@/components/partner/DeleteProductButton";
import LayoutSwitcher from "@/components/partner/LayoutSwitcher";

interface Product {
  partner_product_id: string;
  name: string;
  image_url?: string;
  price?: number;
  slug: string;
  ServiceCategories?: {
    name: string;
  };
}

interface ProductsDisplayProps {
  products: Product[];
  approvedCategories: any[];
}

export default function ProductsDisplay({ products, approvedCategories }: ProductsDisplayProps) {
  const [layout, setLayout] = useState<'list' | 'grid'>('list');

  if (products.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No products yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new product or customizing a template.
        </p>
        {approvedCategories && approvedCategories.length > 0 && (
          <div className="mt-6">
            <Link
              href="/partner/my-products/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Package className="mr-2 h-4 w-4" />
              Add New Product
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Your Products</h2>
        <LayoutSwitcher currentLayout={layout} onLayoutChange={setLayout} />
      </div>

      {layout === 'list' ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {products.map((product) => (
              <li key={product.partner_product_id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 relative">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover rounded-md"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-gray-100 rounded-md flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          {product.ServiceCategories?.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/partner/my-products/${product.partner_product_id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <DeleteProductButton productId={product.partner_product_id} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <div key={product.partner_product_id} className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
              <div className="h-48 w-full relative bg-gray-100">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-contain p-5"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="px-4 py-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {product.ServiceCategories?.name}
                </p>
                <div className="mt-4 flex space-x-2">
                  <Link
                    href={`/partner/my-products/${product.partner_product_id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                  <DeleteProductButton productId={product.partner_product_id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
