// types/product.types.ts

import { ServiceCategory } from './database.types';

export interface Partner {
  partner_id: string;
  company_name: string;
  logo_url: string | null;
  website_url: string | null;
}

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
  is_template?: boolean; // Indicates if this is a template product
  owner_id?: string; // User ID of the partner who owns this product
  from_template_id?: string | null; // ID of the template product this was created from
  created_at: string;
  updated_at: string;
  ServiceCategory?: ServiceCategory;
  ServiceCategories?: { name: string }; // For API responses from Supabase
  Partner?: Partner; // Partner information for partner products
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
  is_template?: boolean;
  owner_id?: string;
  from_template_id?: string | null;
}

// Define types for category fields with simplified JSON structure
export interface FieldChild {
  name: string;
  key: string;
  field_type: 'text' | 'number' | 'textarea' | 'image' | 'select' | 'checkbox' | 'date' | 'group' | 'repeater';
  is_required: boolean;
  is_multi?: boolean;
  options?: any;
  children?: FieldChild[];
}

export interface CategoryField {
  field_id: string;
  service_category_id: string;
  name: string;
  key: string;
  label?: string;
  field_type: 'text' | 'number' | 'textarea' | 'image' | 'repeater' | 'select' | 'checkbox' | 'date' | 'group';
  is_required: boolean;
  display_order: number;
  options: any;
  is_multi: boolean;
  display_format: string;
  help_text?: string;
  field_group_type?: 'none' | 'group' | 'repeater' | 'group_child' | 'repeater_child';
  parent_field_id?: string | null;
  field_structure?: {
    children?: FieldChild[];
  };
  created_at: string;
  updated_at: string;
}

// Helper type for rendering
export interface FlattenedField {
  id: string;
  name: string;
  key: string;
  field_type: string;
  is_required: boolean;
  level: number;
  parent?: string;
  children?: FlattenedField[];
}

// Type for nested field structure
export interface NestedFieldStructure {
  topLevel: CategoryField[];
  grouped: { [parentId: string]: CategoryField[] };
}