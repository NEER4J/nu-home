'use client'

import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import { useState } from 'react'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/pagination'
import './ReviewSection.module.css'

interface Review {
  id: string
  name: string
  rating: number
  text: string
}

interface ReviewSectionProps {
  title: string
  subtitle?: string
  reviews: Review[]
  buttonText?: string
  buttonUrl?: string
  buttonDescription?: string
  brandColor?: string
}

const ReviewSection = ({ 
  title, 
  subtitle, 
  reviews, 
  buttonText, 
  buttonUrl, 
  buttonDescription,
  brandColor = '#3B82F6' 
}: ReviewSectionProps) => {
  if (!reviews || reviews.length === 0) {
    return null
  }

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
  }

  const handleButtonClick = () => {
    if (buttonUrl) {
      window.open(buttonUrl, '_blank', 'noopener,noreferrer')
    }
  }


  return (

    <div 
      className="mx-auto md:px-6 px-6 py-10 md:py-20"
      style={{ backgroundColor: brandColor }}
    >

    <div className="w-full max-w-[1460px] mx-auto">
      <div className="mb-8">
        <h2 className="md:text-4xl text-2xl font-bold text-white mb-2">{title}</h2>
        {subtitle && (
          <p className="text-lg text-white">{subtitle}</p>
        )}
      </div>

       <div className="relative">
         {/* Swiper Carousel */}
         <Swiper
           modules={[Autoplay, Pagination]}
           spaceBetween={24}
           slidesPerView={1}
           breakpoints={{
             640: {
               slidesPerView: 2,
               spaceBetween: 20,
             },
             1024: {
               slidesPerView: 4.5,
               spaceBetween: 24,
             },
           }}
           autoplay={{
             delay: 5000,
             disableOnInteraction: false,
             pauseOnMouseEnter: true,
             stopOnLastSlide: false,
           }}
           loop={reviews.length > 3}
           pagination={{
             clickable: true,
             dynamicBullets: true,
           }}
           grabCursor={true}
           touchRatio={1}
           touchAngle={45}
           resistanceRatio={0.85}
           speed={600}
           className="!pb-12"
         >
           {reviews.map((review) => {
             const isLongText = review.text.length > 150
             const displayText = isLongText ? truncateText(review.text) : review.text
             
             return (
               <SwiperSlide key={review.id}>
                 <div className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow flex flex-col" style={{ height: '374px' }}>
                   <div className="flex items-center gap-2 mb-3">
                     <div className="flex">
                       {renderStars(review.rating)}
                     </div>
                   </div>
                   
                   <div className="flex-grow flex flex-col">
                     <p className="text-gray-700 mb-4 text-lg" style={{ fontFamily: 'cursive', lineHeight: '1.3' }}>
                       "{displayText}"
                     </p>
                     
                     {isLongText && (
                       <Dialog>
                         <DialogTrigger asChild>
                           <button className="text-blue-600 hover:text-blue-800 text-sm font-medium self-start mb-4 read-more-btn">
                             Read more
                           </button>
                         </DialogTrigger>
                         <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                           <DialogHeader>
                             <DialogTitle>Customer Review</DialogTitle>
                           </DialogHeader>
                           <div className="space-y-4">
                             {/* Stars */}
                             <div className="flex items-center gap-2">
                               <div className="flex">
                                 {renderStars(review.rating)}
                               </div>
                               <span className="text-sm text-gray-500">{review.rating}/5</span>
                             </div>
                             
                             {/* Review Text */}
                             <div className="bg-gray-50 rounded-lg p-4">
                               <p className="text-gray-700 text-lg leading-relaxed" style={{ fontFamily: 'cursive' }}>
                                 "{review.text}"
                               </p>
                             </div>
                             
                             {/* Reviewer Name */}
                             <div className="text-right">
                               <p className="font-semibold text-gray-900">— {review.name}</p>
                             </div>
                           </div>
                         </DialogContent>
                       </Dialog>
                     )}
                   </div>
                   
                   <div className="flex items-center justify-between mt-auto">
                     <p className="font-semibold text-gray-900">{review.name}</p>
                   </div>
                 </div>
               </SwiperSlide>
             )
           })}
         </Swiper>
       </div>

      {/* Button Section */}
      {buttonText && (
        <div className="text-center">
          {buttonDescription && (
            <p className="text-white mb-4">{buttonDescription}</p>
          )}
          <Button
            onClick={handleButtonClick}
            className="px-8 py-3 text-lg font-semibold rounded-full bg-white text-gray-900 border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            {buttonText}
          </Button>
        </div>
      )}
    </div>

    </div>
  )
}

export default ReviewSection
