'use client'

import { useMemo, useState } from 'react'

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
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Frequently asked questions</h3>
            {items.length > 1 && (
              <div className="flex items-center gap-3 text-sm">
                <button onClick={expandAll} className="text-gray-600 hover:text-gray-900 underline">Expand all</button>
                <button onClick={collapseAll} className="text-gray-600 hover:text-gray-900 underline">Collapse all</button>
              </div>
            )}
          </div>
          {items.length > 0 ? (
            <div className="divide-y rounded-lg overflow-hidden bg-white border">
              {items.map((faq, idx) => {
                const isOpen = openSet.has(idx)
                const hasQ = typeof faq.q === 'string' && faq.q.trim().length > 0
                return (
                  <div key={idx} className="">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggle(idx)}
                      className="w-full flex items-center justify-between gap-4 px-4 py-3 focus:outline-none hover:bg-gray-50"
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
                    </button>
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
            <a
              href="#top"
              className="inline-block px-4 py-2 text-white rounded-md hover:opacity-90"
              style={{ backgroundColor: brandColor }}
            >
              Back to top
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}



