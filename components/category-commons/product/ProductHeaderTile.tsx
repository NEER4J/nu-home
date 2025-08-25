'use client'

import { useMemo, useState } from 'react'
import SaveQuoteDialog, { type ProductSummary } from './SaveQuoteDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

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
  onRestart?: () => void
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
    onRestart,
  } = props

  const [showEditor, setShowEditor] = useState(false)
  const [showIncluded, setShowIncluded] = useState(false)
  const [showSaveQuote, setShowSaveQuote] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)

  const bedroomLabel = useMemo(() => (
    filterBedroom ? `${filterBedroom} bedroom${filterBedroom === '1' ? '' : 's'}` : 'All bedrooms'
  ), [filterBedroom])

  const bathroomLabel = useMemo(() => (
    filterBathroom ? `${filterBathroom} bathroom${filterBathroom === '1' ? '' : 's'}` : 'All bathrooms'
  ), [filterBathroom])

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
    <div className="">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{count} available installation packages</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-sm text-gray-600">Suitable for</span>
              <Badge variant="secondary">{bedroomLabel}</Badge>
              <Badge variant="secondary">{bathroomLabel}</Badge>
              <Badge variant="outline" className="inline-flex items-center">
                in {postcode || 'your area'}
                <Button
                  aria-label="Edit filters"
                  onClick={() => setShowEditor((v) => !v)}
                  variant="ghost"
                  size="sm"
                  className="ml-2 p-1 rounded-full hover:bg-gray-200 text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Button>
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowIncluded(true)}>
              What's included?
            </Button>
            {onRestart && (
              <Button variant="outline" onClick={handleRestart}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restart
              </Button>
            )}
            <Button onClick={() => setShowSaveQuote(true)} style={{ backgroundColor: brandColor }}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Save for later
            </Button>
          </div>
        </div>
      </div>

      {showEditor && (
        <div className="max-w-7xl mx-auto px-6">
          <Card className="bg-white rounded-xl border p-4 flex flex-col gap-4 relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Boiler type:</span>
              {['combi', 'regular', 'system'].map((type) => (
                <Button
                  key={type}
                  onClick={() => setFilterBoilerType(filterBoilerType === type ? null : type)}
                  variant={filterBoilerType === type ? "default" : "outline"}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Bedrooms:</span>
              {['1', '2', '3', '4', '5', '6+'].map((b) => (
                <Button
                  key={b}
                  onClick={() => setFilterBedroom(filterBedroom === b ? null : b)}
                  variant={filterBedroom === b ? "default" : "outline"}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                >
                  {b}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Bathrooms:</span>
              {['1', '2', '3', '4+'].map((b) => (
                <Button
                  key={b}
                  onClick={() => setFilterBathroom(filterBathroom === b ? null : b)}
                  variant={filterBathroom === b ? "default" : "outline"}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                >
                  {b}
                </Button>
              ))}
            </div>
            <div className="flex justify-end gap-4">
              {resetFiltersToSubmission && (
                <Button variant="outline" onClick={resetFiltersToSubmission}>
                  Reset to submission
                </Button>
              )}
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
              <Button variant="outline" onClick={handleRestart}>
                Restart
              </Button>
              <Button onClick={() => setShowEditor(false)} style={{ backgroundColor: brandColor }}>
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showIncluded && (
        <Dialog open={showIncluded} onOpenChange={setShowIncluded}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>What's included</DialogTitle>
            </DialogHeader>
            <CardContent className="p-6">
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
            </CardContent>
          </DialogContent>
        </Dialog>
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

      {/* Restart Confirmation Modal */}
      <Dialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">
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
            <Button onClick={confirmRestart} style={{ backgroundColor: brandColor }}>
              Restart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


