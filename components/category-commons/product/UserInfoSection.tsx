'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, ArrowRight, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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
}

export default function UserInfoSection({ submissionInfo, partnerInfo, onRestart, brandColor = '#2563eb' }: UserInfoSectionProps) {
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  
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
                {submissionInfo.form_answers && submissionInfo.form_answers.length > 0 ? (
                  submissionInfo.form_answers.map((answer, index) => (
                    <div key={index} className="flex md:flex-row flex-col justify-between items-start py-2 border-b border-gray-100 last:border-b-0">
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
     </div>
   )
 }
