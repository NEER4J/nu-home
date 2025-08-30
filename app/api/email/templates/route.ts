import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'

// GET - Fetch email template
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const partnerId = searchParams.get('partner_id')
    const category = searchParams.get('category')
    const emailType = searchParams.get('email_type')
    const recipientType = searchParams.get('recipient_type')

    if (!partnerId || !category || !emailType || !recipientType) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Fetch the active template for this partner
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('category', category)
      .eq('email_type', emailType)
      .eq('recipient_type', recipientType)
      .eq('is_active', true)
      .single()

    if (error || !template) {
      // Return null if no custom template exists (will fall back to default)
      return NextResponse.json({ template: null })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching email template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email template' },
      { status: 500 }
    )
  }
}

// POST - Process and render email template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { template, data } = body

    if (!template || !data) {
      return NextResponse.json(
        { error: 'Missing template or data' },
        { status: 400 }
      )
    }

    // Process the template with the provided data
    let processedHtml = template.html_template
    let processedText = template.text_template || ''
    let processedSubject = template.subject_template

    // Replace variables
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processedHtml = processedHtml.replace(regex, String(value || ''))
      processedText = processedText.replace(regex, String(value || ''))
      processedSubject = processedSubject.replace(regex, String(value || ''))
    })



    // Apply styling if present
    if (template.styling) {
      const { primaryColor, fontFamily, headerBgColor, footerBgColor } = template.styling
      processedHtml = processedHtml.replace(/{{primaryColor}}/g, primaryColor || '#3b82f6')
      processedHtml = processedHtml.replace(/{{fontFamily}}/g, fontFamily || 'Arial, sans-serif')
      processedHtml = processedHtml.replace(/{{headerBgColor}}/g, headerBgColor || primaryColor || '#3b82f6')
      processedHtml = processedHtml.replace(/{{footerBgColor}}/g, footerBgColor || '#f9fafb')
    }

    // Add current year
    const currentYear = new Date().getFullYear()
    processedHtml = processedHtml.replace(/{{currentYear}}/g, String(currentYear))
    processedText = processedText.replace(/{{currentYear}}/g, String(currentYear))

    return NextResponse.json({
      subject: processedSubject,
      html: processedHtml,
      text: processedText
    })
  } catch (error) {
    console.error('Error processing email template:', error)
    return NextResponse.json(
      { error: 'Failed to process email template' },
      { status: 500 }
    )
  }
}
