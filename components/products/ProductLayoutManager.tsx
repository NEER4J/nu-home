// components/products/ProductLayoutManager.tsx

import { Product, Partner } from '@/types/product.types';
import CardLayout from './layouts/CardLayout';
import FeatureLayout from './layouts/FeatureLayout';
import DefaultLayout from './layouts/DefaultLayout';

type ProductLayoutManagerProps = {
  product: Product;
  categorySlug: string;
  layoutType?: string;
  isPopular?: boolean;
  partner?: Partner;
};

export default function ProductLayoutManager({ 
  product, 
  categorySlug, 
  layoutType = 'default',
  isPopular = false,
  partner
}: ProductLayoutManagerProps) {
  // Select the appropriate layout component based on the layout type
  switch (layoutType) {
    case 'card':
      return <CardLayout product={product} categorySlug={categorySlug} partner={partner} />;
    case 'feature':
      return <FeatureLayout product={product} categorySlug={categorySlug} isPopular={isPopular} partner={partner} />;
    default:
      return <DefaultLayout product={product} categorySlug={categorySlug} partner={partner} />;
  }
}