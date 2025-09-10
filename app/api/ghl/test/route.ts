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

    // Test multiple endpoints to see which ones work
    const testResults = {
      contacts: { success: false, error: '', data: null, endpoint: '' },
      opportunities: { success: false, error: '', data: null, endpoint: '' },
      pipelines: { success: false, error: '', data: null, endpoint: '' },
      customFields: { success: false, error: '', data: null, endpoint: '' }
    }

    // Test contacts endpoint
    try {
      let endpoint = '/contacts?limit=1'
      // Add locationId as query parameter for Location tokens
      if (ghlService.userType === 'Location' && ghlService.locationId) {
        endpoint = `/contacts?locationId=${ghlService.locationId}&limit=1`
      }
      
      const contactsResponse = await ghlService.makeRequest(endpoint)
      testResults.contacts = { success: true, error: '', data: contactsResponse, endpoint }
    } catch (error) {
      testResults.contacts.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test opportunities endpoint
    try {
      const opportunitiesResponse = await ghlService.getOpportunities()
      testResults.opportunities = { 
        success: Array.isArray(opportunitiesResponse), 
        error: '', 
        data: opportunitiesResponse, 
        endpoint: 'multiple endpoints tested' 
      }
    } catch (error) {
      testResults.opportunities.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test pipelines endpoint
    try {
      const pipelinesResponse = await ghlService.getPipelines()
      testResults.pipelines = { 
        success: Array.isArray(pipelinesResponse), 
        error: '', 
        data: pipelinesResponse, 
        endpoint: 'multiple endpoints tested' 
      }
    } catch (error) {
      testResults.pipelines.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test custom fields endpoint
    try {
      const customFieldsResponse = await ghlService.getCustomFields()
      testResults.customFields = { 
        success: Array.isArray(customFieldsResponse), 
        error: '', 
        data: customFieldsResponse, 
        endpoint: 'multiple endpoints tested' 
      }
    } catch (error) {
      testResults.customFields.error = error instanceof Error ? error.message : 'Unknown error'
    }

    const overallSuccess = Object.values(testResults).some(result => result.success)
    
    return NextResponse.json({ 
      success: overallSuccess, 
      message: overallSuccess ? 'Some GHL API endpoints working' : 'All GHL API endpoints failed',
      testResults,
      locationId: ghlService.locationId,
      userType: ghlService.userType,
      summary: {
        contacts: testResults.contacts.success,
        opportunities: testResults.opportunities.success,
        pipelines: testResults.pipelines.success,
        customFields: testResults.customFields.success
      }
    }, { status: overallSuccess ? 200 : 500 })
  } catch (error) {
    console.error('Error testing GHL connection:', error)
    return NextResponse.json(
      { error: 'Failed to test GHL connection' },
      { status: 500 }
    )
  }
}
