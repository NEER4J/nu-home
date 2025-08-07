'use client'

import { useState, useEffect, useRef } from 'react'
import { Mail, Phone, Check, ChevronDown } from 'lucide-react'
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
}

export default function UserInfoForm({ 
  onUserInfoChange, 
  onContinue,
  onSubmit,
  className = '', 
  initialUserInfo = null,
  formValues = {},
  otpEnabled = false,
  companyColor = '#2563eb'
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

  const handleUserSubmission = () => {
    if (otpEnabled) {
      setCurrentView('otp')
    } else {
      submitContactDetails()
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
    submitContactDetails()
  }

  return (
    <>
      {currentView === 'otp' && (
        <div className="space-y-6">
          <OtpVerification
            phoneNumber={userInfo.fullPhoneNumber}
            onVerificationComplete={handleOtpVerificationComplete}
            className="max-w-md mx-auto"
          />
          
        </div>
      )}

      {currentView === 'form' && (
        <div className="space-y-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={userInfo.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              onBlur={() => handleBlur('firstName')}
              placeholder="Enter your first name"
              className="w-full p-3 text-base text-gray-900 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              autoComplete="given-name"
            />
            {errors.firstName && (
              <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={userInfo.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              onBlur={() => handleBlur('lastName')}
              placeholder="Enter your last name"
              className="w-full p-3 text-base text-gray-900 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              autoComplete="family-name"
            />
            {errors.lastName && (
              <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={userInfo.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="Enter your email address"
                className="w-full p-3 pl-10 text-base text-gray-900 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                autoComplete="email"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Mail size={16} className="text-gray-400" />
              </div>
              {userInfo.email && !errors.email && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Check size={16} className="text-green-500" />
                </div>
              )}
            </div>
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="flex rounded-full border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="flex items-center space-x-2 px-4 py-3 bg-gray-50 text-gray-700 rounded-l-full border-r border-gray-300 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors"
                >
                  <span className="text-lg">
                    {COUNTRY_CODES.find(c => c.code === userInfo.countryCode)?.flag || ''}
                  </span>
                  <span className="text-sm font-medium">{userInfo.countryCode}</span>
                  <ChevronDown size={14} className="text-gray-500" />
                </button>
                
                {showCountryDropdown && (
                  <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg min-w-[240px] max-h-60 overflow-y-auto">
                    <div className="py-1">
                      {COUNTRY_CODES.map((country) => (
                        <button
                          key={country.code}
                          onClick={() => handleCountryCodeChange(country.code)}
                          className="flex items-center space-x-3 w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                        >
                          <span className="text-lg">{country.flag}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{country.country}</div>
                            <div className="text-xs text-gray-500">{country.code}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-1 relative">
                <input
                  id="phone"
                  type="tel"
                  value={userInfo.phone}
                  onChange={(e) => handleInputChange('phone', formatPhoneNumber(e.target.value))}
                  onBlur={() => handleBlur('phone')}
                  placeholder="Enter your phone number"
                  className="w-full p-3 pl-4 pr-10 text-base text-gray-900 border-0 rounded-r-full focus:outline-none transition-colors"
                  autoComplete="tel"
                />
                {userInfo.phone && !errors.phone && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Check size={16} className="text-green-500" />
                  </div>
                )}
              </div>
            </div>
            {errors.phone && (
              <p className="text-red-600 text-sm">{errors.phone}</p>
            )}
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                We'll use this to contact you about your quote
              </p>
              {userInfo.fullPhoneNumber && (
                <p className="text-xs text-gray-600 font-medium">
                  Full: {userInfo.fullPhoneNumber}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleContinue}
              disabled={!isFormValid() || isSubmitting}
              className={`w-full py-3 px-6 rounded-full text-base font-medium transition-colors ${
                isFormValid() && !isSubmitting 
                  ? 'text-white hover:opacity-90' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              style={isFormValid() && !isSubmitting ? { backgroundColor: companyColor } : {}}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                otpEnabled ? 'Continue to Verification' : 'Get My Quote'
              )}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
