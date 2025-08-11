'use client'

import { useMemo, useState } from 'react'
import SaveQuoteDialog, { type ProductSummary } from './SaveQuoteDialog'

interface ProductHeaderTileProps {
  count: number
  postcode?: string | null
  filterBedroom: string | null
  filterBathroom: string | null
  filterBoilerType: string | null
  setFilterBedroom: (value: string | null) => void
  setFilterBathroom: (value: string | null) => void
  setFilterBoilerType: (value: string | null) => void
  clearFilters: () => void
  resetFiltersToSubmission?: () => void
  includedItems?: Array<any> | null
  brandColor?: string
  // Prefill data for save quote
  defaultFirstName?: string | null
  defaultLastName?: string | null
  defaultEmail?: string | null
  submissionId?: string | null
  productsForEmail?: ProductSummary[]
}

function normalizeIncludedItem(entry: any) {
  if (!entry) return null
  const base = typeof entry === 'string' ? { title: entry } : (entry.items ?? entry)
  const image = base?.image || base?.icon || base?.img || base?.image_url || base?.url
  const title = base?.title || base?.name || base?.label || (typeof base === 'string' ? base : undefined) || 'Included'
  const subtitle = base?.subtitle || base?.sub_title || base?.description || base?.text || ''
  return { image, title, subtitle }
}

export default function ProductHeaderTile(props: ProductHeaderTileProps) {
  const {
    count,
    postcode,
    filterBedroom,
    filterBathroom,
    filterBoilerType,
    setFilterBedroom,
    setFilterBathroom,
    setFilterBoilerType,
    clearFilters,
    resetFiltersToSubmission,
    includedItems,
    brandColor = '#2563eb',
    defaultFirstName = null,
    defaultLastName = null,
    defaultEmail = null,
    submissionId = null,
    productsForEmail = [],
  } = props

  const [showEditor, setShowEditor] = useState(false)
  const [showIncluded, setShowIncluded] = useState(false)
  const [showSaveQuote, setShowSaveQuote] = useState(false)

  const bedroomLabel = useMemo(() => (
    filterBedroom ? `${filterBedroom} bedroom${filterBedroom === '1' ? '' : 's'}` : 'All bedrooms'
  ), [filterBedroom])

  const bathroomLabel = useMemo(() => (
    filterBathroom ? `${filterBathroom} bathroom${filterBathroom === '1' ? '' : 's'}` : 'All bathrooms'
  ), [filterBathroom])

  return (
    <div className="">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{count} available installation packages</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-sm text-gray-600">Suitable for</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {bedroomLabel}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {bathroomLabel}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                in {postcode || 'your area'}
                <button
                  aria-label="Edit filters"
                  onClick={() => setShowEditor((v) => !v)}
                  className="ml-2 p-1 rounded-full hover:bg-gray-200 text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowIncluded(true)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full"
            >
              <span>What's included?</span>
            </button>
            <button
              onClick={() => setShowSaveQuote(true)}
              className="text-sm text-white flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: brandColor }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Save for later</span>
            </button>
          </div>
        </div>
      </div>

      {showEditor && (
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-xl border p-4 flex flex-col gap-4 relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Boiler type:</span>
              {['combi', 'regular', 'system'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterBoilerType(filterBoilerType === type ? null : type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    filterBoilerType === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Bedrooms:</span>
              {['1', '2', '3', '4', '5', '6+'].map((b) => (
                <button
                  key={b}
                  onClick={() => setFilterBedroom(filterBedroom === b ? null : b)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    filterBedroom === b
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Bathrooms:</span>
              {['1', '2', '3', '4+'].map((b) => (
                <button
                  key={b}
                  onClick={() => setFilterBathroom(filterBathroom === b ? null : b)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    filterBathroom === b
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-4">
              {resetFiltersToSubmission && (
                <button
                  onClick={resetFiltersToSubmission}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Reset to submission
                </button>
              )}
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Clear filters
              </button>
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-white rounded-md hover:opacity-90"
                style={{ backgroundColor: brandColor }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showIncluded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">What's included</h2>
              <button onClick={() => setShowIncluded(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {Array.isArray(includedItems) && includedItems.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {includedItems.map((entry: any, idx: number) => {
                    const normalized = normalizeIncludedItem(entry)
                    if (!normalized) return (
                      <div key={idx} className="p-3 bg-white rounded border text-sm text-gray-900">Invalid item</div>
                    )
                    const { image, title, subtitle } = normalized
                    return (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded border">
                        {image && (
                          <img src={image} alt={title} className="h-12 w-12 rounded object-cover border" />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{title}</div>
                          {subtitle && <div className="text-gray-600 text-sm">{subtitle}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No included items provided.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {showSaveQuote && (
        <SaveQuoteDialog
          open={showSaveQuote}
          onClose={() => setShowSaveQuote(false)}
          defaultFirstName={defaultFirstName}
          defaultLastName={defaultLastName}
          defaultEmail={defaultEmail}
          submissionId={submissionId}
          postcode={postcode || null}
          products={productsForEmail}
          brandColor={brandColor}
        />
      )}
    </div>
  )
}


