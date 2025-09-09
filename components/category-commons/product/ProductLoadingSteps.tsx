'use client'

import { useEffect, useState } from 'react'
import { Check, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

interface ProductLoadingStepsProps {
  brandColor?: string
  onShowQuotes?: () => void
  isLoading?: boolean
  submissionInfo?: QuoteSubmission | null
}

export default function ProductLoadingSteps({ 
  brandColor = '#1e7834', 
  onShowQuotes,
  isLoading = true,
  submissionInfo
}: ProductLoadingStepsProps) {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([])

  useEffect(() => {
    if (!isLoading) return

    // Show steps one by one with delays
    const timer1 = setTimeout(() => setVisibleSteps([0]), 500)
    const timer2 = setTimeout(() => setVisibleSteps([0, 1]), 1500)
    const timer3 = setTimeout(() => setVisibleSteps([0, 1, 2]), 2500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [isLoading])

  // Generate dynamic steps based on submission data
  const generateSteps = () => {
    const steps = []
    
    // Step 1: Dynamic based on form answers
    if (submissionInfo?.form_answers) {
      // Convert object to array if it's not already an array
      const formAnswersArray = Array.isArray(submissionInfo.form_answers) 
        ? submissionInfo.form_answers 
        : Object.values(submissionInfo.form_answers)
      
      const boilerTypeAnswer = formAnswersArray.find(
        answer => answer.question_text.toLowerCase().includes('boiler type') || 
                 answer.question_text.toLowerCase().includes('type of boiler')
      )
      
      const locationAnswer = formAnswersArray.find(
        answer => answer.question_text.toLowerCase().includes('location') || 
                 answer.question_text.toLowerCase().includes('where') ||
                 answer.question_text.toLowerCase().includes('position')
      )
      
      let step1Text = "Quoting to convert your gas system boiler system to a modern combi boiler"
      let step1Highlights = ["convert", "combi boiler"]
      
      if (boilerTypeAnswer) {
        const boilerType = Array.isArray(boilerTypeAnswer.answer) 
          ? boilerTypeAnswer.answer[0] 
          : boilerTypeAnswer.answer
        step1Text = `Quoting to convert your gas system boiler system to a modern ${boilerType}`
        step1Highlights = ["convert", boilerType.toLowerCase()]
      }
  
      
      steps.push({
        text: step1Text,
        highlights: step1Highlights
      })
    } else {
      // Fallback if no submission data
      steps.push({
        text: "Quoting to convert your gas system boiler system to a modern combi boiler.",
        highlights: ["convert", "combi boiler", "airing cupboard"]
      })
    }
    
         // Step 2: Simple static text
     steps.push({
       text: "Matching boilers that are compatible and powerful enough for your home",
       highlights: ["compatible", "powerful enough"]
     })
    
    // Step 3: Always the same
    steps.push({
      text: "Calculating your fixed price to include VAT and all labour",
      highlights: ["include VAT", "labour"]
    })
    
    return steps
  }

  const steps = generateSteps()

  const renderHighlightedText = (text: string, highlights: string[]) => {
    // Clean the text first to remove any existing HTML
    let cleanText = text.replace(/<[^>]*>/g, '')
    
    // Create a simple highlighting approach
    let result = cleanText
    highlights.forEach(highlight => {
      const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(${escapedHighlight})`, 'gi')
      result = result.replace(regex, `<span style="color: ${brandColor}; font-weight: 600;">$1</span>`)
    })
    
    return result
  }

  return (
    <div className="flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 ">
        {/* Loading Steps */}
        <div className="space-y-1">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`bg-gray-100 rounded-xl p-4 transition-all duration-700 ease-out ${
                visibleSteps.includes(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              }`}
            >
                             <div className="flex items-center gap-3">
                 {/* Icon - Spinner when loading, Checkmark when visible */}
                 <div 
                   className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500"
                   style={{ backgroundColor: brandColor }}
                 >
                   {visibleSteps.includes(index) ? (
                     <Check className="w-4 h-4 text-white transition-all duration-300" strokeWidth={3} />
                   ) : (
                     <Loader2 className="w-4 h-4 text-white animate-spin" />
                   )}
                 </div>
                
                {/* Text Content */}
                <div className="flex-1">
                  <p 
                    className="text-gray-900 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: renderHighlightedText(step.text, step.highlights)
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
