'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface AddonTypeInfoPopupProps {
  isOpen: boolean
  onClose: () => void
  addonType: {
    name: string
    info?: string
  } | null
  bundleItems?: any[] | null
  bundlePricing?: {
    subtotal: number
    discount: number
    unitPrice: number
  } | null
}

export default function AddonTypeInfoPopup({ isOpen, onClose, addonType, bundleItems, bundlePricing }: AddonTypeInfoPopupProps) {
  if (!addonType) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent variant="center" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>About {addonType.name}</DialogTitle>
        </DialogHeader>
        
        {addonType.info ? (
          <DialogDescription className="text-left">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {addonType.info}
              </p>
            </div>
          </DialogDescription>
        ) : null}
        
        {/* Bundle Items Section */}
        {bundleItems && bundleItems.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Bundle Contents</h4>
            <div className="space-y-3">
              {bundleItems.map((item) => (
                <div key={item.bundle_addon_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                    {item.Addons?.image_link ? (
                      <img 
                        src={item.Addons.image_link} 
                        alt={item.Addons.title || 'Addon'} 
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <div className="text-gray-400 text-xs">No image</div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h5 className="font-medium text-sm text-gray-900 truncate">
                      {item.Addons?.title || 'Addon'}
                    </h5>
                    <p className="text-xs text-gray-500">
                      Quantity: {item.quantity}
                      {item.Addons?.price && (
                        <span className="ml-2">• £{item.Addons.price.toFixed(2)} each</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Bundle Pricing Summary */}
            {bundlePricing && (
              <div className="mt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">£{bundlePricing.subtotal.toFixed(2)}</span>
                </div>
                {bundlePricing.discount > 0 && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-green-600">-£{bundlePricing.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-base font-semibold mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Bundle Price:</span>
                  <span className="text-gray-600">£{bundlePricing.unitPrice.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Fallback UI for no info */}
        {!addonType.info && !bundleItems && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500">
              No information available for this {bundleItems ? 'bundle' : 'addon type'}.
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Contact your administrator to add information.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
