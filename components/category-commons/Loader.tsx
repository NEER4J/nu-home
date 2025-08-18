'use client'

import { Loader2 } from 'lucide-react'

interface LoaderProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const defaultMessages = {
  products: 'Loading products...',
  addons: 'Loading add-ons...',
  checkout: 'Preparing checkout...',
  quote: 'Generating your quote...',
  profile: 'Loading profile...',
  settings: 'Loading settings...',
  default: 'Loading...'
}

export default function Loader({ 
  message, 
  size = 'md', 
  className = '' 
}: LoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 h-[calc(100vh-200px)] ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-gray-600 mb-3`} />
      <p className="text-gray-600 text-sm">{message || defaultMessages.default}</p>
    </div>
  )
}

// Page-specific loader components
export function ProductsLoader() {
  return <Loader message={defaultMessages.products} />
}

export function AddonsLoader() {
  return <Loader message={defaultMessages.addons} />
}

export function CheckoutLoader() {
  return <Loader message={defaultMessages.checkout} />
}

export function QuoteLoader() {
  return <Loader message={defaultMessages.quote} />
}

export function ProfileLoader() {
  return <Loader message={defaultMessages.profile} />
}

export function SettingsLoader() {
  return <Loader message={defaultMessages.settings} />
}

// Container loader for full-page loading
export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader message={message} size="lg" />
    </div>
  )
}

// Inline loader for small sections
export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader message={message} size="sm" />
    </div>
  )
}
