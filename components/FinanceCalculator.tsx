'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface FinanceCalculatorProps {
  isOpen: boolean
  onClose: () => void
  productPrice: number
  productName: string
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

  // Auto-apply saved settings when component mounts
  useEffect(() => {
    if (selectedPlan && selectedDeposit !== undefined) {
      setDepositPercentage(selectedDeposit)
      // The selectedOption will be set in the payment options useEffect
    }
  }, [selectedPlan, selectedDeposit])

  // Calculate payment options when component mounts or APR settings change
  useEffect(() => {
    if (aprSettings && Object.keys(aprSettings).length > 0) {
      const calculateOptions = () => {
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
        
        // Update selected option with new calculations
        if (options.length > 0) {
          if (selectedOption) {
            // Try to find the currently selected option in the new options
            const currentOption = options.find(opt => opt.months === selectedOption.months)
            if (currentOption) {
              setSelectedOption(currentOption)
            }
          } else if (selectedPlan) {
            // If no current selection but we have a selectedPlan, try to match it
            const matchingOption = options.find(opt => opt.months === selectedPlan.months)
            if (matchingOption) {
              setSelectedOption(matchingOption)
            } else {
              setSelectedOption(options[0])
            }
          } else {
            setSelectedOption(options[0])
          }
        }
      }

      calculateOptions()
    }
  }, [aprSettings, productPrice, selectedPlan, depositPercentage])

  // Call callback when monthly payment changes
  useEffect(() => {
    if (selectedOption && onMonthlyPaymentUpdate) {
      onMonthlyPaymentUpdate(selectedOption.monthlyPayment)
    }
  }, [selectedOption, onMonthlyPaymentUpdate])

  // Call callback when deposit changes (affects monthly payment)
  useEffect(() => {
    if (selectedOption && onMonthlyPaymentUpdate) {
      const depositAmount = (productPrice * depositPercentage) / 100
      const loanAmount = productPrice - depositAmount
      
      if (depositAmount > 0) {
        const monthlyRate = selectedOption.apr / 100 / 12
        const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, selectedOption.months)) / 
                              (Math.pow(1 + monthlyRate, selectedOption.months) - 1)
        onMonthlyPaymentUpdate(monthlyPayment)
      } else {
        onMonthlyPaymentUpdate(selectedOption.monthlyPayment)
      }
    }
  }, [selectedOption, depositPercentage, productPrice, onMonthlyPaymentUpdate])

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Finance Calculator</h2>
              <p className="text-sm text-gray-600 mt-1">{productName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500 text-sm">🏠</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{productName}</h3>
                  <p className="text-sm text-gray-600">Initial price</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-900">£{productPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Options */}
          {paymentOptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose your payment plan</h3>
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
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      selectedOption?.months === option.months
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedOption?.months === option.months
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedOption?.months === option.months && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">
                          £{option.monthlyPayment.toFixed(2)} for {option.months} months
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">{option.apr}% APR</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deposit Selector */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose deposit:</h3>
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
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Selected: <span className="font-semibold text-gray-900">{depositPercentage}%</span>
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  £{depositAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Loan Summary */}
          {selectedOptionWithDeposit && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Your loan summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly payment:</span>
                  <span className="font-semibold text-gray-900">
                    £{selectedOptionWithDeposit.monthlyPayment.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Deposit:</span>
                  <span className="font-semibold text-gray-900">
                    £{depositAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment term:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedOptionWithDeposit.months} months
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">APR Representative:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedOptionWithDeposit.apr}% APR
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Annual Interest Rate (Fixed):</span>
                  <span className="font-semibold text-gray-900">
                    {(selectedOptionWithDeposit.apr * 0.514).toFixed(2)}% APR
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Loan amount:</span>
                  <span className="font-semibold text-gray-900">
                    £{loanAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest payable:</span>
                  <span className="font-semibold text-gray-900">
                    £{selectedOptionWithDeposit.totalInterest.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-900 font-semibold">Total payable:</span>
                  <span className="text-xl font-bold text-gray-900">
                    £{selectedOptionWithDeposit.totalPayable.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-xs text-gray-500 text-center">
            Representative example. Application subject to affordability, age and status, minimum spend applies.
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              className="flex-1 py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              onClick={onClose}
            >
              Continue with this plan
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

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
    </div>
  )
}
