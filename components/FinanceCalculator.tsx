'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'

interface FinanceCalculatorProps {
  isOpen: boolean
  onClose: () => void
  productPrice: number
  productName: string
  productImageUrl?: string | null
  aprSettings: Record<number, number> | null
  brandColor?: string
  onMonthlyPaymentUpdate?: (monthlyPayment: number) => void
  selectedPlan?: { months: number; apr: number } | null
  selectedDeposit?: number
  onPlanChange?: (plan: { months: number; apr: number }) => void
  onDepositChange?: (deposit: number) => void
}

interface PaymentOption {
  months: number
  apr: number
  monthlyPayment: number
  totalInterest: number
  totalPayable: number
}

export default function FinanceCalculator({
  isOpen,
  onClose,
  productPrice,
  productName,
  productImageUrl,
  aprSettings,
  brandColor = '#2563eb',
  onMonthlyPaymentUpdate,
  selectedPlan,
  selectedDeposit = 0,
  onPlanChange,
  onDepositChange
}: FinanceCalculatorProps) {
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null)
  const [depositPercentage, setDepositPercentage] = useState(selectedDeposit)
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])
  
  // Use ref to store the latest callback to avoid dependency issues
  const onMonthlyPaymentUpdateRef = useRef(onMonthlyPaymentUpdate)
  onMonthlyPaymentUpdateRef.current = onMonthlyPaymentUpdate

  // Auto-apply saved settings when component mounts
  useEffect(() => {
    if (selectedPlan && selectedDeposit !== undefined) {
      setDepositPercentage(selectedDeposit)
    }
  }, [selectedPlan, selectedDeposit])

  // Calculate payment options when dependencies change
  useEffect(() => {
    if (aprSettings && Object.keys(aprSettings).length > 0) {
      const options: PaymentOption[] = Object.entries(aprSettings).map(([months, apr]) => {
        const monthsNum = parseInt(months)
        const aprNum = apr
        const monthlyRate = aprNum / 100 / 12
        
        // Calculate monthly payment considering deposit
        let monthlyPayment: number
        if (depositPercentage > 0) {
          const depositAmount = (productPrice * depositPercentage) / 100
          const loanAmount = productPrice - depositAmount
          monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, monthsNum)) / 
                          (Math.pow(1 + monthlyRate, monthsNum) - 1)
        } else {
          monthlyPayment = (productPrice * monthlyRate * Math.pow(1 + monthlyRate, monthsNum)) / 
                          (Math.pow(1 + monthlyRate, monthsNum) - 1)
        }
        
        const totalPayable = monthlyPayment * monthsNum
        const totalInterest = totalPayable - (productPrice - (productPrice * depositPercentage / 100))

        return {
          months: monthsNum,
          apr: aprNum,
          monthlyPayment,
          totalInterest,
          totalPayable
        }
      })

      // Sort by months (ascending)
      options.sort((a, b) => a.months - b.months)
      setPaymentOptions(options)
    }
  }, [aprSettings, productPrice, depositPercentage])

  // Handle selected option updates separately to avoid circular dependencies
  useEffect(() => {
    if (paymentOptions.length > 0) {
      let newSelectedOption: PaymentOption | null = null
      
      if (selectedPlan) {
        // If we have a selectedPlan, try to match it
        newSelectedOption = paymentOptions.find(opt => opt.months === selectedPlan.months) || paymentOptions[0]
      } else if (!selectedOption) {
        // Only set default if no option is currently selected
        newSelectedOption = paymentOptions[0]
      }
      
      if (newSelectedOption && (!selectedOption || selectedOption.months !== newSelectedOption.months)) {
        setSelectedOption(newSelectedOption)
      }
    }
  }, [paymentOptions, selectedPlan, selectedOption?.months])

  // Handle monthly payment callback separately
  useEffect(() => {
    if (selectedOption && onMonthlyPaymentUpdateRef.current) {
      onMonthlyPaymentUpdateRef.current(selectedOption.monthlyPayment)
    }
  }, [selectedOption])

  // Calculate deposit amount
  const depositAmount = (productPrice * depositPercentage) / 100
  const loanAmount = productPrice - depositAmount

  // Use the updated payment options directly since they already include deposit calculations
  const selectedOptionWithDeposit = selectedOption ? {
    ...selectedOption,
    monthlyPayment: selectedOption.monthlyPayment,
    totalInterest: selectedOption.totalInterest,
    totalPayable: selectedOption.totalPayable
  } : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl overflow-y-auto" variant="sidebar">
        <DialogHeader>
          <DialogTitle>Finance Calculator</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Information */}
          <div className="">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {productImageUrl ? (
                  <img src={productImageUrl} alt={productName} className="w-14 h-14 object-contain rounded-lg bg-gray-100 p-1" />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-gray-900 md:text-base text-sm">{productName}</h3>
                  <span className="font-semibold text-gray-900 md:text-xl text-base">£{productPrice.toFixed(2)}</span>
                </div>
              </div>
              
            </div>
          </div>

          {/* Payment Options */}
          {paymentOptions.length > 0 && (
            <div>
              <div className="space-y-3">
                {paymentOptions.map((option) => (
                  <button
                    key={option.months}
                    onClick={() => {
                      setSelectedOption(option)
                      if (onPlanChange) {
                        onPlanChange({ months: option.months, apr: option.apr })
                      }
                    }}
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      selectedOption?.months === option.months
                        ? 'bg-gray-200 border-none'
                        : 'bg-gray-100 border-none'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedOption?.months === option.months
                              ? 'border-current bg-current'
                              : 'border-gray-300'
                          }`}
                          style={{
                            borderColor: selectedOption?.months === option.months ? brandColor : undefined,
                            backgroundColor: selectedOption?.months === option.months ? brandColor : undefined
                          }}
                        >
                          {selectedOption?.months === option.months && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-left">
                          <span className="font-semibold text-gray-900 md:text-base text-sm">
                            £{option.monthlyPayment.toFixed(2)}
                          </span>
                          <span className="text-gray-600 md:text-base text-xs ml-1">
                            for {option.months} months
                          </span>
                        </div>
                      </div>
                      <span 
                        className="px-3 py-1 rounded-full md:text-sm text-xs font-medium"
                        style={{
                          backgroundColor: `${brandColor}15`,
                          color: brandColor
                        }}
                      >
                        {option.apr}% APR
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deposit Selector */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 md:text-lg text-sm">Choose deposit:</h3>
              <p className="text-sm text-gray-600">Selected: <span className="font-semibold text-gray-900">{depositPercentage}%</span></p>
            </div>
            <div className="space-y-3">
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={depositPercentage}
                onChange={(e) => {
                  const newDeposit = parseInt(e.target.value)
                  setDepositPercentage(newDeposit)
                  if (onDepositChange) {
                    onDepositChange(newDeposit)
                  }
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, ${brandColor} 0%, ${brandColor} ${depositPercentage * 2}%, #e5e7eb ${depositPercentage * 2}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>0% min</span>
                <span>50% max</span>
              </div>
            
            </div>
          </div>

          {/* Loan Summary */}
          {selectedOptionWithDeposit && (
            <div className="p-0 !mt-2">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 md:text-base text-xs">Monthly payment:</span>
                  <span className="font-medium text-gray-700 md:text-base text-xs">
                    £{selectedOptionWithDeposit.monthlyPayment.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 md:text-base text-xs">Deposit:</span>
                  <span className="font-medium text-gray-700 md:text-base text-xs">
                    £{depositAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 md:text-base text-xs">Payment term:</span>
                  <span className="font-medium text-gray-700 md:text-base text-xs">
                    {selectedOptionWithDeposit.months} months
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 md:text-base text-xs">APR Representative:</span>
                  <span className="font-medium text-gray-700 md:text-base text-xs">
                    {selectedOptionWithDeposit.apr}% APR
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 md:text-base text-xs">Annual Interest Rate (Fixed):</span>
                  <span className="font-medium text-gray-700 md:text-base text-xs">
                    {(selectedOptionWithDeposit.apr * 0.514).toFixed(2)}% APR
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 md:text-base text-xs">Loan amount:</span>
                  <span className="font-medium text-gray-700 md:text-base text-xs">
                    £{loanAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 md:text-base text-xs">Interest payable:</span>
                  <span className="font-medium text-gray-700 md:text-base text-xs">
                    £{selectedOptionWithDeposit.totalInterest.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-900 font-medium md:text-sm text-xs">Total payable:</span>
                  <span className="text-xl font-semibold text-gray-900 md:text-sm text-xs">
                    £{selectedOptionWithDeposit.totalPayable.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="md:text-base text-xs text-gray-500 text-left">
            Representative example. Application subject to affordability, age and status, minimum spend applies.
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <button
            className="flex-1 py-3 px-4 text-white font-semibold rounded-full hover:opacity-90 transition-colors md:text-sm text-xs"
            style={{ backgroundColor: brandColor }}
            onClick={onClose}
          >
            Continue with this plan
          </button>
       
        </DialogFooter>

        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: ${brandColor};
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: ${brandColor};
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}
