'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { useDynamicStyles } from '@/hooks/use-dynamic-styles'

type BundleDiscountType = 'fixed' | 'percent'

export interface AddonLite {
  addon_id: string
  title: string
  description: string
  price: number
  image_link: string | null
  allow_multiple: boolean
  max_count: number | null
  addon_type_id: string
}

export interface BundleAddonItemLite {
  bundle_addon_id: string
  bundle_id: string
  addon_id: string
  quantity: number
  Addons?: AddonLite
}

export interface BundleLite {
  bundle_id: string
  partner_id: string
  title: string
  description: string | null
  discount_type: BundleDiscountType
  discount_value: number
  service_category_id: string | null
  BundlesAddons?: BundleAddonItemLite[]
}

export interface SelectedProductLite {
  partner_product_id: string
  partner_id: string
  name: string
  price: number | null
  image_url: string | null
}

export interface SelectedAddonItem extends AddonLite { quantity: number }
export interface SelectedBundleItem { bundle: BundleLite; quantity: number; unitPrice: number }

export interface CustomerDetails {
  title: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address1: string
  address2: string
  city: string
  county: string
  postcode: string
  notes: string
}

export interface CheckoutLayoutProps {
  selectedProduct: SelectedProductLite | null
  selectedAddons: SelectedAddonItem[]
  selectedBundles: SelectedBundleItem[]
  companyColor?: string | null
  onSubmitBooking: (details: CustomerDetails & { date: string }) => void
}

function getImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return url
  return `/${url}`
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }

