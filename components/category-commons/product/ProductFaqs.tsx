'use client'

import { useMemo, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProductFaqsProps {
  faqs?: Array<any> | null
  brandColor?: string
}

export default function ProductFaqs({ faqs, brandColor = '#2563eb' }: ProductFaqsProps) {
  const items = useMemo(() => {
    const arr = Array.isArray(faqs) ? faqs : []
    return arr.map((f) => ({
      q: f?.question ?? f?.q ?? '',
      a: f?.answer ?? f?.a ?? '',
      raw: f,
    }))
  }, [faqs])

  const [openSet, setOpenSet] = useState<Set<number>>(new Set(items.length ? [0] : []))

  const toggle = (idx: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const expandAll = () => setOpenSet(new Set(items.map((_, i) => i)))
  const collapseAll = () => setOpenSet(new Set())

  return (
    <div className="bg-white border-t mt-10">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card className="bg-gray-50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">Frequently asked questions</CardTitle>
              {items.length > 1 && (
                <div className="flex items-center gap-3 text-sm">
                  <Button variant="ghost" size="sm" onClick={expandAll} className="text-gray-600 hover:text-gray-900">
                    Expand all
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll} className="text-gray-600 hover:text-gray-900">
                    Collapse all
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {items.length > 0 ? (
              <div className="divide-y rounded-lg overflow-hidden bg-white border">
                {items.map((faq, idx) => {
                  const isOpen = openSet.has(idx)
                  const hasQ = typeof faq.q === 'string' && faq.q.trim().length > 0
                  return (
                    <div key={idx} className="">
                      <Button
                        type="button"
                        variant="ghost"
                        aria-expanded={isOpen}
                        onClick={() => toggle(idx)}
                        className="w-full flex items-center justify-between gap-4 px-4 py-3 focus:outline-none hover:bg-gray-50 h-auto"
                      >
                        <span
                          className="text-left font-medium"
                          style={{ color: isOpen ? brandColor : '#111827' }}
                        >
                          {hasQ ? faq.q : 'Untitled question'}
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                      {isOpen && (
                        <div className="px-4 pb-4 text-sm text-gray-700">
                          {faq.a && typeof faq.a === 'string' ? (
                            <p className="leading-6 whitespace-pre-line">{faq.a}</p>
                          ) : (
                            <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">{JSON.stringify(faq.raw, null, 2)}</pre>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No FAQs provided.</p>
            )}
            <div className="mt-6">
              <Button
                asChild
                style={{ backgroundColor: brandColor }}
                className="hover:opacity-90"
              >
                <a href="#top">
                  Back to top
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



