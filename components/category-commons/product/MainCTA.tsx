'use client'

import { Button } from '@/components/ui/button'

interface MainCTAProps {
  title: string
  subtitle?: string
  buttonText: string
  buttonUrl?: string
  backgroundColor?: string
  textColor?: string
  brandColor?: string
}

const MainCTA = ({ 
  title, 
  subtitle, 
  buttonText, 
  buttonUrl, 
  backgroundColor, 
  textColor = '#FFFFFF',
  brandColor = '#3B82F6'
}: MainCTAProps) => {
  const handleClick = () => {
    if (buttonUrl) {
      window.open(buttonUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div 
      className="w-full rounded-2xl p-8 my-8 text-center"
      style={{ 
        backgroundColor: backgroundColor || brandColor,
        color: textColor
      }}
    >
      <h2 className="text-3xl font-bold mb-4">{title}</h2>
      {subtitle && (
        <p className="text-lg mb-6 opacity-90">{subtitle}</p>
      )}
      
      <Button
        onClick={handleClick}
        className="px-8 py-3 text-lg font-semibold rounded-lg hover:opacity-90 transition-opacity"
        style={{ 
          backgroundColor: textColor,
          color: backgroundColor || brandColor,
          border: `2px solid ${textColor}`
        }}
      >
        {buttonText}
      </Button>
    </div>
  )
}

export default MainCTA
