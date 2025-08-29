'use client'

import { useState, useEffect, useRef } from 'react'
import { Mail, Phone, Check, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import OtpVerification from './OtpVerification'

interface UserInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  countryCode: string
  fullPhoneNumber: string
}

interface ContactDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  city?: string;
  postcode: string;
}

const COUNTRY_CODES = [
  { country: 'United Kingdom', code: '+44', flag: '' },
  { country: 'India', code: '+91', flag: '' },
  { country: 'United States', code: '+1', flag: '' },
  { country: 'Ireland', code: '+353', flag: '' },
  { country: 'France', code: '+33', flag: '' },
  { country: 'Germany', code: '+49', flag: '' }
]

const detectCountryCode = (phone: string): string => {
  const cleaned = phone.replace(/\s/g, '')
  if (cleaned.startsWith('+44') || cleaned.startsWith('0')) return '+44'
  if (cleaned.startsWith('+91')) return '+91'
  if (cleaned.startsWith('+1')) return '+1'
  if (cleaned.startsWith('+353')) return '+353'
  if (cleaned.startsWith('+33')) return '+33'
  if (cleaned.startsWith('+49')) return '+49'
  return '+44'
}

interface UserInfoFormProps {
  onUserInfoChange: (userInfo: UserInfo) => void
  onContinue?: () => void
  onSubmit?: (contactDetails: ContactDetails) => void
  className?: string
  initialUserInfo?: UserInfo | null
  formValues?: Record<string, any>
  otpEnabled?: boolean
  companyColor?: string
  questions?: any[]
}

