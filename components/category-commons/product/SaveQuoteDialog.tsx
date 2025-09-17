'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2 } from 'lucide-react'

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
  defaultPhone?: string | null
  submissionId?: string | null
  postcode?: string | null
  products: ProductSummary[]
  brandColor?: string
  saveType?: 'all_products' | 'single_product'
  detailedProductData?: any
  detailedAllProductsData?: any[]
}

export default function SaveQuoteDialog({
  open,
  onClose,
  defaultFirstName,
  defaultLastName,
  defaultEmail,
  defaultPhone,
  submissionId,
  postcode,
  products,
  brandColor = '#2563eb',
  saveType = 'all_products',
  detailedProductData,
  detailedAllProductsData,
}: SaveQuoteDialogProps) {
  const [firstName, setFirstName] = useState<string>(defaultFirstName || '')
  const [lastName, setLastName] = useState<string>(defaultLastName || '')
  const [email, setEmail] = useState<string>(defaultEmail || '')
  const [phone, setPhone] = useState<string>(defaultPhone || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)


    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const subdomain = hostname || null

      // Detect if running in iframe
      const isIframe = window.self !== window.top;

      const res = await fetch('/api/email/boiler/save-quote-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          submissionId,
          postcode,
          products,
          subdomain,
          is_iframe: isIframe,
          saveType,
          detailedProductData,
          detailedAllProductsData,
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg flex flex-col" variant="sidebar">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Save your quote</DialogTitle>
          <DialogDescription>
            Enter your details to receive your quote via email
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4 bg-white rounded-full p-1 w-[6%] h-[6%] md:w-[6%] md:h-[6%]" />
                {success}
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-4 pt-4">
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: brandColor }}
                className="hover:opacity-90 w-full"
              >
                {loading ? 'Saving...' : 'Save quote'}
              </Button>
            </div>
            <div className="text-xs text-gray-500 text-left leading-relaxed">
              We'll use your data to send a copy of your quote(s) to your email, and sometimes follow up with other information, such as available discounts.
              <br />
              <br />
              By entering your details and submitting, you agree to our privacy policy.
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}



