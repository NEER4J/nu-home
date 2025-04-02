export interface ServiceCategory {
  service_category_id: string;
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  form_style?: string;
  show_thank_you?: boolean;
  redirect_to_products?: boolean;
  fields_layout: string;
  products_list_layout: string;
  addon_types?: AddonType[];
}

export interface AddonType {
  addon_type_id: string;
  name: string;
  service_category_id: string;
  created_at?: string;
  updated_at?: string;
  ServiceCategory?: ServiceCategory;
}

export interface Addon {
  addon_id: string;
  title: string;
  description: string;
  addon_type_id: string;
  price: number;
  image_link?: string;
  service_category_id: string;
  partner_id: string;
  created_at: string;
  updated_at: string;
  ServiceCategories?: ServiceCategory;
  AddonType?: AddonType;
} 