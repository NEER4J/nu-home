'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ChargerTypeSelectorProps {
  productId: string
  initialChargerType?: string
  onUpdate?: (chargerType: string) => void
}

export default function ChargerTypeSelector({ 
  productId, 
  initialChargerType = '',
  onUpdate 
}: ChargerTypeSelectorProps) {
  const [chargerType, setChargerType] = useState(initialChargerType)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setChargerType(initialChargerType)
  }, [initialChargerType])

  const handleChange = async (value: string) => {
    setChargerType(value)
    setIsSaving(true)

    try {
      // Get current product fields
      const { data: product, error: fetchError } = await supabase
        .from('PartnerProducts')
        .select('product_fields')
        .eq('partner_product_id', productId)
        .single()

      if (fetchError) {
        console.error('Error fetching product:', fetchError)
        return
      }

      // Update product_fields with charger_type
      const updatedFields = {
        ...(product.product_fields || {}),
        charger_type: value
      }

      const { error: updateError } = await supabase
        .from('PartnerProducts')
        .update({ product_fields: updatedFields })
        .eq('partner_product_id', productId)

      if (updateError) {
        console.error('Error updating charger type:', updateError)
        // Revert on error
        setChargerType(initialChargerType)
      } else {
        // Call onUpdate callback if provided
        if (onUpdate) {
          onUpdate(value)
        }
      }
    } catch (error) {
      console.error('Error saving charger type:', error)
      setChargerType(initialChargerType)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <label htmlFor="charger_type" className="block text-sm font-medium text-gray-700 mb-2">
        Charger Type <span className="text-red-500">*</span>
      </label>
      <select
        id="charger_type"
        name="charger_type"
        value={chargerType}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isSaving}
        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Select Charger Type</option>
        <option value="Tethered Charger">Tethered Charger</option>
        <option value="Untethered Chargers">Untethered Chargers</option>
      </select>
      {isSaving && (
        <p className="mt-2 text-xs text-gray-500">Saving...</p>
      )}
    </div>
  )
}
