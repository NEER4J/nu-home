import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getGHLService } from '@/lib/ghl-api'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ghlService = await getGHLService(user.id)
    if (!ghlService) {
      return NextResponse.json({ error: 'GHL integration not found' }, { status: 404 })
    }

    console.log('🔍 GHL Service details:', {
      locationId: ghlService.locationId,
      userType: ghlService.userType,
      hasAccessToken: !!ghlService.accessToken
    })

    // Test both opportunities endpoints
    const results = {
      locationSpecific: { success: false, endpoint: '', response: null, error: '' },
      global: { success: false, endpoint: '', response: null, error: '' }
    }

    // Test location-specific opportunities endpoint
    if (ghlService.userType === 'Location' && ghlService.locationId) {
      const locationEndpoint = `/locations/${ghlService.locationId}/opportunities`
      try {
        console.log(`🔍 Testing location-specific opportunities: ${locationEndpoint}`)
        const locationResponse = await ghlService.makeRequest(locationEndpoint)
        results.locationSpecific = {
          success: true,
          endpoint: locationEndpoint,
          response: locationResponse,
          error: ''
        }
        console.log('✅ Location-specific opportunities response:', locationResponse)
      } catch (error) {
        results.locationSpecific = {
          success: false,
          endpoint: locationEndpoint,
          response: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        console.error('❌ Location-specific opportunities failed:', error)
      }
    }

    // Test global opportunities endpoint
    const globalEndpoint = '/opportunities'
    try {
      console.log(`🔍 Testing global opportunities: ${globalEndpoint}`)
      const globalResponse = await ghlService.makeRequest(globalEndpoint)
      results.global = {
        success: true,
        endpoint: globalEndpoint,
        response: globalResponse,
        error: ''
      }
      console.log('✅ Global opportunities response:', globalResponse)
    } catch (error) {
      results.global = {
        success: false,
        endpoint: globalEndpoint,
        response: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      console.error('❌ Global opportunities failed:', error)
    }

    return NextResponse.json({
      serviceInfo: {
        locationId: ghlService.locationId,
        userType: ghlService.userType,
        hasAccessToken: !!ghlService.accessToken
      },
      results,
      summary: {
        locationSpecificWorking: results.locationSpecific.success,
        globalWorking: results.global.success,
        anyWorking: results.locationSpecific.success || results.global.success
      }
    })

  } catch (error) {
    console.error('Error debugging opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to debug opportunities', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}