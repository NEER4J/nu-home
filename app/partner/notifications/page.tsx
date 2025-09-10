'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, Edit, Eye, Save, RotateCcw, Users, Settings } from 'lucide-react'
import EmailTemplateEditor from '@/components/partner/notifications/EmailTemplateEditor'
import { toast } from 'sonner'
import {
  getDefaultCustomerTemplate,
  getDefaultCustomerTextTemplate,
  getDefaultAdminTemplate,
  getDefaultAdminTextTemplate
} from '@/lib/email-templates/quote-initial'
import {
  getDefaultCustomerVerifiedTemplate,
  getDefaultCustomerVerifiedTextTemplate,
  getDefaultAdminVerifiedTemplate,
  getDefaultAdminVerifiedTextTemplate
} from '@/lib/email-templates/quote-verified'
import {
  getDefaultCustomerSaveQuoteTemplate,
  getDefaultCustomerSaveQuoteTextTemplate,
  getDefaultAdminSaveQuoteTemplate,
  getDefaultAdminSaveQuoteTextTemplate
} from '@/lib/email-templates/save-quote'
import {
  getDefaultCustomerCheckoutMonthlyTemplate,
  getDefaultCustomerCheckoutMonthlyTextTemplate,
  getDefaultAdminCheckoutMonthlyTemplate,
  getDefaultAdminCheckoutMonthlyTextTemplate
} from '@/lib/email-templates/checkout-monthly'
import {
  getDefaultCustomerCheckoutPayLaterTemplate,
  getDefaultCustomerCheckoutPayLaterTextTemplate,
  getDefaultAdminCheckoutPayLaterTemplate,
  getDefaultAdminCheckoutPayLaterTextTemplate
} from '@/lib/email-templates/checkout-pay-later'
import {
  getDefaultCustomerCheckoutStripeTemplate,
  getDefaultCustomerCheckoutStripeTextTemplate,
  getDefaultAdminCheckoutStripeTemplate,
  getDefaultAdminCheckoutStripeTextTemplate
} from '@/lib/email-templates/checkout-stripe'
import {
  getDefaultCustomerEnquirySubmittedTemplate,
  getDefaultCustomerEnquirySubmittedTextTemplate,
  getDefaultAdminEnquirySubmittedTemplate,
  getDefaultAdminEnquirySubmittedTextTemplate
} from '@/lib/email-templates/enquiry-submitted'
import {
  getDefaultCustomerSurveySubmittedTemplate,
  getDefaultCustomerSurveySubmittedTextTemplate,
  getDefaultAdminSurveySubmittedTemplate,
  getDefaultAdminSurveySubmittedTextTemplate
} from '@/lib/email-templates/survey-submitted'
import { getDefaultDynamicFields, getDefaultTemplateFields, TemplateField } from '@/lib/email-templates/shared'

// Helper function to get templates based on category and email type
const getTemplatesByType = (categorySlug: string, emailType: string, recipientType: 'customer' | 'admin', templateType: 'html' | 'text') => {
  // For boiler category, use existing templates
  if (categorySlug === 'boiler') {
    if (emailType === 'quote-initial') {
      if (recipientType === 'customer') {
        return templateType === 'html' ? getDefaultCustomerTemplate() : getDefaultCustomerTextTemplate()
      } else {
        return templateType === 'html' ? getDefaultAdminTemplate() : getDefaultAdminTextTemplate()
      }
    } else if (emailType === 'quote-verified') {
      if (recipientType === 'customer') {
        return templateType === 'html' ? getDefaultCustomerVerifiedTemplate() : getDefaultCustomerVerifiedTextTemplate()
      } else {
        return templateType === 'html' ? getDefaultAdminVerifiedTemplate() : getDefaultAdminVerifiedTextTemplate()
      }
    } else if (emailType === 'save-quote') {
      if (recipientType === 'customer') {
        return templateType === 'html' ? getDefaultCustomerSaveQuoteTemplate() : getDefaultCustomerSaveQuoteTextTemplate()
      } else {
        return templateType === 'html' ? getDefaultAdminSaveQuoteTemplate() : getDefaultAdminSaveQuoteTextTemplate()
      }
    } else if (emailType === 'checkout-monthly') {
      if (recipientType === 'customer') {
        return templateType === 'html' ? getDefaultCustomerCheckoutMonthlyTemplate() : getDefaultCustomerCheckoutMonthlyTextTemplate()
      } else {
        return templateType === 'html' ? getDefaultAdminCheckoutMonthlyTemplate() : getDefaultAdminCheckoutMonthlyTextTemplate()
      }
    } else if (emailType === 'checkout-pay-later') {
      if (recipientType === 'customer') {
        return templateType === 'html' ? getDefaultCustomerCheckoutPayLaterTemplate() : getDefaultCustomerCheckoutPayLaterTextTemplate()
      } else {
        return templateType === 'html' ? getDefaultAdminCheckoutPayLaterTemplate() : getDefaultAdminCheckoutPayLaterTextTemplate()
      }
    } else if (emailType === 'checkout-stripe') {
      if (recipientType === 'customer') {
        return templateType === 'html' ? getDefaultCustomerCheckoutStripeTemplate() : getDefaultCustomerCheckoutStripeTextTemplate()
      } else {
        return templateType === 'html' ? getDefaultAdminCheckoutStripeTemplate() : getDefaultAdminCheckoutStripeTextTemplate()
      }
    } else if (emailType === 'enquiry-submitted') {
      if (recipientType === 'customer') {
        return templateType === 'html' ? getDefaultCustomerEnquirySubmittedTemplate() : getDefaultCustomerEnquirySubmittedTextTemplate()
      } else {
        return templateType === 'html' ? getDefaultAdminEnquirySubmittedTemplate() : getDefaultAdminEnquirySubmittedTextTemplate()
      }
    } else if (emailType === 'survey-submitted') {
      if (recipientType === 'customer') {
        return templateType === 'html' ? getDefaultCustomerSurveySubmittedTemplate() : getDefaultCustomerSurveySubmittedTextTemplate()
      } else {
        return templateType === 'html' ? getDefaultAdminSurveySubmittedTemplate() : getDefaultAdminSurveySubmittedTextTemplate()
      }
    }
  }
  
  // For other categories, return placeholder templates for now
  // TODO: Create category-specific template files
  if (categorySlug === 'aircon') {
    const placeholderHtml = `<h1>Placeholder ${recipientType} template for ${emailType}</h1><p>This template needs to be implemented for ${categorySlug} category.</p>`
    const placeholderText = `Placeholder ${recipientType} template for ${emailType}. This template needs to be implemented for ${categorySlug} category.`
    return templateType === 'html' ? placeholderHtml : placeholderText
  }
  
  // Default fallback
  const fallbackHtml = `<h1>Default ${recipientType} template</h1><p>Template for ${emailType} in ${categorySlug} category.</p>`
  const fallbackText = `Default ${recipientType} template for ${emailType} in ${categorySlug} category.`
  return templateType === 'html' ? fallbackHtml : fallbackText
}

