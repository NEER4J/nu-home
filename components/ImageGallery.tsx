'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageGalleryProps {
  images: Array<{ image: string } | string>
  productName: string
  className?: string
}

export default function ImageGallery({ images, productName, className = '' }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) return null

  const normalizedImages = images.map(img => 
    typeof img === 'string' ? { image: img } : img
  )

  const goToPrevious = () => {
    setCurrentIndex(prev => 
      prev === 0 ? normalizedImages.length - 1 : prev - 1
    )
  }

  const goToNext = () => {
    setCurrentIndex(prev => 
      prev === normalizedImages.length - 1 ? 0 : prev + 1
    )
  }

  const goToImage = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Image Display */}
      <div className="relative h-72 bg-gray-100 rounded-lg overflow-hidden p-5 w-full">
        <img
          src={normalizedImages[currentIndex].image}
          alt={`${productName} - Image ${currentIndex + 1}`}
          className="w-full h-full object-contain"
        />
        
        {/* Navigation Buttons */}
        {normalizedImages.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all hover:scale-110"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all hover:scale-110"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
        
        {/* Image Counter */}
        {normalizedImages.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {currentIndex + 1} / {normalizedImages.length}
          </div>
        )}
      </div>

      
    </div>
  )
}
