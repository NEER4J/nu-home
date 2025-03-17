// types/product.types.ts

import { ServiceCategory } from './database.types';

export interface Product {
  product_id: string;
  service_category_id: string;
  name: string;
  slug: string;
  description: string;
  price: number | null;
  image_url: string | null;
  specifications: Record<string, any>;
  product_fields: Record<string, any>; // Dynamic fields
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  ServiceCategory?: ServiceCategory;
}

export interface ProductFormData {
  name: string;
  service_category_id: string;
  slug: string;
  description: string;
  price?: number;
  image_url?: string;
  specifications: Record<string, any>;
  product_fields: Record<string, any>; // Dynamic fields
  is_featured: boolean;
  is_active: boolean;
}

// Define types for category fields
export interface CategoryField {
  field_id: string;
  service_category_id: string;
  name: string;
  key: string;
  field_type: 'text' | 'number' | 'textarea' | 'image' | 'repeater' | 'select' | 'checkbox' | 'date';
  is_required: boolean;
  display_order: number;
  options: any;
  is_multi: boolean; // Flag for multi-select
  display_format: string;
  created_at: string;
  updated_at: string;
}