interface EmailTemplate {
  template_id: string
  category: string
  service_category_id: string
  email_type: string
  recipient_type: 'customer' | 'admin'
  subject_template: string
  html_template: string
  text_template?: string
  dynamic_fields: any[]
  styling: any
  is_active: boolean
  is_default: boolean
  name?: string
  description?: string
}

interface ServiceCategory {
  service_category_id: string
  name: string
  slug: string
  description?: string
  icon_url?: string
  is_active: boolean
}

// TemplateField interface is now imported from shared.ts

// Email types organized by category slug
const EMAIL_TYPES_BY_CATEGORY = {
  boiler: [
    {
      id: 'quote-initial',
      name: 'Initial Quote Request',
      description: 'Sent when a customer submits a quote request',
    },
    {
      id: 'quote-verified',
      name: 'Quote Verified',
      description: 'Sent when a customer completes phone verification',
    },
    {
      id: 'save-quote',
      name: 'Save Quote',
      description: 'Sent when a customer saves their quote for later',
    },
    {
      id: 'checkout-monthly',
      name: 'Monthly Payment Plan Confirmed',
      description: 'Sent when a customer confirms a monthly payment plan',
    },
    {
      id: 'checkout-pay-later',
      name: 'Pay After Installation Booked',
      description: 'Sent when a customer books installation with pay-after-completion',
    },
    {
      id: 'checkout-stripe',
      name: 'Payment Confirmed',
      description: 'Sent when a customer completes payment via Stripe',
    },
    {
      id: 'enquiry-submitted',
      name: 'Enquiry Submitted',
      description: 'Sent when a customer submits a general enquiry',
    },
    {
      id: 'survey-submitted',
      name: 'Survey Submitted',
      description: 'Sent when a customer completes a survey',
    },
  ],
  aircon: [
    {
      id: 'aircon-quote-initial',
      name: 'Initial AC Quote Request',
      description: 'Sent when a customer submits an air conditioning quote request',
    },
    {
      id: 'aircon-installation-scheduled',
      name: 'Installation Scheduled',
      description: 'Sent when AC installation appointment is scheduled',
    },
    {
      id: 'aircon-maintenance-reminder',
      name: 'Maintenance Reminder',
      description: 'Sent to remind customers about AC maintenance',
    },
  ],
  // TODO: Add email types for other categories as they're implemented
  // solar: [],
  // 'heat-pump': [],
}


