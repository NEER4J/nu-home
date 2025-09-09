import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('categorySlug');
    const partnerId = searchParams.get('partnerId');

    if (!categorySlug) {
      return NextResponse.json(
        { error: 'Category slug is required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // First get the category ID from the slug
    const { data: category, error: categoryError } = await supabase
      .from('ServiceCategories')
      .select('service_category_id')
      .eq('slug', categorySlug)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Build the query for addons
    let query = supabase
      .from('Addons')
      .select(`
        *,
        UserProfiles!Addons_partner_id_fkey (
          company_name,
          logo_url
        )
      `)
      .eq('service_category_id', category.service_category_id);

    // If partnerId is provided, filter by partner
    if (partnerId) {
      query = query.eq('partner_id', partnerId);
    }

    const { data: addons, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch addons' },
        { status: 500 }
      );
    }

    return NextResponse.json(addons);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 