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
    const { service_category_id, apr_settings, otp_enabled, company_color, included_items, non_included_items, faqs, admin_email, gtm_event_name, main_page_url, ghl_calendar_enabled, ghl_calendar_id, calendar_settings, review_section, main_cta } = body;

    if (!service_category_id) {
      return NextResponse.json({ error: 'Service category ID is required' }, { status: 400 });
    }

    // Validate and sanitize JSONB fields
    const validateJSON = (obj: any, fieldName: string) => {
      try {
        return obj ? JSON.parse(JSON.stringify(obj)) : {};
      } catch (error) {
        console.error(`POST: Invalid JSON for ${fieldName}:`, obj);
        throw new Error(`Invalid JSON format for ${fieldName}`);
      }
    };

    const validateArray = (arr: any, fieldName: string) => {
      try {
        return Array.isArray(arr) ? arr : [];
      } catch (error) {
        console.error(`POST: Invalid array for ${fieldName}:`, arr);
        throw new Error(`Invalid array format for ${fieldName}`);
      }
    };

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
    const upsertData = {
      partner_id: user.id,
      service_category_id,
      apr_settings: validateJSON(apr_settings, 'apr_settings'),
      included_items: validateArray(included_items, 'included_items'),
      non_included_items: validateArray(non_included_items, 'non_included_items'),
      faqs: validateArray(faqs, 'faqs'),
      is_stripe_enabled: Boolean(body.is_stripe_enabled),
      is_kanda_enabled: Boolean(body.is_kanda_enabled),
      is_monthly_payment_enabled: Boolean(body.is_monthly_payment_enabled),
      is_pay_after_installation_enabled: Boolean(body.is_pay_after_installation_enabled),
      admin_email: admin_email?.trim() || null,
      gtm_event_name: gtm_event_name?.trim() || null,
      main_page_url: main_page_url?.trim() || null,
      calendar_settings: validateJSON(calendar_settings, 'calendar_settings'),
      review_section: validateJSON(review_section, 'review_section'),
      main_cta: validateJSON(main_cta, 'main_cta'),
      updated_at: new Date().toISOString()
    };

    console.log('POST: Upserting partner settings with data:', JSON.stringify(upsertData, null, 2));

    const { data: settings, error: settingsError } = await supabase
      .from('PartnerSettings')
      .upsert(upsertData, {
        onConflict: 'partner_id,service_category_id',
        ignoreDuplicates: false
      })
      .select();

    if (settingsError) {
      console.error('POST: Upsert error:', settingsError);
      return NextResponse.json({
        error: settingsError.message || 'Failed to save partner settings',
        details: settingsError
      }, { status: 500 });
    }

    console.log('POST: Upsert result:', settings);

    // Get the first record from the array (upsert returns array)
    const settingsRecord = Array.isArray(settings) ? settings[0] : settings;

    if (!settingsRecord) {
      console.error('POST: No settings record returned from upsert');
      return NextResponse.json({ error: 'No data returned from upsert operation' }, { status: 500 });
    }

    // Return combined data
    const combinedData = {
      ...settingsRecord,
      otp_enabled: otp_enabled || false,
      company_color: company_color || null
    };

    return NextResponse.json({ data: combinedData });
  } catch (error) {
    console.error('POST: Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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
    const { service_category_id, apr_settings, otp_enabled, company_color, included_items, non_included_items, faqs, admin_email, gtm_event_name, main_page_url, ghl_calendar_enabled, ghl_calendar_id, calendar_settings, review_section, main_cta } = body;

    if (!service_category_id) {
      return NextResponse.json({ error: 'Service category ID is required' }, { status: 400 });
    }

    // Validate and sanitize JSONB fields
    const validateJSON = (obj: any, fieldName: string) => {
      try {
        return obj ? JSON.parse(JSON.stringify(obj)) : {};
      } catch (error) {
        console.error(`PUT: Invalid JSON for ${fieldName}:`, obj);
        throw new Error(`Invalid JSON format for ${fieldName}`);
      }
    };

    const validateArray = (arr: any, fieldName: string) => {
      try {
        return Array.isArray(arr) ? arr : [];
      } catch (error) {
        console.error(`PUT: Invalid array for ${fieldName}:`, arr);
        throw new Error(`Invalid array format for ${fieldName}`);
      }
    };

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
    const updateData = {
      apr_settings: validateJSON(apr_settings, 'apr_settings'),
      included_items: validateArray(included_items, 'included_items'),
      non_included_items: validateArray(non_included_items, 'non_included_items'),
      faqs: validateArray(faqs, 'faqs'),
      is_stripe_enabled: Boolean(body.is_stripe_enabled),
      is_kanda_enabled: Boolean(body.is_kanda_enabled),
      is_monthly_payment_enabled: Boolean(body.is_monthly_payment_enabled),
      is_pay_after_installation_enabled: Boolean(body.is_pay_after_installation_enabled),
      admin_email: admin_email?.trim() || null,
      gtm_event_name: gtm_event_name?.trim() || null,
      main_page_url: main_page_url?.trim() || null,
      calendar_settings: validateJSON(calendar_settings, 'calendar_settings'),
      review_section: validateJSON(review_section, 'review_section'),
      main_cta: validateJSON(main_cta, 'main_cta'),
      updated_at: new Date().toISOString()
    };

    console.log('PUT: Updating partner settings with data:', JSON.stringify(updateData, null, 2));

    const { data: settings, error: settingsError } = await supabase
      .from('PartnerSettings')
      .update(updateData)
      .eq('partner_id', user.id)
      .eq('service_category_id', service_category_id)
      .select();

    if (settingsError) {
      console.error('PUT: Update error:', settingsError);
      return NextResponse.json({
        error: settingsError.message || 'Failed to update partner settings',
        details: settingsError
      }, { status: 500 });
    }

    console.log('PUT: Update result:', settings);

    // Handle case where no rows were updated (record doesn't exist)
    if (!settings || (Array.isArray(settings) && settings.length === 0)) {
      console.log('PUT: No existing record found, falling back to upsert');

      // If no record exists to update, create one with upsert
      const { data: upsertedSettings, error: upsertError } = await supabase
        .from('PartnerSettings')
        .upsert({
          partner_id: user.id,
          service_category_id,
          ...updateData
        }, {
          onConflict: 'partner_id,service_category_id',
          ignoreDuplicates: false
        })
        .select();

      if (upsertError) {
        console.error('PUT: Fallback upsert error:', upsertError);
        return NextResponse.json({
          error: upsertError.message || 'Failed to create partner settings',
          details: upsertError
        }, { status: 500 });
      }

      const upsertedRecord = Array.isArray(upsertedSettings) ? upsertedSettings[0] : upsertedSettings;

      if (!upsertedRecord) {
        console.error('PUT: No record returned from fallback upsert');
        return NextResponse.json({ error: 'Failed to create partner settings' }, { status: 500 });
      }

      const combinedData = {
        ...upsertedRecord,
        otp_enabled: otp_enabled || false,
        company_color: company_color || null
      };

      return NextResponse.json({ data: combinedData });
    }

    // Get the first record from the array (update returns array)
    const settingsRecord = Array.isArray(settings) ? settings[0] : settings;

    // Return combined data
    const combinedData = {
      ...settingsRecord,
      otp_enabled: otp_enabled || false,
      company_color: company_color || null
    };

    return NextResponse.json({ data: combinedData });
  } catch (error) {
    console.error('PUT: Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}