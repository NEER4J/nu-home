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
import { Card, CardContent, CardHeader } from "@/components/ui/card"

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const subdomain = hostname || null

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save your quote</DialogTitle>
          <DialogDescription>
            Enter your details to receive your quote via email
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
              {success}
            </div>
          )}
          <DialogFooter className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: brandColor }}
              className="hover:opacity-90"
            >
              {loading ? 'Saving...' : 'Save & Email me'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}