export default function UserInfoForm({ 
  onUserInfoChange, 
  onContinue,
  onSubmit,
  className = '', 
  initialUserInfo = null,
  formValues = {},
  otpEnabled = false,
  companyColor = '#2563eb',
  questions = []
}: UserInfoFormProps) {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    firstName: initialUserInfo?.firstName || '',
    lastName: initialUserInfo?.lastName || '',
    email: initialUserInfo?.email || '',
    phone: initialUserInfo?.phone || '',
    countryCode: initialUserInfo?.countryCode || detectCountryCode(initialUserInfo?.phone || ''),
    fullPhoneNumber: initialUserInfo?.fullPhoneNumber || ''
  })

  const [errors, setErrors] = useState<Partial<UserInfo>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof UserInfo, boolean>>>({})
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [currentView, setCurrentView] = useState<'form' | 'otp'>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const formVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      x: 20,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }
  };

  const otpVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }
  };

  const fieldVariants = {
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

  const dropdownVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.15,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: {
        duration: 0.1,
        ease: "easeIn"
      }
    }
  };

  useEffect(() => {
    if (initialUserInfo) {
      const detectedCountryCode = detectCountryCode(initialUserInfo.phone || '')
      setUserInfo({
        firstName: initialUserInfo.firstName || '',
        lastName: initialUserInfo.lastName || '',
        email: initialUserInfo.email || '',
        phone: initialUserInfo.phone || '',
        countryCode: initialUserInfo.countryCode || detectedCountryCode,
        fullPhoneNumber: initialUserInfo.fullPhoneNumber || ''
      })
    }
  }, [initialUserInfo])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string, countryCode: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (countryCode === '+44') {
      return cleaned.length >= 10 && cleaned.length <= 11
    } else if (countryCode === '+91') {
      return cleaned.length === 10
    } else {
      return cleaned.length >= 7 && cleaned.length <= 15
    }
  }

  const createFullPhoneNumber = (phone: string, countryCode: string) => {
    const cleaned = phone.replace(/\D/g, '')
    
    if (!cleaned) return ''
    
    if (cleaned.startsWith('+')) {
      return cleaned
    }
    
    if ((countryCode === '+44' || countryCode === '+353') && cleaned.startsWith('0')) {
      return countryCode + cleaned.slice(1)
    }
    
    return countryCode + cleaned
  }

  const validateField = (field: keyof UserInfo, value: string) => {
    switch (field) {
      case 'firstName':
        return value.trim().length >= 2 ? '' : 'First name must be at least 2 characters'
      case 'lastName':
        return value.trim().length >= 2 ? '' : 'Last name must be at least 2 characters'
      case 'email':
        return validateEmail(value) ? '' : 'Please enter a valid email address'
      case 'phone':
        return validatePhone(value, userInfo.countryCode) ? '' : 'Please enter a valid phone number'
      default:
        return ''
    }
  }

  const handleInputChange = (field: keyof UserInfo, value: string) => {
    let newUserInfo = { ...userInfo, [field]: value }
    
    if (field === 'phone') {
      newUserInfo.fullPhoneNumber = createFullPhoneNumber(value, userInfo.countryCode)
    }
    
    setUserInfo(newUserInfo)

    if (touched[field]) {
      const error = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: error }))
    }

    onUserInfoChange(newUserInfo)
  }

  const handleCountryCodeChange = (newCountryCode: string) => {
    const newUserInfo = { 
      ...userInfo, 
      countryCode: newCountryCode,
      fullPhoneNumber: createFullPhoneNumber(userInfo.phone, newCountryCode)
    }
    setUserInfo(newUserInfo)
    setShowCountryDropdown(false)
    
    if (touched.phone) {
      const error = validateField('phone', userInfo.phone)
      setErrors(prev => ({ ...prev, phone: error }))
    }
    
    onUserInfoChange(newUserInfo)
  }

  const handleBlur = (field: keyof UserInfo) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, userInfo[field])
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    
    if (userInfo.countryCode === '+44') {
      if (cleaned.length <= 11) {
        if (cleaned.startsWith('44')) {
          return cleaned.replace(/(\d{2})(\d{4})(\d{3})(\d{3})/, '$1 $2 $3 $4')
        } else if (cleaned.startsWith('0')) {
          return cleaned.replace(/(\d{1})(\d{4})(\d{3})(\d{3})/, '$1$2 $3 $4')
        } else {
          return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
        }
      }
    } else if (userInfo.countryCode === '+91') {
      if (cleaned.length <= 10) {
        return cleaned.replace(/(\d{5})(\d{5})/, '$1 $2')
      }
    } else {
      if (cleaned.length <= 12) {
        return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
      }
    }
    return cleaned
  }

  const isFormValid = () => {
    const fields: (keyof UserInfo)[] = ['firstName', 'lastName', 'email', 'phone']
    return fields.every(field => {
      const value = userInfo[field]
      return value.trim() !== '' && validateField(field, value) === ''
    })
  }

  const handleContinue = () => {
    const fields: (keyof UserInfo)[] = ['firstName', 'lastName', 'email', 'phone']
    const newErrors: Partial<UserInfo> = {}
    const newTouched: Partial<Record<keyof UserInfo, boolean>> = {}
    
    fields.forEach(field => {
      newTouched[field] = true
      const error = validateField(field, userInfo[field])
      if (error) newErrors[field] = error
    })
    
    setTouched(newTouched)
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length === 0) {
      if (onSubmit) {
        handleUserSubmission()
      } else if (onContinue) {
        onContinue()
      }
    }
  }

  const handleUserSubmission = async () => {
    setIsSubmitting(true)
    try {
      await sendInitialQuoteEmail()
      
      if (otpEnabled) {
        setCurrentView('otp')
      } else {
        submitContactDetails()
      }
    } catch (error) {
      console.error('Error during user submission:', error)
      setIsSubmitting(false)
    }
  }

  const sendInitialQuoteEmail = async () => {
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const subdomain = hostname || null

      const res = await fetch('/api/email/boiler/quote-initial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: userInfo.firstName,
          last_name: userInfo.lastName,
          email: userInfo.email,
          phone: userInfo.fullPhoneNumber,
          postcode: formValues.postcode,
          quote_data: formValues,
          address_data: formValues.address,
          questions: questions,
          submission_id: formValues.submission_id,
          subdomain,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.warn('Failed to send initial quote email:', data?.error || 'Unknown error')
      }
    } catch (err: any) {
      console.warn('Failed to send initial quote email:', err?.message || 'Unknown error')
    }
  }

  const submitContactDetails = () => {
    if (!onSubmit) return
    
    const contactDetails: ContactDetails = {
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      email: userInfo.email,
      phone: userInfo.fullPhoneNumber,
      postcode: formValues.postcode || ''
    }
    
    setIsSubmitting(true)
    onSubmit(contactDetails)
  }

  const handleOtpVerificationComplete = () => {
    // Switch back to form view and show submitting state immediately
    setCurrentView('form')
    submitContactDetails()
  }

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="wait">
        {currentView === 'otp' && (
          <motion.div
            key="otp"
            className="space-y-6"
            variants={otpVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <OtpVerification
              phoneNumber={userInfo.fullPhoneNumber}
              onVerificationComplete={handleOtpVerificationComplete}
              className="max-w-md mx-auto"
              userInfo={{
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                email: userInfo.email,
                phone: userInfo.fullPhoneNumber
              }}
              formValues={formValues}
              submissionId={formValues.submission_id}
              questions={questions}
            />
            {/* Loading hint while we submit and redirect after verification */}
            <AnimatePresence>
              {isSubmitting && (
                <motion.div 
                  className="text-center text-sm text-gray-600"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  Redirecting to products...
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {currentView === 'form' && (
          <motion.div
            key="form"
            className="space-y-6"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
                    <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 mb-2 text-center">Tell us about yourself</h2>

            <motion.div variants={fieldVariants}>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <motion.input
                id="firstName"
                type="text"
                value={userInfo.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                onBlur={() => handleBlur('firstName')}
                placeholder="Enter your first name"
                className="w-full p-3 pl-6 text-base text-gray-900 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                autoComplete="given-name"
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.1 }}
              />
              <AnimatePresence>
                {errors.firstName && (
                  <motion.p 
                    className="text-red-600 text-sm mt-1"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.1 }}
                  >
                    {errors.firstName}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={fieldVariants}>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <motion.input
                id="lastName"
                type="text"
                value={userInfo.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                onBlur={() => handleBlur('lastName')}
                placeholder="Enter your last name"
                className="w-full p-3 pl-6 text-base text-gray-900 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                autoComplete="family-name"
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.1 }}
              />
              <AnimatePresence>
                {errors.lastName && (
                  <motion.p 
                    className="text-red-600 text-sm mt-1"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.1 }}
                  >
                    {errors.lastName}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={fieldVariants}>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <motion.input
                  id="email"
                  type="email"
                  value={userInfo.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="Enter your email address"
                  className="w-full p-3 pl-6 text-base text-gray-900 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  autoComplete="email"
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.1 }}
                />
             
                <AnimatePresence>
                  {userInfo.email && !errors.email && (
                    <motion.div 
                      className="absolute right-4 top-4 transform -translate-y-1/2"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check size={16} className="text-green-500" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p 
                    className="text-red-600 text-sm mt-1"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.1 }}
                  >
                    {errors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={fieldVariants}>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="flex rounded-full border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                <div className="relative" ref={dropdownRef}>
                  <motion.button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="flex items-center space-x-2 px-4 py-3 bg-gray-50 text-gray-700 rounded-l-full border-r border-gray-300 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.05 }}
                  >
                    <span className="text-lg">
                      {COUNTRY_CODES.find(c => c.code === userInfo.countryCode)?.flag || ''}
                    </span>
                    <span className="text-sm font-medium">{userInfo.countryCode}</span>
                    <motion.div
                      animate={{ rotate: showCountryDropdown ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={14} className="text-gray-500" />
                    </motion.div>
                  </motion.button>
                  
                  <AnimatePresence>
                    {showCountryDropdown && (
                      <motion.div 
                        className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg min-w-[240px] max-h-60 overflow-y-auto"
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <div className="py-1">
                          {COUNTRY_CODES.map((country) => (
                            <motion.button
                              key={country.code}
                              onClick={() => handleCountryCodeChange(country.code)}
                              className="flex items-center space-x-3 w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              transition={{ duration: 0.05 }}
                            >
                              <span className="text-lg">{country.flag}</span>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{country.country}</div>
                                <div className="text-xs text-gray-500">{country.code}</div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="flex-1 relative">
                  <motion.input
                    id="phone"
                    type="tel"
                    value={userInfo.phone}
                    onChange={(e) => handleInputChange('phone', formatPhoneNumber(e.target.value))}
                    onBlur={() => handleBlur('phone')}
                    placeholder="Enter your phone number"
                    className="w-full p-3 pl-6 text-base text-gray-900 border-0 rounded-r-full focus:outline-none transition-colors"
                    autoComplete="tel"
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.1 }}
                  />
                  <AnimatePresence>
                    {userInfo.phone && !errors.phone && (
                      <motion.div 
                        className="absolute right-4 top-4 transform -translate-y-1/2"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Check size={16} className="text-green-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <AnimatePresence>
                {errors.phone && (
                  <motion.p 
                    className="text-red-600 text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.1 }}
                  >
                    {errors.phone}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  We'll use this to contact you about your quote
                </p>
                {userInfo.fullPhoneNumber && (
                  <p className="text-xs text-gray-600 font-medium">
                    Full: {userInfo.fullPhoneNumber}
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div 
              className="pt-4"
              variants={fieldVariants}
            >
              <motion.button
                onClick={handleContinue}
                disabled={!isFormValid() || isSubmitting}
                className={`w-full py-3 px-6 rounded-full text-base font-medium transition-colors ${
                  isFormValid() && !isSubmitting 
                    ? 'text-white hover:opacity-90' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                style={isFormValid() && !isSubmitting ? { backgroundColor: companyColor } : {}}
                whileHover={isFormValid() && !isSubmitting ? { scale: 1.005 } : {}}
                whileTap={isFormValid() && !isSubmitting ? { scale: 0.99 } : {}}
                transition={{ duration: 0.04 }}
              >
                {isSubmitting ? (
                  <>
                    <motion.svg 
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </motion.svg>
                    Submitting...
                  </>
                ) : (
                  otpEnabled ? 'Continue to Verification' : 'Get My Quote'
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
