'use client'

import { useState, useEffect, useRef } from 'react'
import { Phone, Check, RotateCcw, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

interface OtpVerificationProps {
  phoneNumber: string
  onVerificationComplete: () => void
  onResendOtp?: () => void
  className?: string
}

export default function OtpVerification({ 
  phoneNumber, 
  onVerificationComplete, 
  onResendOtp,
  className = '' 
}: OtpVerificationProps) {
  const otpConfig = {
    codeLength: 6,
    resendCooldown: 30,
    autoSubmit: true
  }
  
  const [otp, setOtp] = useState(Array(otpConfig.codeLength).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [verificationSid, setVerificationSid] = useState<string | null>(null)
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Send initial OTP when component mounts
  useEffect(() => {
    // Add a small delay to prevent immediate API call
    const timer = setTimeout(() => {
      sendOtp()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const sendOtp = async () => {
    // Prevent multiple simultaneous requests
    if (loading || resendLoading) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP')
      }
      
      setVerificationSid(data.sid)
      setResendCooldown(otpConfig.resendCooldown)
      console.log('OTP sent successfully:', data)
    } catch (err) {
      console.error('Send OTP error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP'
      setError(errorMessage)
      
      // If it's a network error, show a more user-friendly message
      if (errorMessage.includes('fetch')) {
        setError('Network error. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (otpCode: string) => {
    // Prevent multiple simultaneous requests
    if (loading) return
    
    if (!verificationSid) {
      setError('No verification session found. Please request a new code.')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber, 
          code: otpCode,
          verificationSid 
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }
      
      if (data.status === 'approved') {
        setSuccess(true)
        setTimeout(() => {
          onVerificationComplete()
        }, 1500)
      } else {
        throw new Error('Verification failed')
      }
    } catch (err) {
      console.error('Verify OTP error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Verification failed'
      setError(errorMessage)
      
      // Clear OTP on error
      setOtp(Array(otpConfig.codeLength).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent multiple characters
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError('')
    
    // Auto-focus next input
    if (value && index < otpConfig.codeLength - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Auto-verify when all digits are entered (if enabled)
    if (otpConfig.autoSubmit && newOtp.every(digit => digit !== '') && newOtp.join('').length === otpConfig.codeLength) {
      verifyOtp(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, otpConfig.codeLength)
    
    if (pasteData.length === otpConfig.codeLength) {
      const newOtp = pasteData.split('')
      setOtp(newOtp)
      verifyOtp(pasteData)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    await sendOtp()
    setResendLoading(false)
    setOtp(Array(otpConfig.codeLength).fill(''))
    inputRefs.current[0]?.focus()
    if (onResendOtp) onResendOtp()
  }

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display based on country code
    if (phone.startsWith('+44')) {
      // UK format: +44 7*** *** ***
      return phone.replace(/(\+44)(\d{1})(\d{3})(\d{3})(\d{3})/, '$1 $2*** *** ***')
    } else if (phone.startsWith('+91')) {
      // Indian format: +91 9**** *****
      return phone.replace(/(\+91)(\d{1})(\d{4})(\d{5})/, '$1 $2**** *****')
    }
    // Generic format for other numbers
    const countryCode = phone.match(/^\+\d{1,3}/)?.[0] || ''
    const number = phone.replace(countryCode, '')
    if (number.length >= 6) {
      const masked = number.slice(0, 1) + '*'.repeat(number.length - 3) + number.slice(-2)
      return countryCode + ' ' + masked
    }
    return phone.replace(/(\d{5})(\d{3})(\d{3})/, '$1 *** ***')
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <p className="text-gray-600">
          We've sent a {otpConfig.codeLength}-digit code to{' '}
          <span className="font-medium text-gray-900">{formatPhoneNumber(phoneNumber)}</span> to verify your phone number.
        </p>
      </div>

      {/* OTP Input */}
      <div className="space-y-4">
        {loading && !resendLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-600">
              {verificationSid ? 'Verifying your code...' : 'Sending OTP...'}
            </p>
          </div>
        ) : error && !verificationSid ? (
          // Show retry button if initial OTP send failed
          <div className="text-center py-8">
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={sendOtp}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        ) : (
          <div className="flex justify-center space-x-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`w-12 h-12 text-center text-xl text-gray-900 font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  error
                    ? 'border-red-500 bg-red-50'
                    : success
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-white'
                }`}
                disabled={loading || success}
              />
            ))}
          </div>
        )}

        {error && verificationSid && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-600 text-sm text-center"
          >
            {error}
          </motion.p>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center space-x-2 text-green-600"
          >
            <Check size={16} />
            <span className="text-sm font-medium">Phone verified successfully!</span>
          </motion.div>
        )}
      </div>

      {/* Resend OTP */}
      <div className="text-center">
        {resendCooldown > 0 ? (
          <p className="text-sm text-gray-500">
            Resend code in {resendCooldown}s
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resendLoading || loading}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 mx-auto"
          >
            {resendLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <RotateCcw size={14} />
                <span>Resend code</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Help text */}
      <div className="text-center space-y-2">
        <p className="text-xs text-gray-500">
          Didn't receive the code? Check your messages or try again.
        </p>
        <p className="text-xs text-gray-400">
          Need help? Contact us at{' '}
          <span className="text-blue-600 font-medium">
            +44 20 7946 0958
          </span>
        </p>
      </div>
    </div>
  )
}
