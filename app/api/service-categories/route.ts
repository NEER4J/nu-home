import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = await createClient();

    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Authentication required');
    }

    // First get the categories the partner has access to
    const { data: approvedCategories, error: accessError } = await supabase
      .from('UserCategoryAccess')
      .select('service_category_id')
      .eq('user_id', session.user.id)
      .eq('status', 'approved');

    if (accessError) {
      throw accessError;
    }

    // Get the approved category IDs
    const approvedCategoryIds = approvedCategories.map(ac => ac.service_category_id);

    // Fetch only the approved categories with their fields
    const { data: categories, error: categoriesError } = await supabase
      .from('ServiceCategories')
      .select('service_category_id, name, slug')
      .eq('is_active', true)
      .in('service_category_id', approvedCategoryIds)
      .order('name');

    if (categoriesError) {
      throw categoriesError;
    }

    // Fetch fields for each approved category
    const categoriesWithFields = await Promise.all(
      categories.map(async (category) => {
        const { data: fields, error: fieldsError } = await supabase
          .from('CategoryFields')
          .select('*')
          .eq('service_category_id', category.service_category_id)
          .order('display_order');

        if (fieldsError) {
          throw fieldsError;
        }

        return {
          ...category,
          fields: fields || [], // Ensure fields is always an array
        };
      })
    );

    return NextResponse.json(categoriesWithFields);
  } catch (error) {
    console.error('Error fetching service categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service categories' },
      { status: 500 }
    );
  }
} 