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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { FilterIcon, RotateCcw, ChevronDown } from "lucide-react"

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

  const [showIncluded, setShowIncluded] = useState(false)
  const [showSaveQuote, setShowSaveQuote] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const bedroomLabel = useMemo(() => {
    const fullLabel = filterBedroom ? `${filterBedroom} bedroom${filterBedroom === '1' ? '' : 's'}` : 'All bedrooms'
    const shortLabel = filterBedroom ? `${filterBedroom} bed` : 'All'
    return { full: fullLabel, short: shortLabel }
  }, [filterBedroom])

  const bathroomLabel = useMemo(() => {
    const fullLabel = filterBathroom ? `${filterBathroom} bathroom${filterBathroom === '1' ? '' : 's'}` : 'All bathrooms'
    const shortLabel = filterBathroom ? `${filterBathroom} bath` : 'All'
    return { full: fullLabel, short: shortLabel }
  }, [filterBathroom])

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
    <div className="max-w-[1500px] mx-auto md:px-6 px-4 py-6 ">
              <h2 className="md:text-3xl text-2xl font-semibold text-gray-900 md:mb-7 mb-4">{count} available installation packages</h2>

      <div className="flex gap-4 justify-between flex-wrap">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full md:w-auto">

          <div className='flex gap-2 items-center w-full'>
            <div className="flex items-center gap-2 bg-white rounded-full p-1 border border-gray-100 w-full">
              <Badge variant="secondary" className="inline-flex items-center justify-center px-3 py-2 bg-gray-200 text-gray-600 w-full text-center text-sm">
                <span className="hidden sm:inline text-nowrap">{bedroomLabel.full}</span>
                <span className="sm:hidden">{bedroomLabel.short}</span>
              </Badge>
              <Badge variant="secondary" className="inline-flex items-center justify-center px-3 py-2 bg-gray-200 text-gray-600 w-full text-center text-sm">
                <span className="hidden sm:inline text-nowrap">{bathroomLabel.full}</span>
                <span className="sm:hidden">{bathroomLabel.short}</span>
              </Badge>
              <Badge variant="secondary" className="inline-flex items-center justify-center px-3 py-2 bg-gray-200 text-gray-600 w-full text-center text-sm">
                <span className="hidden sm:inline text-nowrap">in {postcode || 'your area'}</span>
                <span className="sm:hidden">in {postcode ? postcode.substring(0, 4) : 'area'}</span>
              </Badge>
              
              <DropdownMenu onOpenChange={setIsFilterOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Edit filters"
                    variant="ghost"
                    size="sm"
                    className="px-2 w-8 md:h-8 h-6"
                  >
                    {isFilterOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <FilterIcon className="w-4 h-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-[calc(100vw-2rem)] md:w-96 p-4 bg-white border border-gray-200 rounded-lg shadow-lg max-w-[320px] md:max-w-none"
                  sideOffset={8}
                  side="bottom"
                  align="start"
                >
                  <div className="space-y-4">
                    {/* Boiler Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Boiler type:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['combi', 'regular', 'system'].map((type) => (
                          <Button
                            key={type}
                            onClick={() => setFilterBoilerType(filterBoilerType === type ? null : type)}
                            variant={filterBoilerType === type ? "default" : "outline"}
                            size="sm"
                            className="px-2 py-1 rounded-full text-xs font-medium"
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Bedrooms */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Bedrooms:</label>
                      <div className="grid grid-cols-6 gap-2">
                        {['1', '2', '3', '4', '5', '6+'].map((b) => (
                          <Button
                            key={b}
                            onClick={() => setFilterBedroom(filterBedroom === b ? null : b)}
                            variant={filterBedroom === b ? "default" : "outline"}
                            size="sm"
                            className="px-2 py-1 rounded-full text-xs font-medium"
                          >
                            {b}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Bathrooms */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Bathrooms:</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['1', '2', '3', '4+'].map((b) => (
                          <Button
                            key={b}
                            onClick={() => setFilterBathroom(filterBathroom === b ? null : b)}
                            variant={filterBathroom === b ? "default" : "outline"}
                            size="sm"
                            className="px-2 py-1 rounded-full text-xs font-medium"
                          >
                            {b}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                      {resetFiltersToSubmission && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={resetFiltersToSubmission}
                          className="text-xs"
                        >
                          Reset to submission
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={clearFilters}
                        className="text-xs"
                      >
                        Clear filters
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
             
            </div>
            {onRestart && (
              <Button variant="outline" className='border-none bg-gray-200 rounded-full p-3 hover:bg-gray-300' onClick={handleRestart}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>

          
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={() => setShowIncluded(true)} className='bg-gray-200 text-gray-900 rounded-full'>
              What's included?
            </Button>
           
            <Button onClick={() => setShowSaveQuote(true)} style={{ backgroundColor: brandColor }} className='w-full'>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Save for later
            </Button>
          </div>
      </div>

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


