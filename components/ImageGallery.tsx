'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface ImageGalleryProps {
  images: Array<{ image: string } | string>
  productName: string
  className?: string
}

export default function ImageGallery({ images, productName, className = '' }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0])) // First image is considered loaded

  if (!images || images.length === 0) return null

  const normalizedImages = images.map(img => 
    typeof img === 'string' ? { image: img } : img
  )

  // Preload images
  useEffect(() => {
    const preloadImage = (src: string, index: number) => {
      const img = new Image()
      img.onload = () => {
        setLoadedImages(prev => new Set(Array.from(prev).concat(index)))
      }
      img.onerror = () => {
        console.warn(`Failed to load image ${index}:`, src)
      }
      img.src = src
    }

    // Preload all images
    normalizedImages.forEach((img, index) => {
      if (!loadedImages.has(index)) {
        preloadImage(img.image, index)
      }
    })
  }, [normalizedImages, loadedImages])

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? normalizedImages.length - 1 : currentIndex - 1
    if (!loadedImages.has(newIndex)) {
      setIsLoading(true)
    }
    setCurrentIndex(newIndex)
  }

  const goToNext = () => {
    const newIndex = currentIndex === normalizedImages.length - 1 ? 0 : currentIndex + 1
    if (!loadedImages.has(newIndex)) {
      setIsLoading(true)
    }
    setCurrentIndex(newIndex)
  }

  const goToImage = (index: number) => {
    if (!loadedImages.has(index)) {
      setIsLoading(true)
    }
    setCurrentIndex(index)
  }

  // Handle loading state when image changes
  useEffect(() => {
    if (loadedImages.has(currentIndex)) {
      setIsLoading(false)
    }
  }, [currentIndex, loadedImages])

  return (
    <div className={`relative ${className}`}>
      {/* Main Image Display */}
      <div className="relative h-72 bg-gray-100 rounded-lg overflow-hidden p-5 w-full">
        <img
          src={normalizedImages[currentIndex].image}
          alt={`${productName} - Image ${currentIndex + 1}`}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            isLoading ? 'opacity-50' : 'opacity-100'
          }`}
        />
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
              <span className="text-sm text-gray-600">Loading image...</span>
            </div>
          </div>
        )}
        
        {/* Navigation Buttons */}
        {normalizedImages.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              disabled={isLoading}
              className={`absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full shadow-lg transition-all ${
                isLoading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-white/80 hover:bg-white text-gray-800 hover:scale-110'
              }`}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={goToNext}
              disabled={isLoading}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full shadow-lg transition-all ${
                isLoading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-white/80 hover:bg-white text-gray-800 hover:scale-110'
              }`}
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
