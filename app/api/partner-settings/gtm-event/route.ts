import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(request.url);
    const partnerId = url.searchParams.get('partner_id');
    const serviceCategoryId = url.searchParams.get('service_category_id');

    if (!partnerId || !serviceCategoryId) {
      return NextResponse.json(
        { error: 'partner_id and service_category_id are required' },
        { status: 400 }
      );
    }

    // Get the GTM event name from PartnerSettings
    const { data: settings, error } = await supabase
      .from('PartnerSettings')
      .select('gtm_event_name')
      .eq('partner_id', partnerId)
      .eq('service_category_id', serviceCategoryId)
      .single();

    if (error) {
      console.error('Error fetching GTM event name:', error);
      return NextResponse.json(
        { error: 'Failed to fetch GTM event name' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      gtm_event_name: settings?.gtm_event_name || null
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