export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [templateFields, setTemplateFields] = useState<TemplateField[]>(getDefaultTemplateFields())
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)

  const [activeTab, setActiveTab] = useState('customer')
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [selectedEmailType, setSelectedEmailType] = useState('quote-initial')
  
  // GHL integration states
  const [ghlIntegration, setGhlIntegration] = useState<any>(null)
  const [ghlFieldMappings, setGhlFieldMappings] = useState<any[]>([])
  const [ghlOpportunities, setGhlOpportunities] = useState<any[]>([])
  const [ghlCustomFields, setGhlCustomFields] = useState<any[]>([])
  const [ghlPipelines, setGhlPipelines] = useState<any[]>([])
  const [ghlLoading, setGhlLoading] = useState(false)
  const [ghlSaving, setGhlSaving] = useState(false)
  const [loadingStages, setLoadingStages] = useState<string | null>(null)
  
  const supabase = createClient()

  // Get email types for the selected category
  const getEmailTypesForCategory = (categorySlug: string) => {
    return EMAIL_TYPES_BY_CATEGORY[categorySlug as keyof typeof EMAIL_TYPES_BY_CATEGORY] || []
  }

  const availableEmailTypes = selectedCategoryId 
    ? getEmailTypesForCategory(categories.find(c => c.service_category_id === selectedCategoryId)?.slug || '')
    : []

  useEffect(() => {
    loadCategories()
    loadGHLIntegration()
  }, [])

  useEffect(() => {
    if (selectedCategoryId) {
      const categorySlug = categories.find(c => c.service_category_id === selectedCategoryId)?.slug || ''
      const categoryEmailTypes = getEmailTypesForCategory(categorySlug)
      
      // Reset email type if current selection isn't available for this category
      if (categoryEmailTypes.length === 0) {
        setSelectedEmailType('')
        setTemplates([])
        setSelectedTemplate(null)
        setLoading(false)
        return
      } else if (!categoryEmailTypes.find(type => type.id === selectedEmailType)) {
        setSelectedEmailType(categoryEmailTypes[0].id)
      }
      
      loadTemplates()
      loadAdminEmail()
      
      // Load GHL field mappings if GHL is connected
      if (ghlIntegration) {
        loadGHLFieldMappings()
    }
    }
  }, [selectedCategoryId, selectedEmailType, categories, ghlIntegration])

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get partner profile to find profile_id
      const { data: profile, error: profileError } = await supabase
        .from('UserProfiles')
        .select('profile_id')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        setLoading(false)
        return
      }

      if (!profile) {
        setLoading(false)
        return
      }

      // Get partner's approved category access (same as my-products page)
      const { data: approvedCategories, error: categoryError } = await supabase
        .from('UserCategoryAccess')
        .select(`
          *,
          ServiceCategories(
            service_category_id,
            name,
            slug,
            description,
            icon_url,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')

      if (categoryError) {
        console.error('Category access error:', categoryError)
        toast.error('Failed to load categories')
        setLoading(false)
        return
      }

      const categories = approvedCategories
        ?.map(ac => ac.ServiceCategories)
        .filter(cat => cat && cat.is_active) as ServiceCategory[]

      setCategories(categories || [])

      // Select first category by default
      if (categories && categories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categories[0].service_category_id)
      } else if (categories.length === 0) {
        // No categories found, stop loading
        setLoading(false)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load categories')
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    if (!selectedCategoryId) {
      setLoading(false)
      return
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Check if templates exist for this partner and category
      let { data: existingTemplates, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('partner_id', user.id)
        .eq('service_category_id', selectedCategoryId)
        .eq('email_type', selectedEmailType)
        .eq('is_active', true)

      // If service_category_id query fails, try with old category approach
      if (error || !existingTemplates || existingTemplates.length === 0) {
        console.log('Trying fallback category approach for templates')
        const { data: fallbackTemplates, error: fallbackError } = await supabase
          .from('email_templates')
          .select('*')
          .eq('partner_id', user.id)
          .eq('category', 'boiler') // fallback
          .eq('email_type', selectedEmailType)
          .eq('is_active', true)

        if (!fallbackError && fallbackTemplates) {
          existingTemplates = fallbackTemplates
        }
      }

      if (existingTemplates && existingTemplates.length > 0) {
        setTemplates(existingTemplates)
        // Set the first template as selected
        const customerTemplate = existingTemplates.find(t => t.recipient_type === 'customer')
        if (customerTemplate) {
          setSelectedTemplate(customerTemplate)
        }
      } else {
        // Create default templates if none exist
        try {
          await createDefaultTemplates(user.id, selectedCategoryId, selectedEmailType)
          // After creating templates, try to load them again
          const { data: newTemplates } = await supabase
            .from('email_templates')
            .select('*')
            .eq('partner_id', user.id)
            .eq('service_category_id', selectedCategoryId)
            .eq('email_type', selectedEmailType)
            .eq('is_active', true)

          if (newTemplates && newTemplates.length > 0) {
            setTemplates(newTemplates)
            const customerTemplate = newTemplates.find(t => t.recipient_type === 'customer')
            if (customerTemplate) {
              setSelectedTemplate(customerTemplate)
            }
          } else {
            setTemplates([])
          }
        } catch (createError) {
          console.error('Error creating default templates:', createError)
          setTemplates([])
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Failed to load email templates')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  // Template fields are now hardcoded and loaded from shared.ts

  const loadAdminEmail = async () => {
    if (!selectedCategoryId) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get category-specific admin email from PartnerSettings
      const { data: partnerSettings } = await supabase
        .from('PartnerSettings')
        .select('admin_email')
        .eq('partner_id', user.id)
        .eq('service_category_id', selectedCategoryId)
        .single()

      setAdminEmail(partnerSettings?.admin_email || null)
    } catch (error) {
      console.error('Error loading admin email:', error)
      setAdminEmail(null)
    }
  }

  const createDefaultTemplates = async (partnerId: string, categoryId: string, emailType: string) => {
    try {
      // Get category slug for template selection
      const categorySlug = categories.find(c => c.service_category_id === categoryId)?.slug || ''

      // Get partner profile for company details
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('company_name, company_color, logo_url')
        .eq('user_id', partnerId)
        .single()

      // Get category-specific admin email from PartnerSettings
      const { data: partnerSettings } = await supabase
        .from('PartnerSettings')
        .select('admin_email')
        .eq('partner_id', partnerId)
        .eq('service_category_id', categoryId)
        .single()

      // Use category-specific admin email if available
      const adminEmail = partnerSettings?.admin_email

      // Generate template names and descriptions based on email type
      const getTemplateName = (recipientType: 'customer' | 'admin', emailType: string) => {
        const typeMap: Record<string, { customer: string; admin: string }> = {
          'quote-initial': { customer: 'Customer Quote Confirmation', admin: 'Admin Quote Notification' },
          'quote-verified': { customer: 'Customer Quote Verified', admin: 'Admin Quote Verified Notification' },
          'save-quote': { customer: 'Customer Save Quote', admin: 'Admin Save Quote Notification' },
          'checkout-monthly': { customer: 'Customer Monthly Payment Plan', admin: 'Admin Monthly Payment Plan Notification' },
          'checkout-pay-later': { customer: 'Customer Pay After Installation', admin: 'Admin Pay After Installation Notification' },
          'checkout-stripe': { customer: 'Customer Payment Confirmed', admin: 'Admin Payment Confirmed Notification' },
          'enquiry-submitted': { customer: 'Customer Enquiry Confirmation', admin: 'Admin Enquiry Notification' },
          'survey-submitted': { customer: 'Customer Survey Confirmation', admin: 'Admin Survey Notification' },
          'aircon-quote-initial': { customer: 'AC Quote Confirmation', admin: 'Admin AC Quote Notification' },
          'aircon-installation-scheduled': { customer: 'AC Installation Scheduled', admin: 'Admin AC Installation Notification' },
          'aircon-maintenance-reminder': { customer: 'AC Maintenance Reminder', admin: 'Admin AC Maintenance Notification' },
        }
        return typeMap[emailType]?.[recipientType] || `${recipientType} ${emailType}`
      }

      const getTemplateDescription = (recipientType: 'customer' | 'admin', emailType: string) => {
        const descMap: Record<string, { customer: string; admin: string }> = {
          'quote-initial': { customer: 'Email sent to customers after they submit a quote request', admin: 'Notification sent to admin when a new quote is submitted' },
          'quote-verified': { customer: 'Email sent to customers after phone verification is completed', admin: 'Notification sent to admin when customer completes phone verification' },
          'save-quote': { customer: 'Email sent when customer saves quote for later', admin: 'Notification sent to admin when customer saves quote' },
          'checkout-monthly': { customer: 'Email sent when customer confirms monthly payment plan', admin: 'Notification sent to admin when monthly payment plan is confirmed' },
          'checkout-pay-later': { customer: 'Email sent when customer books pay-after-installation', admin: 'Notification sent to admin when pay-after-installation is booked' },
          'checkout-stripe': { customer: 'Email sent when customer completes payment via Stripe', admin: 'Notification sent to admin when payment is completed' },
          'enquiry-submitted': { customer: 'Email sent when customer submits a general enquiry', admin: 'Notification sent to admin when enquiry is submitted' },
          'survey-submitted': { customer: 'Email sent when customer completes a survey', admin: 'Notification sent to admin when survey is submitted' },
          'aircon-quote-initial': { customer: 'Email sent to customers after AC quote request', admin: 'Notification sent to admin when new AC quote is submitted' },
          'aircon-installation-scheduled': { customer: 'Email sent when AC installation is scheduled', admin: 'Notification sent to admin about scheduled AC installation' },
          'aircon-maintenance-reminder': { customer: 'Reminder sent to customers about AC maintenance', admin: 'Notification to admin about maintenance reminders sent' },
        }
        return descMap[emailType]?.[recipientType] || `${recipientType} template for ${emailType}`
      }

      const getSubjectTemplate = (recipientType: 'customer' | 'admin', emailType: string) => {
        const subjectMap: Record<string, { customer: string; admin: string }> = {
          'quote-initial': { customer: 'Your quote request - {{companyName}}', admin: 'New Quote Request - {{companyName}}' },
          'quote-verified': { customer: 'Quote Verified Successfully - {{companyName}}', admin: 'Quote Verified - Customer Ready - {{companyName}}' },
          'save-quote': { customer: 'Quote Saved Successfully - {{companyName}}', admin: 'Customer Saved Quote - Follow Up - {{companyName}}' },
          'checkout-monthly': { customer: 'Monthly Payment Plan Confirmed - {{companyName}}', admin: 'New Monthly Payment Plan Booking - {{companyName}}' },
          'checkout-pay-later': { customer: 'Installation Booked - Pay After Completion - {{companyName}}', admin: 'New Pay After Installation Booking - {{companyName}}' },
          'checkout-stripe': { customer: 'Payment Confirmed - Your Boiler Installation - {{companyName}}', admin: 'Payment Confirmed - Installation Booking - {{companyName}}' },
          'enquiry-submitted': { customer: 'Enquiry Submitted Successfully - {{companyName}}', admin: 'New Enquiry Submitted - {{companyName}}' },
          'survey-submitted': { customer: 'Survey Submitted Successfully - {{companyName}}', admin: 'New Survey Response Received - {{companyName}}' },
          'aircon-quote-initial': { customer: 'Your AC Quote Request - {{companyName}}', admin: 'New AC Quote Request - {{companyName}}' },
          'aircon-installation-scheduled': { customer: 'AC Installation Scheduled - {{companyName}}', admin: 'AC Installation Scheduled - {{companyName}}' },
          'aircon-maintenance-reminder': { customer: 'AC Maintenance Reminder - {{companyName}}', admin: 'AC Maintenance Reminder Sent - {{companyName}}' },
        }
        return subjectMap[emailType]?.[recipientType] || `${emailType} - {{companyName}}`
      }

      const defaultTemplates = [
        {
          partner_id: partnerId,
          service_category_id: categoryId,
          category: categorySlug, // Use actual category slug
          email_type: emailType,
          recipient_type: 'customer',
          name: getTemplateName('customer', emailType),
          description: getTemplateDescription('customer', emailType),
          subject_template: getSubjectTemplate('customer', emailType),
          html_template: getTemplatesByType(categorySlug, emailType, 'customer', 'html'),
          text_template: getTemplatesByType(categorySlug, emailType, 'customer', 'text'),
          dynamic_fields: getDefaultDynamicFields(),
          styling: {
            primaryColor: profile?.company_color || '#3b82f6',
            fontFamily: 'Arial, sans-serif',
            headerBgColor: profile?.company_color || '#3b82f6',
            footerBgColor: '#f9fafb'
          },
          is_active: true,
          is_default: true
        },
        {
          partner_id: partnerId,
          service_category_id: categoryId,
          category: categorySlug, // Use actual category slug
          email_type: emailType,
          recipient_type: 'admin',
          name: getTemplateName('admin', emailType),
          description: getTemplateDescription('admin', emailType),
          subject_template: getSubjectTemplate('admin', emailType),
          html_template: getTemplatesByType(categorySlug, emailType, 'admin', 'html'),
          text_template: getTemplatesByType(categorySlug, emailType, 'admin', 'text'),
          dynamic_fields: getDefaultDynamicFields(),
          styling: {
            primaryColor: profile?.company_color || '#3b82f6',
            fontFamily: 'Arial, sans-serif',
            headerBgColor: profile?.company_color || '#3b82f6',
            footerBgColor: '#f9fafb'
          },
          is_active: true,
          is_default: true
        }
      ]

      const { error } = await supabase
        .from('email_templates')
        .insert(defaultTemplates)

      if (error) throw error
      toast.success('Default templates created successfully')
    } catch (error) {
      console.error('Error creating default templates:', error)
      toast.error('Failed to create default templates')
      throw error // Re-throw so the calling function knows it failed
    }
  }

  // Template fields are now hardcoded in shared.ts - no database dependency needed

  const handleSaveTemplate = async (updatedTemplate: EmailTemplate) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject_template: updatedTemplate.subject_template,
          html_template: updatedTemplate.html_template,
          text_template: updatedTemplate.text_template,
          dynamic_fields: updatedTemplate.dynamic_fields,
          styling: updatedTemplate.styling,
          updated_at: new Date().toISOString()
        })
        .eq('template_id', updatedTemplate.template_id)

      if (error) throw error

      toast.success('Template saved successfully')
      await loadTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleResetTemplate = async () => {
    if (!selectedTemplate || !window.confirm('Are you sure you want to reset this template to default? This action cannot be undone.')) {
      return
    }

    setSaving(true)
    try {
      // Get category slug for template selection
      const categorySlug = categories.find(c => c.service_category_id === selectedCategoryId)?.slug || ''
      
      const defaultHtml = getTemplatesByType(categorySlug, selectedEmailType, selectedTemplate.recipient_type, 'html')
      const defaultText = getTemplatesByType(categorySlug, selectedEmailType, selectedTemplate.recipient_type, 'text')
      
      // Generate appropriate subject template based on category and email type
      const getResetSubjectTemplate = (recipientType: 'customer' | 'admin', categorySlug: string, emailType: string) => {
        const subjectMap: Record<string, Record<string, { customer: string; admin: string }>> = {
          boiler: {
            'quote-initial': { customer: 'Your boiler quote request - {{companyName}}', admin: 'New Boiler Quote Request - {{companyName}}' },
            'quote-verified': { customer: 'Boiler Quote Verified - {{companyName}}', admin: 'Boiler Quote Verified - {{companyName}}' },
            'save-quote': { customer: 'Boiler Quote Saved - {{companyName}}', admin: 'Boiler Quote Saved - {{companyName}}' },
            'checkout-monthly': { customer: 'Monthly Payment Plan Confirmed - {{companyName}}', admin: 'New Monthly Payment Plan Booking - {{companyName}}' },
            'checkout-pay-later': { customer: 'Installation Booked - Pay After Completion - {{companyName}}', admin: 'New Pay After Installation Booking - {{companyName}}' },
            'checkout-stripe': { customer: 'Payment Confirmed - Your Boiler Installation - {{companyName}}', admin: 'Payment Confirmed - Installation Booking - {{companyName}}' },
            'enquiry-submitted': { customer: 'Enquiry Submitted Successfully - {{companyName}}', admin: 'New Enquiry Submitted - {{companyName}}' },
            'survey-submitted': { customer: 'Survey Submitted Successfully - {{companyName}}', admin: 'New Survey Response Received - {{companyName}}' },
          },
          aircon: {
            'aircon-quote-initial': { customer: 'Your AC quote request - {{companyName}}', admin: 'New AC Quote Request - {{companyName}}' },
            'aircon-installation-scheduled': { customer: 'AC Installation Scheduled - {{companyName}}', admin: 'AC Installation Scheduled - {{companyName}}' },
            'aircon-maintenance-reminder': { customer: 'AC Maintenance Reminder - {{companyName}}', admin: 'AC Maintenance Reminder - {{companyName}}' },
          }
        }
        return subjectMap[categorySlug]?.[emailType]?.[recipientType] || `${emailType} - {{companyName}}`
      }

      await handleSaveTemplate({
        ...selectedTemplate,
        html_template: defaultHtml,
        text_template: defaultText,
        subject_template: getResetSubjectTemplate(selectedTemplate.recipient_type, categorySlug, selectedEmailType)
      })
    } finally {
      setSaving(false)
    }
  }

  const selectTemplateByType = (recipientType: 'customer' | 'admin') => {
    const template = templates.find(t => t.recipient_type === recipientType)
    if (template) {
      setSelectedTemplate(template)
      // Don't reset edit/preview modes when switching tabs
      // setEditMode(false)
      // setPreviewMode(false)
    }
  }

  const handleTemplateChange = (template: EmailTemplate) => {
    setSelectedTemplate(template)
  }

  // GHL Integration Functions
  const loadGHLIntegration = async () => {
    setGhlLoading(true)
    console.log('🔄 Starting GHL integration load...')
    
    try {
      const { getGHLIntegration, getGHLOpportunities, getGHLCustomFields } = await import('@/lib/ghl-api-client')
      console.log('✅ GHL API client imported successfully')
      
      const integration = await getGHLIntegration()
      console.log('🔍 GHL Integration response:', integration)
      
      if (integration) {
        setGhlIntegration(integration)
        
        // Load custom fields and pipelines
        try {
          const customFields = await getGHLCustomFields()
          setGhlCustomFields(customFields || [])
        } catch (fieldsError) {
          console.error('Error loading custom fields:', fieldsError)
          setGhlCustomFields([])
        }
        
        try {
          const { getGHLPipelines } = await import('@/lib/ghl-api-client')
          const pipelines = await getGHLPipelines()
          setGhlPipelines(pipelines || [])
        } catch (pipelinesError) {
          console.error('Error loading pipelines:', pipelinesError)
          setGhlPipelines([])
        }
        
        // Load field mappings for current category and email type
        await loadGHLFieldMappings()
      } else {
        setGhlIntegration(null)
        setGhlOpportunities([])
        setGhlCustomFields([])
      }
    } catch (error) {
      console.error('Error loading GHL integration:', error)
    } finally {
      setGhlLoading(false)
    }
  }

  const loadGHLFieldMappings = async () => {
    if (!selectedCategoryId || !selectedEmailType) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('ghl_field_mappings')
        .select('*')
        .eq('partner_id', user.id)
        .eq('service_category_id', selectedCategoryId)
        .eq('email_type', selectedEmailType)
        .eq('is_active', true)

      if (error) {
        console.error('Error loading GHL field mappings:', error)
      } else if (data && data.length > 0) {
        console.log('📋 Loaded GHL field mappings:', data.map(m => ({
          recipient_type: m.recipient_type,
          tags: m.tags,
          tags_type: typeof m.tags,
          tags_is_array: Array.isArray(m.tags)
        })))
        setGhlFieldMappings(data)
      } else {
        // Create default mappings if none exist
        await createDefaultGHLMappings()
      }
    } catch (error) {
      console.error('Unexpected error loading GHL field mappings:', error)
    }
  }

  // This function is no longer needed since we load pipelines directly
  // const loadOpportunityStages = async (opportunityId: string) => { ... }

  const createDefaultGHLMappings = async () => {
    if (!selectedCategoryId || !selectedEmailType) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const defaultMappings = [
        {
          partner_id: user.id,
          service_category_id: selectedCategoryId,
          email_type: selectedEmailType,
          recipient_type: 'customer',
          pipeline_id: null,
          opportunity_stage: null,
          field_mappings: {},
          tags: [],
          is_active: true,
          is_default: true
        },
        {
          partner_id: user.id,
          service_category_id: selectedCategoryId,
          email_type: selectedEmailType,
          recipient_type: 'admin',
          pipeline_id: null,
          opportunity_stage: null,
          field_mappings: {},
          tags: [],
          is_active: true,
          is_default: true
        }
      ]

      const { data, error } = await supabase
        .from('ghl_field_mappings')
        .insert(defaultMappings)
        .select()

      if (error) {
        console.error('Error creating default GHL mappings:', error)
      } else if (data) {
        setGhlFieldMappings(data)
      }
    } catch (error) {
      console.error('Unexpected error creating default GHL mappings:', error)
    }
  }

  const saveGHLFieldMappings = async (mapping: any) => {
    setGhlSaving(true)
    
    try {
      console.log('💾 Saving GHL field mapping:', {
        mapping_id: mapping.mapping_id,
        recipient_type: mapping.recipient_type,
        tags: mapping.tags,
        tags_type: typeof mapping.tags,
        tags_is_array: Array.isArray(mapping.tags)
      })
      
      const { error } = await supabase
        .from('ghl_field_mappings')
        .update({
          pipeline_id: mapping.pipeline_id,
          opportunity_stage: mapping.opportunity_stage,
          field_mappings: mapping.field_mappings,
          tags: mapping.tags || [],
          updated_at: new Date().toISOString()
        })
        .eq('mapping_id', mapping.mapping_id)

      if (error) {
        console.error('Error saving GHL field mapping:', error)
        toast.error('Failed to save field mapping')
      } else {
        toast.success('Field mapping saved successfully')
        await loadGHLFieldMappings()
      }
    } catch (error) {
      console.error('Unexpected error saving GHL field mapping:', error)
      toast.error('Failed to save field mapping')
    } finally {
      setGhlSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Email Notifications</h1>
          <p className="mt-1 text-sm text-gray-600">Customize your email templates for different notifications</p>
        </div>
      </div>

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex overflow-x-auto pb-px" aria-label="Categories">
            {categories.map((category) => (
              <button
                key={category.service_category_id}
                onClick={() => {
                  setSelectedCategoryId(category.service_category_id)
                  setSelectedTemplate(null)
                }}
                className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  selectedCategoryId === category.service_category_id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {category.icon_url && (
                  <img 
                    src={category.icon_url} 
                    alt={category.name} 
                    className="h-4 w-4"
                  />
                )}
                <span>{category.name}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Email Type Selection */}
      {selectedCategoryId && (
        <div className="mb-6 border-b border-gray-200">
          {availableEmailTypes.length > 0 ? (
            <nav className="flex space-x-8" aria-label="Email Types">
              {availableEmailTypes.map((emailType) => (
                <button
                  key={emailType.id}
                  onClick={() => {
                    setSelectedEmailType(emailType.id)
                    setSelectedTemplate(null)
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedEmailType === emailType.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {emailType.name}
                </button>
              ))}
            </nav>
          ) : (
            <div className="py-8 text-center">
              <div className="bg-gray-50 rounded-lg p-6">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Email Types Available</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Email templates are not yet available for the {categories.find(c => c.service_category_id === selectedCategoryId)?.name || 'selected'} category.
                  <br />
                  Email notifications are currently only supported for Boiler services.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Template Section */}
      {availableEmailTypes.length > 0 && selectedEmailType && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {availableEmailTypes.find(et => et.id === selectedEmailType)?.name || 'Email Templates'}
                </h2>
                <p className="text-sm text-gray-500">
                  {availableEmailTypes.find(et => et.id === selectedEmailType)?.description || 'Customize your email templates for different notifications'}
                </p>
                {adminEmail && (
                  <p className="text-xs text-blue-600 mt-1">
                    Admin notifications will be sent to: {adminEmail}
                  </p>
                )}
                {!adminEmail && (
                  <p className="text-xs text-amber-600 mt-1">
                    No admin email configured. Configure in Settings → General Settings → Admin Email Settings
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetTemplate}
                disabled={saving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
              <Button
                size="sm"
                onClick={() => selectedTemplate && handleSaveTemplate(selectedTemplate)}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer/Admin Email Tabs */}
      {selectedCategoryId && availableEmailTypes.length > 0 && selectedEmailType && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Email Types">
            <button
              onClick={() => {
                setActiveTab('customer')
                selectTemplateByType('customer')
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'customer'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Customer Email
            </button>
            <button
              onClick={() => {
                setActiveTab('admin')
                selectTemplateByType('admin')
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'admin'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Admin Email
            </button>
            {ghlIntegration && (
              <button
                onClick={() => setActiveTab('leads')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'leads'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Leads</span>
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Template Content */}
      {selectedTemplate && availableEmailTypes.length > 0 && selectedEmailType && activeTab !== 'leads' && (
        <EmailTemplateEditor
          template={selectedTemplate}
          templateFields={templateFields}
          onChange={handleTemplateChange}
        />
      )}

      {/* Leads Tab Content */}
      {activeTab === 'leads' && ghlIntegration && availableEmailTypes.length > 0 && selectedEmailType && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
    </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">GoHighLevel Integration Active</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Configure how leads are sent to your GoHighLevel CRM for this email type.
                  </p>
                </div>
              </div>
              <button
                onClick={loadGHLIntegration}
                disabled={ghlLoading}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ghlLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </>
                )}
              </button>
            </div>
          </div>


          {ghlFieldMappings.map((mapping) => (
            <div key={mapping.mapping_id} className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {mapping.recipient_type === 'customer' ? 'Customer Lead' : 'Admin Lead'} Mapping
                </h3>
                <Button
                  onClick={() => saveGHLFieldMappings(mapping)}
                  disabled={ghlSaving}
                  size="sm"
                >
                  {ghlSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Mapping
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pipeline Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pipeline
                  </label>
                  <select
                    value={mapping.pipeline_id || ''}
                    onChange={(e) => {
                      const pipelineId = e.target.value
                      const updatedMapping = { ...mapping, pipeline_id: pipelineId, opportunity_stage: '' }
                      setGhlFieldMappings(prev => 
                        prev.map(m => m.mapping_id === mapping.mapping_id ? updatedMapping : m)
                      )
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a pipeline</option>
                    {ghlPipelines.map((pipeline) => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose the pipeline where new opportunities will be created
                  </p>
                </div>

                {/* Stage Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Stage
                  </label>
                  <select
                    value={mapping.opportunity_stage || ''}
                    onChange={(e) => {
                      const updatedMapping = { ...mapping, opportunity_stage: e.target.value }
                      setGhlFieldMappings(prev => 
                        prev.map(m => m.mapping_id === mapping.mapping_id ? updatedMapping : m)
                      )
                    }}
                    disabled={!mapping.pipeline_id}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!mapping.pipeline_id ? 'Select a pipeline first' : 'Select initial stage'}
                    </option>
                    {mapping.pipeline_id && ghlPipelines
                      .find(pipeline => pipeline.id === mapping.pipeline_id)
                      ?.stages?.map((stage: any) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The stage where new opportunities will be placed initially
                  </p>
                </div>
              </div>

              {/* Tags Configuration */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Tags</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags to Apply to Contacts
                    </label>
                    <div className="relative">
                      <div className="flex flex-wrap items-center gap-2 p-3 border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[42px]">
                        {Array.isArray(mapping.tags) && mapping.tags.length > 0 && (
                          <>
                            {mapping.tags.map((tag: string, tagIndex: number) => (
                              <span
                                key={tagIndex}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                              >
                                {tag}
                                <button
                                  onClick={() => {
                                    const updatedTags = mapping.tags.filter((_: string, index: number) => index !== tagIndex)
                                    const updatedMapping = { ...mapping, tags: updatedTags }
                                    setGhlFieldMappings(prev => 
                                      prev.map(m => m.mapping_id === mapping.mapping_id ? updatedMapping : m)
                                    )
                                  }}
                                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                                  title="Remove tag"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                            {Array.isArray(mapping.tags) && mapping.tags.length > 0 && (
                              <button
                                onClick={() => {
                                  const updatedMapping = { ...mapping, tags: [] }
                                  setGhlFieldMappings(prev => 
                                    prev.map(m => m.mapping_id === mapping.mapping_id ? updatedMapping : m)
                                  )
                                }}
                                className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors ml-2"
                              >
                                Clear All
                              </button>
                            )}
                          </>
                        )}
                        <input
                          type="text"
                          placeholder={Array.isArray(mapping.tags) && mapping.tags.length > 0 ? "Add more tags..." : "Type tag and press Enter"}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const currentValue = e.currentTarget.value.trim()
                              if (currentValue && (!Array.isArray(mapping.tags) || !mapping.tags.includes(currentValue))) {
                                const newTags = Array.isArray(mapping.tags) ? [...mapping.tags, currentValue] : [currentValue]
                                const updatedMapping = { ...mapping, tags: newTags }
                                setGhlFieldMappings(prev => 
                                  prev.map(m => m.mapping_id === mapping.mapping_id ? updatedMapping : m)
                                )
                                e.currentTarget.value = ''
                              }
                            }
                          }}
                          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Press Enter to add tags. These will be applied to {mapping.recipient_type} leads in GoHighLevel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field Mappings */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Field Mappings</h4>
                <div className="space-y-3">
                  {templateFields.map((field, index) => (
                    <div key={field.field_name || index} className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.display_name}
                        </label>
                        <p className="text-xs text-gray-500">{field.description}</p>
                      </div>
                      <div className="flex-1">
                        <select
                          value={mapping.field_mappings[field.field_name] || ''}
                          onChange={(e) => {
                            const updatedFieldMappings = {
                              ...mapping.field_mappings,
                              [field.field_name]: e.target.value
                            }
                            const updatedMapping = { ...mapping, field_mappings: updatedFieldMappings }
                            setGhlFieldMappings(prev => 
                              prev.map(m => m.mapping_id === mapping.mapping_id ? updatedMapping : m)
                            )
                          }}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select GHL field</option>
                          {ghlCustomFields.map((ghlField) => (
                            <option key={ghlField.id} value={ghlField.id}>
                              {ghlField.name} ({ghlField.fieldType})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {ghlFieldMappings.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Field Mappings</h3>
              <p className="mt-2 text-sm text-gray-500">
                Field mappings will be created automatically when you select a category and email type.
              </p>
            </div>
          )}
        </div>
      )}

      {/* GHL Not Connected Message */}
      {activeTab === 'leads' && !ghlIntegration && (
        <div className="text-center py-12">
          <Settings className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">GoHighLevel Not Connected</h3>
          <p className="mt-2 text-sm text-gray-500">
            Please connect your GoHighLevel account in Settings to configure lead mappings.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => window.open('/partner/settings', '_blank')}
              variant="outline"
            >
              Go to Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

