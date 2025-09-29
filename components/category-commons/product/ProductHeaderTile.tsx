'use client'

import { useMemo, useState, useEffect } from 'react'
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
import { FilterIcon, RotateCcw, ChevronDown, CheckIcon, CheckCircle, CheckCircle2 } from "lucide-react"

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
  nonIncludedItems?: Array<any> | null
  brandColor?: string
  // Prefill data for save quote
  defaultFirstName?: string | null
  defaultLastName?: string | null
  defaultEmail?: string | null
  defaultPhone?: string | null
  submissionId?: string | null
  productsForEmail?: ProductSummary[]
  onRestart?: () => void
  onSaveQuoteOpen?: () => void
  // Layout controls
  isHorizontalLayout?: boolean
  onLayoutChange?: (isHorizontal: boolean) => void
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
    nonIncludedItems,
    brandColor = '#2563eb',
    defaultFirstName = null,
    defaultLastName = null,
    defaultEmail = null,
    defaultPhone = null,
    submissionId = null,
    productsForEmail = [],
    onRestart,
    onSaveQuoteOpen,
    isHorizontalLayout = true,
    onLayoutChange,
  } = props

  const [showIncluded, setShowIncluded] = useState(false)
  const [showSaveQuote, setShowSaveQuote] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [singleProductForSave, setSingleProductForSave] = useState<ProductSummary[]>([])
  const [saveType, setSaveType] = useState<'all_products' | 'single_product'>('all_products')
  const [detailedProductData, setDetailedProductData] = useState<any>(null)
  const [detailedAllProductsData, setDetailedAllProductsData] = useState<any[]>([])

  // Handle custom event for opening save quote dialog
  useEffect(() => {
    const handleOpenSaveQuoteDialog = (event: CustomEvent) => {
      const { products, saveType: eventSaveType, detailedProductData: eventDetailedData, detailedAllProductsData: eventDetailedAllData } = event.detail
      setSingleProductForSave(products)
      setSaveType(eventSaveType || 'single_product')
      setDetailedProductData(eventDetailedData || null)
      setDetailedAllProductsData(eventDetailedAllData || [])
      setShowSaveQuote(true)
    }

    const handleUpdateSaveQuoteData = (event: CustomEvent) => {
      const { detailedAllProductsData: updatedDetailedAllData } = event.detail
      if (updatedDetailedAllData) {
        setDetailedAllProductsData(updatedDetailedAllData)
      }
    }

    window.addEventListener('openSaveQuoteDialog', handleOpenSaveQuoteDialog as EventListener)
    window.addEventListener('updateSaveQuoteData', handleUpdateSaveQuoteData as EventListener)
    
    return () => {
      window.removeEventListener('openSaveQuoteDialog', handleOpenSaveQuoteDialog as EventListener)
      window.removeEventListener('updateSaveQuoteData', handleUpdateSaveQuoteData as EventListener)
    }
  }, [])

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
              <div className="md:mb-7 mb-4">
                <h1 className="md:text-2xl text-xl font-semibold text-gray-900 mb-2">
                  Thank You for Sharing Your Boiler Needs With Us!
                </h1>
                <p className="md:text-lg text-base text-gray-700">
                  We found <span className="font-semibold text-gray-900">{count}</span> boiler{count !== 1 ? 's' : ''} tailored for you. Find information, customer testimonials, and easy online purchase options all in one place.
                </p>
              </div>

      <div className="flex gap-4 justify-between flex-wrap">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full md:w-auto">

          <div className='flex gap-2 items-center w-full'>
            <div className="flex items-center gap-2 bg-white rounded-full p-1 border border-gray-100 w-full">
              <Badge variant="secondary" className="inline-flex items-center justify-center px-3 py-2 bg-gray-200 text-gray-600 w-full text-center text-sm hover:bg-gray-200 cursor-default">
                <span className="hidden sm:inline text-nowrap">{bedroomLabel.full}</span>
                <span className="sm:hidden">{bedroomLabel.short}</span>
              </Badge>
              <Badge variant="secondary" className="inline-flex items-center justify-center px-3 py-2 bg-gray-200 text-gray-600 w-full text-center text-sm hover:bg-gray-200 cursor-default">
                <span className="hidden sm:inline text-nowrap">{bathroomLabel.full}</span>
                <span className="sm:hidden">{bathroomLabel.short}</span>
              </Badge>
              <Badge variant="secondary" className="inline-flex items-center justify-center px-3 py-2 bg-gray-200 text-gray-600 w-full text-center text-sm hover:bg-gray-200 cursor-default">
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
                            style={filterBoilerType === type ? { backgroundColor: brandColor } : {}}
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
                            style={filterBedroom === b ? { backgroundColor: brandColor } : {}}
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
                            style={filterBathroom === b ? { backgroundColor: brandColor } : {}}
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
            {/* Layout Toggle Controls */}
            {onLayoutChange && (
              <div className="flex rounded-lg border border-gray-200 bg-white shadow-sm hidden md:flex">
                <button
                  onClick={() => onLayoutChange(false)}
                  className={`px-3 py-2 text-sm font-medium transition-colors border-r border-gray-200 rounded-l-lg ${
                    !isHorizontalLayout 
                      ? 'text-white' 
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                  style={!isHorizontalLayout ? { backgroundColor: brandColor } : {}}
                  title="Grid view"
                >
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
                  </svg>
                </button>
                <button
                  onClick={() => onLayoutChange(true)}
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-r-lg ${
                    isHorizontalLayout 
                      ? 'text-white' 
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                  style={isHorizontalLayout ? { backgroundColor: brandColor } : {}}
                  title="List view"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                  </svg>
                </button>
              </div>
            )}
            
            <Button variant="outline" onClick={() => setShowIncluded(true)} className='bg-gray-200 text-gray-900 rounded-full'>
              Service Details
            </Button>
           
            <Button onClick={() => {
              if (onSaveQuoteOpen) {
                onSaveQuoteOpen();
              }
            }} style={{ backgroundColor: brandColor }} className='w-full'>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Save for later
            </Button>
          </div>
      </div>

      {showIncluded && (
        <Dialog open={showIncluded} onOpenChange={setShowIncluded}>
          <DialogContent className="max-w-2xl overflow-y-auto" variant="sidebar">
            <DialogHeader>
              <DialogTitle>Service Details</DialogTitle>
              <DialogDescription>The prices you see on screen are fixed, include VAT and won't change.</DialogDescription>
            </DialogHeader>
            <CardContent className="space-y-6">
              {/* What's Included Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <h3 className="text-lg font-medium text-gray-900">What's Included</h3>
                </div>
                {Array.isArray(includedItems) && includedItems.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {includedItems?.map((entry: any, idx: number) => {
                      const normalized = normalizeIncludedItem(entry)
                      if (!normalized) return (
                        <div key={idx} className="p-3 bg-white rounded border text-sm text-gray-900">Invalid item</div>
                      )
                      const { image, title, subtitle } = normalized
                      return (
                        <div key={idx} className="flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div className="text-gray-700 md:text-base text-sm">{title}</div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No included items provided.</p>
                )}
              </div>

              {/* What's Not Included Section */}
              {Array.isArray(nonIncludedItems) && nonIncludedItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <h3 className="text-lg font-medium text-gray-900">What's Not Included</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    {nonIncludedItems?.map((entry: any, idx: number) => {
                      const normalized = normalizeIncludedItem(entry)
                      if (!normalized) return (
                        <div key={idx} className="p-3 bg-white rounded border text-sm text-gray-900">Invalid item</div>
                      )
                      const { image, title, subtitle } = normalized
                      return (
                        <div key={idx} className="flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg">
                          <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <div className="text-gray-700 md:text-base text-sm">{title}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </DialogContent>
        </Dialog>
      )}
      {showSaveQuote && (
        <SaveQuoteDialog
          open={showSaveQuote}
          onClose={() => {
            setShowSaveQuote(false)
            setSingleProductForSave([])
            setSaveType('all_products')
            setDetailedProductData(null)
            setDetailedAllProductsData([])
          }}
          defaultFirstName={defaultFirstName}
          defaultLastName={defaultLastName}
          defaultEmail={defaultEmail}
          defaultPhone={defaultPhone}
          submissionId={submissionId}
          postcode={postcode || null}
          products={saveType === 'single_product' ? singleProductForSave : productsForEmail}
          brandColor={brandColor}
          saveType={saveType}
          detailedProductData={detailedProductData}
          detailedAllProductsData={detailedAllProductsData}
        />
      )}

      {/* Restart Confirmation Modal */}
      <Dialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
        <DialogContent>
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
            <Button onClick={confirmRestart} style={{ backgroundColor: brandColor }}>
              Restart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


