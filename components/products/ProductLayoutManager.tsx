// components/products/ProductLayoutManager.tsx

import { Product } from '@/types/product.types';
import CardLayout from './layouts/CardLayout';
import FeatureLayout from './layouts/FeatureLayout';
import DefaultLayout from './layouts/DefaultLayout';

type ProductLayoutManagerProps = {
  product: Product;
  categorySlug: string;
  layoutType?: string;
  isPopular?: boolean;
};

export default function ProductLayoutManager({ 
  product, 
  categorySlug, 
  layoutType = 'default',
  isPopular = false
}: ProductLayoutManagerProps) {
  // Select the appropriate layout component based on the layout type
  switch (layoutType) {
    case 'card':
      return <CardLayout product={product} categorySlug={categorySlug} />;
    case 'feature':
      return <FeatureLayout product={product} categorySlug={categorySlug} isPopular={isPopular} />;
    default:
      return <DefaultLayout product={product} categorySlug={categorySlug} />;
  }
}