export default function CheckoutLayout({
  selectedProduct,
  selectedAddons,
  selectedBundles,
  companyColor = null,
  onSubmitBooking,
}: CheckoutLayoutProps) {
  const classes = useDynamicStyles(companyColor)
  const [step, setStep] = useState<1 | 2>(1)
  const [cursor, setCursor] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [details, setDetails] = useState<CustomerDetails>({
    title: '', firstName: '', lastName: '', email: '', phone: '',
    address1: '', address2: '', city: '', county: '', postcode: '', notes: ''
  })

  const basePrice = useMemo(() => (typeof selectedProduct?.price === 'number' ? selectedProduct.price : 0), [selectedProduct?.price])
  const addonsTotal = useMemo(() => selectedAddons.reduce((s, a) => s + a.price * a.quantity, 0), [selectedAddons])
  const bundlesTotal = useMemo(() => selectedBundles.reduce((s, b) => s + b.quantity * b.unitPrice, 0), [selectedBundles])
  const orderTotal = useMemo(() => Math.max(0, basePrice + addonsTotal + bundlesTotal), [basePrice, addonsTotal, bundlesTotal])

  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor)
    const end = endOfMonth(cursor)
    const days: Date[] = []
    for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      days.push(d)
    }
    return days
  }, [cursor])

  const handleBookInstall = () => {
    if (!selectedDate) return
    setStep(2)
  }

  const handlePay = () => {
    if (!selectedDate) { setStep(1); return }
    onSubmitBooking({ ...details, date: selectedDate })
  }

  return (
    <div className="container mx-auto px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{step === 1 ? 'Book your install' : 'Complete your order'}</h1>
        {/* Stepper */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step >= 1 ? 'bg-gray-900' : 'bg-gray-300'}`}>1</div>
          <div className={`h-1 flex-1 ${step > 1 ? classes.progress : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step >= 2 ? 'bg-gray-900' : 'bg-gray-300'}`}>2</div>
        </div>

        {step === 1 && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium">{cursor.toLocaleString('default', { month: 'long' })} {cursor.getFullYear()}</div>
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-md border flex items-center justify-center" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></button>
                  <button className="w-8 h-8 rounded-md border flex items-center justify-center" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-xs text-gray-500 mt-3">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="py-2">{d}</div>)}
              </div>
              {/* days */}
              <div className="grid grid-cols-7 gap-2 mt-2">
                {(() => {
                  const firstWeekday = (startOfMonth(cursor).getDay() + 6) % 7 // make Monday=0
                  const blanks = Array.from({ length: firstWeekday })
                  const cells: ReactNode[] = []
                  blanks.forEach((_, i) => cells.push(<div key={`b-${i}`} />))
                  monthDays.forEach(d => {
                    const key = d.toISOString().slice(0,10)
                    const selected = selectedDate === key
                    const disabled = d < new Date(new Date().toDateString())
                    cells.push(
                      <button key={key} disabled={disabled} onClick={() => setSelectedDate(key)} className={`h-12 rounded-lg border text-sm ${selected ? `${classes.button} ${classes.buttonText}` : 'bg-gray-50'} disabled:opacity-50`}>{d.getDate()}</button>
                    )
                  })
                  return cells
                })()}
              </div>
              <div className="mt-4 text-sm text-gray-600 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5" />
                <div>Your installation should take 1-2 days to complete, and our installers will be on site between 8-10am.</div>
              </div>
            </div>

            {/* Details form */}
            <div className="bg-white rounded-xl border p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Title *</label>
                  <select value={details.title} onChange={e => setDetails({ ...details, title: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`}>
                    <option value="">Select an option...</option>
                    {['Mr','Mrs','Ms','Miss','Dr','Prof'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">First name *</label>
                  <input value={details.firstName} onChange={e => setDetails({ ...details, firstName: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} placeholder="e.g. Sam" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Last name *</label>
                  <input value={details.lastName} onChange={e => setDetails({ ...details, lastName: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} placeholder="e.g. Doe" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Email address *</label>
                  <input type="email" value={details.email} onChange={e => setDetails({ ...details, email: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} placeholder="e.g. sam.doe@example.com" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Contact number *</label>
                  <input value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} placeholder="e.g. 07234 123456" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Address line 1 *</label>
                  <input value={details.address1} onChange={e => setDetails({ ...details, address1: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Address line 2</label>
                  <input value={details.address2} onChange={e => setDetails({ ...details, address2: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Town / City *</label>
                  <input value={details.city} onChange={e => setDetails({ ...details, city: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">County</label>
                  <input value={details.county} onChange={e => setDetails({ ...details, county: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Postcode *</label>
                  <input value={details.postcode} onChange={e => setDetails({ ...details, postcode: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Notes, or comments</label>
                  <textarea value={details.notes} onChange={e => setDetails({ ...details, notes: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} rows={3} placeholder="e.g. My property has..." />
                </div>
                <div className="col-span-2">
                  <button onClick={handleBookInstall} disabled={!selectedDate || !details.firstName || !details.lastName || !details.email || !details.phone || !details.address1 || !details.city || !details.postcode}
                    className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText} disabled:opacity-50`}>
                    Book install
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">By submitting your details, you agree to our privacy policy.</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Pay by card, or spread the cost</h2>
            <div className="bg-white rounded-xl border p-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-700 mb-1">Card number</label>
                      <input className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} placeholder="Card number" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Expiry date</label>
                      <input className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} placeholder="MM/YY" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Security code</label>
                      <input className={`w-full border rounded-md px-3 py-2 ${classes.inputFocus}`} placeholder="CVV" />
                    </div>
                    <div className="col-span-2">
                      <button onClick={handlePay} className={`w-full py-3 rounded-lg font-medium ${classes.button} ${classes.buttonText}`}>Pay £{orderTotal.toFixed(2)}</button>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <button className="w-full border rounded-md py-2">Finance</button>
                  <button className="w-full border rounded-md py-2">Monthly payment (Klarna)</button>
                </div>
              </div>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-gray-600">Back to booking</button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border p-5 h-max">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Fixed price (inc. VAT)</div>
          <div className="text-2xl font-semibold">£{orderTotal.toFixed(2)}</div>
        </div>
        <div className="mt-4">
          {selectedProduct && (
            <div className="flex items-center gap-3 py-3 border-b">
              <div className="relative h-12 w-12 bg-gray-50 rounded-md overflow-hidden">
                <Image src={getImageUrl(selectedProduct.image_url) || '/placeholder-image.jpg'} alt={selectedProduct.name} fill className="object-contain" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{selectedProduct.name}</div>
                <div className="text-xs text-gray-500">{typeof selectedProduct.price === 'number' ? `£${selectedProduct.price.toFixed(2)}` : 'Contact for price'}</div>
              </div>
            </div>
          )}
          {selectedBundles.map(({ bundle, quantity, unitPrice }) => (
            <div key={bundle.bundle_id} className="py-3 border-b">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900 truncate">{bundle.title}</div>
                <div className="text-sm text-gray-700">{quantity} × £{unitPrice.toFixed(2)}</div>
              </div>
              <div className="mt-2 space-y-1">
                {(bundle.BundlesAddons || []).map(i => (
                  <div key={i.bundle_addon_id} className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{i.Addons?.title || 'Addon'}</span>
                    {i.quantity > 1 ? <span>×{i.quantity}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {selectedAddons.map(a => (
            <div key={a.addon_id} className="py-3 border-b flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{a.title}</div>
                <div className="text-xs text-gray-500 truncate">{a.quantity} × £{a.price.toFixed(2)}</div>
              </div>
              <div className="text-sm">£{(a.quantity * a.price).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


