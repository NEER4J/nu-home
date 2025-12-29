'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function exportLeadsToCSV(filters: {
  statusFilter?: string;
  categoryFilter?: string;
  searchQuery?: string;
}) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Base query for all leads (no pagination for export)
    let dataQuery = supabase
      .from('partner_leads')
      .select(`
        *,
        ServiceCategories (
          name,
          slug
        ),
        lead_submission_data (
          quote_data,
          products_data,
          addons_data,
          survey_data,
          checkout_data,
          enquiry_data,
          success_data,
          last_activity_at,
          current_page,
          pages_completed,
          device_info,
          conversion_events,
          page_timings
        )
      `)
      .eq('assigned_partner_id', user.id) // Only get leads assigned to this partner
      .order('submission_date', { ascending: false });

    // Apply filters
    if (filters.statusFilter) {
      dataQuery = dataQuery.eq('status', filters.statusFilter);
    }
    
    if (filters.categoryFilter) {
      dataQuery = dataQuery.eq('service_category_id', filters.categoryFilter);
    }
    
    if (filters.searchQuery) {
      dataQuery = dataQuery.or(`first_name.ilike.%${filters.searchQuery}%,last_name.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%,phone.ilike.%${filters.searchQuery}%,postcode.ilike.%${filters.searchQuery}%`);
    }

    const { data: leads, error } = await dataQuery;

    if (error) {
      throw new Error(error.message);
    }

    return leads;
  } catch (error) {
    console.error('Error exporting leads:', error);
    throw error;
  }
}

export async function deletePartnerProduct(formData: FormData) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const productId = formData.get('productId') as string;
    
    if (!productId) {
      return { success: false, error: 'Product ID is required' };
    }

    // Delete the partner product (RLS policy ensures user can only delete their own products)
    const { error } = await supabase
      .from('PartnerProducts')
      .delete()
      .eq('partner_product_id', productId)
      .eq('partner_id', user.id); // Extra safety check
    
    if (error) {
      console.error('Error deleting partner product:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/partner/my-products');
    return { success: true };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Failed to delete product' };
  }
}

export async function requestCategoryAccess(formData: FormData) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const categoryId = formData.get('categoryId') as string;
    const notes = formData.get('notes') as string;

    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    // Insert access request
    const { error } = await supabase
      .from('UserCategoryAccess')
      .insert({
        user_id: user.id,
        service_category_id: categoryId,
        status: 'pending',
        notes: notes,
        requested_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error requesting category access:', error);
      throw new Error(error.message);
    }

    revalidatePath('/partner/category-access');
  } catch (error) {
    console.error('Error in requestCategoryAccess:', error);
    throw error;
  }
}
