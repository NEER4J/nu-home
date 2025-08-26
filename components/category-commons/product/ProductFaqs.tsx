'use client'

import { useMemo } from 'react'
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface ProductFaqsProps {
  faqs?: Array<any> | null
}

export default function ProductFaqs({ faqs }: ProductFaqsProps) {
  const items = useMemo(() => {
    const arr = Array.isArray(faqs) ? faqs : []
    return arr.map((f) => ({
      q: f?.question ?? f?.q ?? '',
      a: f?.answer ?? f?.a ?? '',
      raw: f,
    }))
  }, [faqs])

  return (
    <div className="bg-white">
      <div className="max-w-[1500px] mx-auto px-6 py-10 md:py-20">
        <div className="">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Frequently asked questions</h2>
          </div>
          
                     {items.length > 0 ? (
             <Accordion type="single" collapsible className="w-full">
              {items.map((faq, idx) => {
                const hasQ = typeof faq.q === 'string' && faq.q.trim().length > 0
                return (
                  <AccordionItem key={idx} value={`item-${idx}`} className="border-b border-gray-200">
                    <AccordionTrigger 
                      className="text-left font-medium hover:no-underline py-4 text-gray-900"
                    >
                      {hasQ ? faq.q : 'Untitled question'}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-gray-700">
                      {faq.a && typeof faq.a === 'string' ? (
                        <p className="leading-6 whitespace-pre-line">{faq.a}</p>
                      ) : (
                        <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">{JSON.stringify(faq.raw, null, 2)}</pre>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          ) : (
            <p className="text-sm text-gray-600">No FAQs provided.</p>
          )}
          
          <div className="mt-6">
            <Button
              asChild
              className="bg-gray-900 hover:bg-gray-800"
            >
              <a href="#top">
                Back to top
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}



