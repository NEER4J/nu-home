'use client'

import { useState, useEffect, useRef } from 'react'
import { Phone, Check, RotateCcw, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface OtpVerificationProps {
  phoneNumber: string
  onVerificationComplete: (submissionId?: string) => void
  onResendOtp?: () => void
  className?: string
  userInfo?: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  formValues?: Record<string, any>
  submissionId?: string
  questions?: any[]
}

export default function OtpVerification({ 
  phoneNumber, 
  onVerificationComplete, 
  onResendOtp,
  className = '',
  userInfo,
  formValues = {},
  submissionId,
  questions = []
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut",
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  const otpInputVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.15,
        ease: "easeOut"
      }
    }
  };

  const loadingVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

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
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const subdomain = hostname || null
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, subdomain, submissionId }),
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
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const subdomain = hostname || null
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber, 
          code: otpCode,
          verificationSid,
          subdomain,
          submissionId
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }
      
      if (data.status === 'approved') {
        setSuccess(true)
        // Send verification email after successful OTP verification
        await sendVerifiedQuoteEmail()
        // The OTP verification API already updated the submission in the database
        // We just need to notify the parent to redirect - no additional submission needed
        onVerificationComplete(submissionId)
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

  const sendVerifiedQuoteEmail = async () => {
    if (!userInfo) return
    
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const subdomain = hostname || null

      // Detect if running in iframe
      const isIframe = window.self !== window.top;

      const res = await fetch('/api/email/boiler/quote-verified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: userInfo.firstName,
          last_name: userInfo.lastName,
          email: userInfo.email,
          phone: userInfo.phone,
          postcode: formValues.postcode,
          quote_data: formValues,
          address_data: formValues.address,
          questions: questions,
          submission_id: submissionId,
          subdomain,
          is_iframe: isIframe,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.warn('Failed to send verified quote email:', data?.error || 'Unknown error')
      }
    } catch (err: any) {
      console.warn('Failed to send verified quote email:', err?.message || 'Unknown error')
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
    <motion.div 
      className={`space-y-6 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div 
        className="text-center space-y-4"
        variants={itemVariants}
      >
        <p className="text-gray-600">
          We've sent a {otpConfig.codeLength}-digit code to{' '}
          <span className="font-medium text-gray-900">{formatPhoneNumber(phoneNumber)}</span> to verify your phone number.
        </p>
      </motion.div>

      {/* OTP Input */}
      <motion.div 
        className="space-y-4"
        variants={itemVariants}
      >
        {loading && !resendLoading ? (
          <motion.div 
            className="text-center py-8"
            variants={loadingVariants}
          >
            <motion.div 
              className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-gray-600">
              {verificationSid ? 'Verifying your code...' : 'Sending OTP...'}
            </p>
          </motion.div>
        ) : error && !verificationSid ? (
          // Show retry button if initial OTP send failed
          <motion.div 
            className="text-center py-8"
            variants={loadingVariants}
          >
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <motion.button
              onClick={sendOtp}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.05 }}
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div 
            className="flex justify-center space-x-3"
            variants={otpInputVariants}
          >
            {otp.map((digit, index) => (
              <motion.input
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
                whileFocus={{ scale: 1.05 }}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.05 }}
              />
            ))}
          </motion.div>
        )}

        <AnimatePresence>
          {error && verificationSid && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.1 }}
              className="text-red-600 text-sm text-center"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center space-x-2 text-green-600"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <Check size={16} />
              </motion.div>
              <span className="text-sm font-medium">Phone verified successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Resend OTP */}
      <motion.div 
        className="text-center"
        variants={itemVariants}
      >
        {resendCooldown > 0 ? (
          <motion.p 
            className="text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            Resend code in {resendCooldown}s
          </motion.p>
        ) : (
          <motion.button
            onClick={handleResend}
            disabled={resendLoading || loading}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.05 }}
          >
            {resendLoading ? (
              <>
                <motion.div 
                  className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <RotateCcw size={14} />
                <span>Resend code</span>
              </>
            )}
          </motion.button>
        )}
      </motion.div>

      {/* Help text */}
      <motion.div 
        className="text-center space-y-2"
        variants={itemVariants}
      >
       
      
      </motion.div>
    </motion.div>
  )
}
