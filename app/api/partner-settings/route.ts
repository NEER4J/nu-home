import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const serviceCategoryId = searchParams.get('service_category_id');
  
  if (!serviceCategoryId) {
    return NextResponse.json({ error: 'Service category ID is required' }, { status: 400 });
  }

  try {
    console.log('API: Getting settings for user:', user.id, 'category:', serviceCategoryId);
    
    // Get partner settings for the specific service category
    const { data: settings, error: settingsError } = await supabase
      .from('PartnerSettings')
      .select('*')
      .eq('partner_id', user.id)
      .eq('service_category_id', serviceCategoryId)
      .single();

    // Get user profile for OTP and company color
    const { data: profile, error: profileError } = await supabase
      .from('UserProfiles')
      .select('otp, company_color')
      .eq('user_id', user.id)
      .single();

    console.log('API: Settings query result:', settings, 'Error:', settingsError);
    console.log('API: Profile query result:', profile, 'Error:', profileError);

    if (settingsError && settingsError.code !== 'PGRST116') { // Not found error is OK
      console.log('API: Database error:', settingsError);
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    if (profileError) {
      console.log('API: Profile error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Combine settings and profile data
    const combinedData = {
      ...settings,
      otp_enabled: profile?.otp || false,
      company_color: profile?.company_color || null
    };

    return NextResponse.json({ data: combinedData });
  } catch (error) {
    console.error('API: Catch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { service_category_id, apr_settings, otp_enabled, company_color, included_items, faqs, admin_email } = body;

    if (!service_category_id) {
      return NextResponse.json({ error: 'Service category ID is required' }, { status: 400 });
    }

    // Update UserProfiles for OTP and company color
    const { error: profileError } = await supabase
      .from('UserProfiles')
      .update({
        otp: otp_enabled || false,
        company_color: company_color || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Upsert partner settings (without otp_enabled since it's in UserProfiles now)
    const { data: settings, error: settingsError } = await supabase
      .from('PartnerSettings')
      .upsert({
        partner_id: user.id,
        service_category_id,
        apr_settings: apr_settings || {},
        included_items: included_items || [],
        faqs: faqs || [],
        is_stripe_enabled: body.is_stripe_enabled || false,
        is_kanda_enabled: body.is_kanda_enabled || false,
        is_monthly_payment_enabled: body.is_monthly_payment_enabled || false,
        is_pay_after_installation_enabled: body.is_pay_after_installation_enabled || false,
        admin_email: admin_email || null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    // Return combined data
    const combinedData = {
      ...settings,
      otp_enabled: otp_enabled || false,
      company_color: company_color || null
    };

    return NextResponse.json({ data: combinedData });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  
  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { service_category_id, apr_settings, otp_enabled, company_color, included_items, faqs, admin_email } = body;

    if (!service_category_id) {
      return NextResponse.json({ error: 'Service category ID is required' }, { status: 400 });
    }

    // Update UserProfiles for OTP and company color
    const { error: profileError } = await supabase
      .from('UserProfiles')
      .update({
        otp: otp_enabled || false,
        company_color: company_color || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Update partner settings (without otp_enabled since it's in UserProfiles now)
    const { data: settings, error: settingsError } = await supabase
      .from('PartnerSettings')
      .update({
        apr_settings: apr_settings || {},
        included_items: included_items || [],
        faqs: faqs || [],
        is_stripe_enabled: body.is_stripe_enabled || false,
        is_kanda_enabled: body.is_kanda_enabled || false,
        is_monthly_payment_enabled: body.is_monthly_payment_enabled || false,
        is_pay_after_installation_enabled: body.is_pay_after_installation_enabled || false,
        admin_email: admin_email || null,
        updated_at: new Date().toISOString()
      })
      .eq('partner_id', user.id)
      .eq('service_category_id', service_category_id)
      .select()
      .single();

    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    // Return combined data
    const combinedData = {
      ...settings,
      otp_enabled: otp_enabled || false,
      company_color: company_color || null
    };

    return NextResponse.json({ data: combinedData });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}