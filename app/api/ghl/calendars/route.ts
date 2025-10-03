import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GHL integration for this user
    const { data: integration, error: integrationError } = await supabase
      .from('ghl_integrations')
      .select('*')
      .eq('partner_id', user.id)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'GHL integration not found' }, { status: 404 })
    }

    // Check if token is expired
    const tokenExpiresAt = new Date(integration.token_expires_at)
    const now = new Date()
    
    if (tokenExpiresAt <= now) {
      console.log('GHL token expired, attempting refresh...')
      // TODO: Implement token refresh logic here
      return NextResponse.json({ error: 'GHL token expired. Please re-authorize your GHL integration.' }, { status: 401 })
    }

    // Log the scopes for debugging
    console.log('GHL Integration scopes (raw):', integration.scope)
    console.log('GHL Integration scopes (type):', typeof integration.scope)
    console.log('Required scopes for calendars: calendars.readonly, calendars.write, calendars/events.readonly, calendars/events.write')
    
    // Check if required scopes are present
    const requiredScopes = ['calendars.readonly', 'calendars.write', 'calendars/events.readonly', 'calendars/events.write']
    const userScopes = integration.scope ? integration.scope.split(' ') : []
    console.log('User scopes (split):', userScopes)
    console.log('User scopes length:', userScopes.length)
    
    const missingScopes = requiredScopes.filter(scope => !userScopes.includes(scope))
    console.log('Missing scopes check:', missingScopes)
    
    if (missingScopes.length > 0) {
      console.error('Missing required scopes:', missingScopes)
      
      // Try alternative scope formats
      const alternativeScopes = [
        'calendars.read',
        'calendars.write', 
        'calendars.events.read',
        'calendars.events.write'
      ]
      
      const hasAlternativeScopes = alternativeScopes.every(scope => userScopes.includes(scope))
      console.log('Alternative scopes check:', hasAlternativeScopes)
      
      if (!hasAlternativeScopes) {
        return NextResponse.json({ 
          error: 'Missing required GHL scopes', 
          details: `Required scopes: ${missingScopes.join(', ')}. Please re-authorize your GHL integration with the correct scopes.`,
          missingScopes,
          userScopes,
          debug: {
            rawScope: integration.scope,
            scopeType: typeof integration.scope,
            splitScopes: userScopes
          }
        }, { status: 403 })
      }
    }

    // Make request to GHL API to get calendars
    // Using the correct endpoint from the official docs
    let ghlApiUrl = `https://services.leadconnectorhq.com/calendars/`
    
    // Add locationId as query parameter if we have one
    if (integration.location_id) {
      ghlApiUrl += `?locationId=${integration.location_id}`
    }
    
    console.log('GHL Calendars API URL:', ghlApiUrl)
    console.log('Integration details:', {
      user_type: integration.user_type,
      location_id: integration.location_id,
      company_id: integration.company_id
    })
    
    const response = await fetch(ghlApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL API error:', response.status, errorText)
      
      // Handle specific 403 location access error
      if (response.status === 403) {
        return NextResponse.json({ 
          error: 'GHL Location Access Error',
          details: 'The GHL token does not have access to this location. This usually happens when using a Company-level token to access Location-specific resources like calendars.',
          suggestion: 'Please ensure your GHL integration is set up with Location-level access, or contact support if you need to switch from Company to Location access.',
          debug: {
            user_type: integration.user_type,
            location_id: integration.location_id,
            company_id: integration.company_id
          }
        }, { status: 403 })
      }
      
      return NextResponse.json({ 
        error: `GHL API error: ${response.status}`,
        details: errorText 
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('GHL Calendars API Response:', JSON.stringify(data, null, 2))
    
    // Transform the response to match our interface
    const calendars = data.calendars?.map((calendar: any) => ({
      id: calendar.id,
      name: calendar.name,
      description: calendar.description,
      timezone: calendar.timezone,
      isActive: calendar.isActive
    })) || []

    console.log('Transformed calendars:', JSON.stringify(calendars, null, 2))
    
    // Save calendars to PartnerSettings for this partner
    try {
      console.log('💾 Saving calendars to PartnerSettings...')
      
      // Get all service categories for this partner
      const { data: serviceCategories, error: categoriesError } = await supabase
        .from('ServiceCategories')
        .select('service_category_id')
      
      if (categoriesError) {
        console.error('Error fetching service categories:', categoriesError)
      } else {
        // Update calendar_settings for each service category
        for (const category of serviceCategories || []) {
          // First, get the existing calendar settings to preserve user configurations
          const { data: existingSettings, error: fetchError } = await supabase
            .from('PartnerSettings')
            .select('calendar_settings')
            .eq('partner_id', user.id)
            .eq('service_category_id', category.service_category_id)
            .single()

          if (fetchError) {
            console.error('Error fetching existing calendar settings:', fetchError)
          }

          // Merge existing settings with new available calendars
          const existingCalendarSettings = existingSettings?.calendar_settings || {}
          const mergedCalendarSettings = {
            ...existingCalendarSettings,
            available_calendars: calendars,
            last_updated: new Date().toISOString()
          }

          const { error: updateError } = await supabase
            .from('PartnerSettings')
            .update({
              calendar_settings: mergedCalendarSettings
            })
            .eq('partner_id', user.id)
            .eq('service_category_id', category.service_category_id)
          
          if (updateError) {
            console.error('Error updating calendar settings for category:', category.service_category_id, updateError)
          } else {
            console.log('✅ Calendar settings updated for category:', category.service_category_id)
          }
        }
      }
      
    } catch (dbError) {
      console.error('Database error saving calendars:', dbError)
      // Don't fail the request, just log the error
    }
    
    return NextResponse.json(calendars)

  } catch (error) {
    console.error('Error fetching GHL calendars:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
