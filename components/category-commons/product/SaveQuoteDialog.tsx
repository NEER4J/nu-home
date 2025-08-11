'use client'

import { useState } from 'react'

export interface ProductSummary {
  id: string
  name: string
  priceLabel: string
}

interface SaveQuoteDialogProps {
  open: boolean
  onClose: () => void
  defaultFirstName?: string | null
  defaultLastName?: string | null
  defaultEmail?: string | null
  submissionId?: string | null
  postcode?: string | null
  products: ProductSummary[]
  brandColor?: string
}

export default function SaveQuoteDialog({
  open,
  onClose,
  defaultFirstName,
  defaultLastName,
  defaultEmail,
  submissionId,
  postcode,
  products,
  brandColor = '#2563eb',
}: SaveQuoteDialogProps) {
  const [firstName, setFirstName] = useState<string>(defaultFirstName || '')
  const [lastName, setLastName] = useState<string>(defaultLastName || '')
  const [email, setEmail] = useState<string>(defaultEmail || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const fromHost = hostname.split('.')[0]
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
      const fromQuery = urlParams.get('subdomain') || ''
      const computed = fromQuery || (fromHost && fromHost !== 'localhost' && fromHost !== 'www' ? fromHost : '')
      const subdomain = computed || null

      const res = await fetch('/api/email/boiler/save-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          submission_id: submissionId,
          postcode,
          products,
          subdomain,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send email')
      }
      setSuccess('Saved! We sent you an email with your quote details.')
    } catch (err: any) {
      setError(err?.message || 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Save your quote</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {success && <div className="text-sm text-green-600">{success}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white rounded-md disabled:opacity-50"
              style={{ backgroundColor: brandColor }}
            >
              {loading ? 'Saving...' : 'Save & Email me'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}



