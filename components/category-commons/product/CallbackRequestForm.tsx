'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Phone, Clock, CheckCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface QuoteSubmission {
  submission_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  city: string | null
  postcode: string
  submission_date: string
  status: string
  form_answers: Array<{
    question_id: string
    question_text: string
    answer: string | string[]
  }>
}

interface PartnerInfo {
  company_name: string
  contact_person: string
  postcode: string
  subdomain: string
  business_description?: string
  website_url?: string
  logo_url?: string
  user_id: string
  phone?: string
  company_color?: string
}

interface CallbackRequestFormProps {
  isOpen: boolean
  onClose: () => void
  submissionInfo: QuoteSubmission | null
  partnerInfo: PartnerInfo | null
  submissionId: string | null
  brandColor?: string
}

export default function CallbackRequestForm({ 
  isOpen, 
  onClose, 
  submissionInfo, 
  partnerInfo, 
  submissionId, 
  brandColor = '#2563eb' 
}: CallbackRequestFormProps) {
  const [formData, setFormData] = useState({
    first_name: submissionInfo?.first_name || '',
    last_name: submissionInfo?.last_name || '',
    phone: submissionInfo?.phone || '',
    email: submissionInfo?.email || '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const supabase = createClient()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!submissionId || !partnerInfo) {
        throw new Error('Missing required information for callback request')
      }

      // Get service category ID
      const { data: boilerCategory } = await supabase
        .from('ServiceCategories')
        .select('service_category_id')
        .eq('slug', 'boiler')
        .single()

      if (!boilerCategory) {
        throw new Error('Service category not found')
      }

      // Prepare callback data
      const callbackData = {
        callback_request: {
          customer_details: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
            email: formData.email,
            postcode: submissionInfo?.postcode || ''
          },
          request_details: {
            notes: formData.notes,
            requested_at: new Date().toISOString(),
            submission_id: submissionId
          }
        }
      }

      // Save to lead_submission_data
      const { error } = await supabase
        .from('lead_submission_data')
        .upsert({
          submission_id: submissionId,
          partner_id: partnerInfo.user_id,
          service_category_id: boilerCategory.service_category_id,
          callback_data: callbackData,
          current_page: 'callback_request',
          pages_completed: ['quote', 'products', 'callback_request'],
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'submission_id'
        })

      if (error) {
        console.error('Error saving callback request:', error)
        throw error
      }

      console.log('Callback request saved successfully')

      // Send callback request email
      try {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
        const subdomain = hostname || null
        const isIframe = typeof window !== 'undefined' ? window.self !== window.top : false

        const emailData = {
          firstName: formData.first_name,
          lastName: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          postcode: submissionInfo?.postcode || '',
          submissionId: submissionId,
          notes: formData.notes,
          category: 'boiler',
          subdomain,
          is_iframe: isIframe
        }

        console.log('Sending callback request email to: /api/email/boiler/callback-requested')
        const emailResponse = await fetch('/api/email/boiler/callback-requested', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailData),
        })

        if (emailResponse.ok) {
          console.log('Callback request email sent successfully')
        } else {
          console.warn('Failed to send callback request email:', await emailResponse.text())
        }
      } catch (emailError) {
        console.warn('Error sending callback request email:', emailError)
      }

      setIsSubmitted(true)
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        setIsSubmitted(false)
        onClose()
        // Reset form
        setFormData({
          first_name: submissionInfo?.first_name || '',
          last_name: submissionInfo?.last_name || '',
          phone: submissionInfo?.phone || '',
          email: submissionInfo?.email || '',
          notes: ''
        })
      }, 2000)

    } catch (error) {
      console.error('Failed to submit callback request:', error)
      alert('Failed to submit callback request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${brandColor}20` }}>
              <CheckCircle className="w-8 h-8" style={{ color: brandColor }} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Callback Request Submitted!</h3>
            <p className="text-gray-600">
              We'll call you back within 24 hours to discuss your boiler installation.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" style={{ color: brandColor }} />
            Request a Callback
          </DialogTitle>
          <DialogDescription>
            We'll call you back to discuss your boiler installation and answer any questions you have.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any specific questions or requirements..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: brandColor }}
              className="hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Request Callback
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
