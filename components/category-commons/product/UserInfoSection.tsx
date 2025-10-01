'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, ArrowRight, RotateCcw, Camera } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import ESurveyLayout, { ESurveyImageUploadArea } from '@/components/category-commons/esurvey/ESurveyLayout'
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

interface UserInfoSectionProps {
  submissionInfo: QuoteSubmission | null
  partnerInfo: PartnerInfo | null
  onRestart?: () => void
  brandColor?: string
  submissionId?: string | null
}

export default function UserInfoSection({ submissionInfo, partnerInfo, onRestart, brandColor = '#2563eb', submissionId }: UserInfoSectionProps) {
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [showESurvey, setShowESurvey] = useState(false)
  const [isSubmittingESurvey, setIsSubmittingESurvey] = useState(false)
  const supabase = createClient()
  
  if (!submissionInfo) {
    return null
  }

  const partnerPhone = partnerInfo?.phone || '0330 113 1333'
  const partnerEmail = partnerInfo?.subdomain ? `info@${partnerInfo.subdomain}.com` : 'info@example.com'

  const handleRestart = () => {
    if (onRestart) {
      setShowRestartConfirm(true)
    }
  }

  const confirmRestart = () => {
    if (onRestart) {
      onRestart()
      setShowRestartConfirm(false)
    }
  }

  // eSurvey image upload areas
  const esurveyImageUploadAreas: ESurveyImageUploadArea[] = [
    { title: "Current boiler setup", description: "Show your existing boiler and surrounding area", icon: Camera, required: true },
    { title: "Installation area", description: "Where you'd like the new boiler installed", icon: Camera, required: true },
    { title: "Gas meter", description: "Your gas meter and pipework", icon: Camera, required: false },
    { title: "Hot water tank", description: "If you have a hot water tank", icon: Camera, required: false },
    { title: "Controls/thermostat", description: "Your current heating controls", icon: Camera, required: false }
  ]

  const handleESurveyImageUpload = (areaIndex: number, files: FileList) => {
    console.log(`Uploaded ${files.length} files for eSurvey area ${areaIndex}`)
  }

  const handleESurveySubmit = async (uploadedImages: Record<number, File[]>, uploadedImageUrls: Record<number, string[]>) => {
    setIsSubmittingESurvey(true)

    try {
      console.log('=== eSurvey SUBMISSION HANDLER CALLED ===')
      console.log('Uploaded images:', uploadedImages)
      console.log('Uploaded image URLs:', uploadedImageUrls)
      
      if (submissionId && partnerInfo) {
        // Save eSurvey data to lead_submission_data
        const esurveyData = {
          esurvey_details: {
            user_details: {
              first_name: submissionInfo.first_name,
              last_name: submissionInfo.last_name,
              email: submissionInfo.email,
              phone: submissionInfo.phone,
              postcode: submissionInfo.postcode
            },
            uploaded_images: Object.keys(uploadedImageUrls).map(areaIndex => {
              const imageUrls = uploadedImageUrls[parseInt(areaIndex)] || [];
              const area = esurveyImageUploadAreas[parseInt(areaIndex)];
              return {
                label: area?.title || `Image ${parseInt(areaIndex) + 1}`,
                url: imageUrls[0] || null
              };
            }).filter(img => img.url),
            esurvey_completed_at: new Date().toISOString()
          }
        };

        // Get service category ID
        const { data: boilerCategory } = await supabase
          .from('ServiceCategories')
          .select('service_category_id')
          .eq('slug', 'boiler')
          .single()

        if (boilerCategory) {
          // Save to lead_submission_data
          const { error } = await supabase
            .from('lead_submission_data')
            .upsert({
              submission_id: submissionId,
              partner_id: partnerInfo.user_id,
              service_category_id: boilerCategory.service_category_id,
              esurvey_data: esurveyData,
              current_page: 'esurvey',
              pages_completed: ['quote', 'products', 'esurvey'],
              last_activity_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'submission_id'
            });

          if (error) {
            console.error('Error saving eSurvey data:', error)
            throw error
          }

          console.log('eSurvey data saved successfully')

          // Send eSurvey email
          console.log('=== SENDING eSurvey EMAIL ===')
          try {
            const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
            const subdomain = hostname || null
            const isIframe = typeof window !== 'undefined' ? window.self !== window.top : false

            const emailData = {
              first_name: submissionInfo.first_name,
              last_name: submissionInfo.last_name,
              email: submissionInfo.email,
              phone: submissionInfo.phone,
              postcode: submissionInfo.postcode,
              submission_id: submissionId,
              category: 'boiler',
              uploaded_image_urls: uploadedImageUrls,
              subdomain,
              is_iframe: isIframe
            };

            console.log('Sending eSurvey email to: /api/email/boiler/esurvey-submitted')
            const emailResponse = await fetch('/api/email/boiler/esurvey-submitted', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(emailData),
            });

            if (emailResponse.ok) {
              console.log('eSurvey email sent successfully')
            } else {
              console.warn('Failed to send eSurvey email:', await emailResponse.text())
            }
          } catch (emailError) {
            console.warn('Error sending eSurvey email:', emailError)
          }

          // Close the eSurvey popup
          setShowESurvey(false)
          alert('eSurvey submitted successfully! We\'ll review your photos and get back to you.')
        }
      } else {
        console.error('Missing submissionId or partnerInfo for eSurvey');
        alert('Error: Missing required information for eSurvey submission');
      }
      
    } catch (error) {
      console.error('Failed to submit eSurvey:', error)
      alert('Failed to submit eSurvey. Please try again.')
    } finally {
      setIsSubmittingESurvey(false)
    }
  }

  return (
    <div className="bg-gray-50 py-10 md:py-20">
      <div className="max-w-[1500px] mx-auto px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Get help & advice card */}
          <Card className="!bg-gray-100 rounded-2xl border md:p-8 p-5 flex flex-col justify-between">
            <CardHeader className="!p-0 mb-3">
              <CardTitle className="!text-2xl font-medium text-gray-900">Get help & advice</CardTitle>
              <p className="text-gray-600">From our team of experts.</p>  
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Call our team */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border">
                                 <div 
                   className="w-8 h-8 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: `${brandColor}20` }}
                 >
                   <Phone 
                     className="w-4 h-4" 
                     style={{ color: brandColor }}
                   />
                 </div>
                 <div className="flex-1">
                   <p className="text-sm text-gray-700">Call our team</p>
                   <a 
                     href={`tel:${partnerPhone}`}
                     className="text-sm font-semibold underline hover:opacity-80"
                     style={{ color: brandColor }}
                   >
                    {partnerPhone}
                  </a>
                </div>
              </div>

              {/* Email contact */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border">
                                 <div 
                   className="w-8 h-8 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: `${brandColor}20` }}
                 >
                   <ArrowRight 
                     className="w-4 h-4" 
                     style={{ color: brandColor }}
                   />
                 </div>
                 <div className="flex-1">
                   <p className="text-sm text-gray-700">Email us</p>
                   <a 
                     href={`mailto:${partnerEmail}`}
                     className="text-sm font-semibold underline hover:opacity-80"
                     style={{ color: brandColor }}
                   >
                    {partnerEmail}
                  </a>
                </div>
              </div>

              {/* eSurvey button */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${brandColor}20` }}
                >
                  <Camera 
                    className="w-4 h-4" 
                    style={{ color: brandColor }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">For peace of mind</p>
                  <button 
                    onClick={() => setShowESurvey(true)}
                    className="text-sm font-semibold underline hover:opacity-80"
                    style={{ color: brandColor }}
                  >
                    Request a survey
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form answers card */}
          <Card className="!bg-gray-100 rounded-2xl md:p-8 p-5">
            <CardHeader className="!p-0 mb-3">
              <CardTitle className="!text-2xl font-medium text-gray-900">Form answers</CardTitle>
              <p className="text-gray-600">Here's what your quotes are based on.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {submissionInfo.form_answers && (Array.isArray(submissionInfo.form_answers) ? submissionInfo.form_answers.length > 0 : Object.keys(submissionInfo.form_answers).length > 0) ? (
                  (Array.isArray(submissionInfo.form_answers) ? submissionInfo.form_answers : Object.values(submissionInfo.form_answers)).map((answer: any, index) => (
                    <div key={index} className="flex md:flex-row flex-col justify-between items-start py-2 border-b border-gray-200 last:border-b-0">
                      <div className="flex-1 pr-4">
                        <p className="text-sm text-gray-700">{answer.question_text}</p>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-sm text-gray-900 font-medium">
                          {Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No form answers available</p>
                  </div>
                )}
              </div>
              
                             {/* Restart questions link */}
               <div className="mt-6 border-t border-gray-100">
                                   <button 
                    onClick={handleRestart}
                    className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
                    style={{ color: brandColor }}
                  >
                   <RotateCcw className="w-4 h-4" />
                   Restart questions
                 </button>
               </div>
            </CardContent>
                     </Card>
         </div>
       </div>

       {/* Restart Confirmation Modal */}
       <Dialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm} >
         <DialogContent variant="center">
           <DialogHeader>
             <DialogTitle>
               Restart Quote Form?
             </DialogTitle>
             <DialogDescription>
               This will take you back to the beginning of the quote form and you'll need to fill out your requirements again.
             </DialogDescription>
           </DialogHeader>
           <DialogFooter className="flex gap-3">
             <Button variant="outline" onClick={() => setShowRestartConfirm(false)}>
               Cancel
             </Button>
             <Button 
                onClick={confirmRestart}
                style={{ backgroundColor: brandColor }}
                className="hover:opacity-90"
              >
               Restart
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* eSurvey Popup */}
       <ESurveyLayout
         companyColor={partnerInfo?.company_color}
         partnerPhone={partnerInfo?.phone}
         customerName={submissionInfo.first_name}
         customerDetails={{
           name: `${submissionInfo.first_name} ${submissionInfo.last_name}`,
           phone: submissionInfo.phone || '',
           email: submissionInfo.email,
           postcode: submissionInfo.postcode
         }}
         onBack={() => setShowESurvey(false)}
         backLabel="Close"
         category="boiler"
         imageUploadAreas={esurveyImageUploadAreas}
         submissionId={submissionId || 'temp-' + Date.now()}
         onImageUpload={handleESurveyImageUpload}
         onFormSubmit={handleESurveySubmit}
         isSubmitting={isSubmittingESurvey}
         isOpen={showESurvey}
         onClose={() => setShowESurvey(false)}
       />
     </div>
   )
 }
