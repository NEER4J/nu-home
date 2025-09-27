'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Address {
  address_line_1: string
  address_line_2?: string
  street_name?: string
  street_number?: string
  building_name?: string
  sub_building?: string
  town_or_city: string
  county?: string
  postcode: string
  formatted_address: string
  country?: string
}

interface PostcodeStepProps {
  value: string;
  onValueChange: (postcode: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  companyColor?: string;
  submissionId?: string;
  onAddressSelect?: (address: Address) => void;
  selectedAddress?: Address | null;
}

export default function PostcodeStep({
  value,
  onValueChange,
  onNext,
  onPrevious,
  companyColor = '#2563eb',
  submissionId,
  onAddressSelect,
  selectedAddress: propSelectedAddress
}: PostcodeStepProps) {
  const [postcode, setPostcode] = useState(value)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualAddress, setManualAddress] = useState({
    address_line_1: '',
    address_line_2: '',
    street_name: '',
    street_number: '',
    building_name: '',
    sub_building: '',
    town_or_city: '',
    county: '',
    postcode: '',
    country: 'United Kingdom'
  })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

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

  const addressItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.15,
        ease: "easeOut"
      }
    }
  };


  // Search addresses using direct Webuild API call
  const searchAddresses = async (postcode: string, isLiveSearch = false) => {
    if (!postcode.trim() || postcode.trim().length < 3) {
      setAddresses([])
      setShowDropdown(false)
      setHighlightedIndex(-1)
      return
    }

    setLoading(true)
    setError('')
    
    try {
      // Check if API key is available
      if (!process.env.NEXT_PUBLIC_WEBUILD_API_KEY) {
        console.error('NEXT_PUBLIC_WEBUILD_API_KEY is not configured')
        setError('Postcode service is not available. Please try again later.')
        setAddresses([])
        setShowDropdown(false)
        setHighlightedIndex(-1)
        return
      }

      // Clean postcode - remove spaces and convert to uppercase
      const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase()
      
      // Call postcode server directly
      const response = await fetch(`https://webuildapi.com/post-code-lookup/api/postcodes/${cleanPostcode}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WEBUILD_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.SearchEnd || !data.SearchEnd.Summaries || data.SearchEnd.Summaries.length === 0) {
        if (!isLiveSearch) {
          setError('No addresses found for this postcode. Please check and try again.')
        }
        setAddresses([])
        setShowDropdown(false)
        setHighlightedIndex(-1)
        return
      }
      
      // Transform Webuild API results to our Address format
      const addresses = data.SearchEnd.Summaries.map((summary: any) => {
        // Parse the address components
        const addressParts = summary.Address.split(', ')
        
        // Extract building number and street address
        let address_line_1 = ''
        let address_line_2 = ''
        let building_name = ''
        let sub_building = ''
        
        if (summary.Type === 'residential') {
          // For residential addresses, BuildingNumber might contain unit info
          if (summary.BuildingNumber.toLowerCase().includes('ff') || 
              summary.BuildingNumber.toLowerCase().includes('flat') ||
              summary.BuildingNumber.toLowerCase().includes('unit')) {
            sub_building = summary.BuildingNumber
            address_line_1 = summary.StreetAddress
          } else {
            address_line_1 = `${summary.BuildingNumber} ${summary.StreetAddress}`.trim()
          }
        } else {
          // For Google Places, BuildingNumber is usually the business name
          building_name = summary.BuildingNumber
          address_line_1 = summary.StreetAddress
        }

        // Extract street number if present
        const streetMatch = summary.StreetAddress.match(/^(\d+)\s+(.+)$/)
        const street_number = streetMatch ? streetMatch[1] : undefined
        const street_name = streetMatch ? streetMatch[2] : summary.StreetAddress

        // Use postcode as-is without formatting
        const formattedPostcode = summary.Postcode

        return {
          address_line_1: address_line_1.trim(),
          address_line_2: address_line_2 ? address_line_2.trim() : undefined,
          street_name: street_name || undefined,
          street_number: street_number || undefined,
          building_name: building_name || undefined,
          sub_building: sub_building || undefined,
          town_or_city: summary.Town,
          postcode: formattedPostcode,
          formatted_address: summary.Address,
          country: 'United Kingdom'
        }
      }).filter((addr: any) => 
        // Filter out results that don't have basic address info
        addr.address_line_1 && addr.town_or_city
      )
      
      if (addresses.length === 0) {
        if (!isLiveSearch) {
          setError('No addresses found for this postcode. Please check and try again.')
        }
        setAddresses([])
        setShowDropdown(false)
        setHighlightedIndex(-1)
        return
      }
      
      
      setAddresses(addresses)
      setShowDropdown(true)
      setHighlightedIndex(-1)
      // Reset refs array for new addresses
      itemRefs.current = new Array(addresses.length).fill(null)
    } catch (err) {
      console.error('Address search error:', err)
      if (!isLiveSearch) {
        setError('Failed to search addresses. Please try again.')
      }
      setAddresses([])
      setShowDropdown(false)
      setHighlightedIndex(-1)
    } finally {
      setLoading(false)
    }
  }


  // Save address data to database
  const saveAddressToDatabase = async (address: Address) => {
    if (!submissionId) {
      console.warn('No submission ID provided, skipping database save')
      return
    }

    try {
      const response = await fetch('/api/partner-leads/update-address', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId,
          addressData: address,
          progressStep: 'enquiry'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        console.log('Address saved to database successfully:', result.data)
      } else {
        console.error('Failed to save address to database:', result.error)
      }
    } catch (error) {
      console.error('Error saving address to database:', error)
    }
  }

  const handleAddressSelect = async (address: Address) => {
    setSelectedAddress(address)
    setShowDropdown(false)
    setHighlightedIndex(-1)
    setPostcode(address.postcode)
    onValueChange(address.postcode)
    
    // Call the parent component's address selection handler
    if (onAddressSelect) {
      onAddressSelect(address)
    }
    
    // Save address data to database if submissionId is available
    if (submissionId) {
      await saveAddressToDatabase(address)
    }
  }

  // Handle manual address submission
  const handleManualAddressSubmit = async () => {
    const { address_line_1, street_name, town_or_city, postcode } = manualAddress
    
    // Basic validation
    if (!address_line_1.trim() || !street_name.trim() || !town_or_city.trim() || !postcode.trim()) {
      setError('Please fill in all required fields (Address Line 1, Street Name, Town/City, and Postcode)')
      return
    }

    // Create formatted address object
    const formattedAddress: Address = {
      address_line_1: manualAddress.address_line_1.trim(),
      address_line_2: manualAddress.address_line_2.trim() || undefined,
      street_name: manualAddress.street_name.trim() || undefined,
      street_number: manualAddress.street_number.trim() || undefined,
      building_name: manualAddress.building_name.trim() || undefined,
      sub_building: manualAddress.sub_building.trim() || undefined,
      town_or_city: manualAddress.town_or_city.trim(),
      county: manualAddress.county.trim() || undefined,
      postcode: manualAddress.postcode.trim().toUpperCase(),
      country: manualAddress.country,
      formatted_address: `${manualAddress.address_line_1}${manualAddress.address_line_2 ? ', ' + manualAddress.address_line_2 : ''}, ${manualAddress.town_or_city}${manualAddress.county ? ', ' + manualAddress.county : ''}, ${manualAddress.postcode}, ${manualAddress.country}`
    }

    setSelectedAddress(formattedAddress)
    onValueChange(formattedAddress.postcode)
    setError('')
    
    // Call the parent component's address selection handler
    if (onAddressSelect) {
      onAddressSelect(formattedAddress)
    }
    
    // Save address data to database if submissionId is available
    if (submissionId) {
      await saveAddressToDatabase(formattedAddress)
    }
  }

  // Handle manual address input changes
  const handleManualInputChange = (field: string, value: string) => {
    setManualAddress(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  // Scroll highlighted item into view
  const scrollToHighlightedItem = (index: number) => {
    if (itemRefs.current[index]) {
      itemRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle addresses dropdown
    if (showDropdown && addresses.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(prev => {
            const newIndex = prev < addresses.length - 1 ? prev + 1 : 0
            setTimeout(() => scrollToHighlightedItem(newIndex), 0)
            return newIndex
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(prev => {
            const newIndex = prev > 0 ? prev - 1 : addresses.length - 1
            setTimeout(() => scrollToHighlightedItem(newIndex), 0)
            return newIndex
          })
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < addresses.length) {
            handleAddressSelect(addresses[highlightedIndex])
          }
          break
        case 'Escape':
          // Only hide dropdown if we have a selected address, otherwise keep it open
          if (selectedAddress) {
            setShowDropdown(false)
            setHighlightedIndex(-1)
            inputRef.current?.blur()
          }
          break
      }
      return
    }

    // Handle Enter key for search
    if (e.key === 'Enter') {
      e.preventDefault()
      if (postcode.trim().length >= 3) {
        searchAddresses(postcode.trim())
      }
    }
  }


  const handlePostcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPostcode(value)
    setError('')
    setSelectedAddress(null)
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // Set new timeout for live search
    const newTimeout = setTimeout(() => {
      const cleanPostcode = value.replace(/\s+/g, '').toUpperCase()
      
      if (cleanPostcode.length >= 7) {
        // Search for addresses when postcode is complete
        searchAddresses(value.trim(), true)
      } else {
        // Clear dropdown when input is too short
        setAddresses([])
        setShowDropdown(false)
        setHighlightedIndex(-1)
      }
    }, 500) // 500ms delay for live search
    
    setSearchTimeout(newTimeout)
  }

  // Handle search button click
  const handleSearchClick = () => {
    if (postcode.trim().length >= 3) {
      searchAddresses(postcode.trim())
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // For address dropdown, only hide if clicking outside AND no address is selected
      // This allows the dropdown to persist until an address is actually selected
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Don't hide the dropdown if we have addresses and no selection has been made yet
        if (addresses.length > 0 && !selectedAddress) {
          // Keep dropdown open - don't hide it
          return
        }
        // Only hide if we have a selected address or no addresses
        setShowDropdown(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      // Cleanup timeout on unmount
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout, addresses.length, selectedAddress])

  // Update state when initial values change
  useEffect(() => {
    if (value !== postcode && value !== undefined && value !== '') {
      setPostcode(value)
    }
  }, [value])

  // Update selectedAddress when prop changes (for navigation back)
  useEffect(() => {
    // Only sync from prop if it's not null and different from current state
    // This allows us to clear the state without it being immediately reset
    if (propSelectedAddress && JSON.stringify(propSelectedAddress) !== JSON.stringify(selectedAddress)) {
      setSelectedAddress(propSelectedAddress)
      setPostcode(propSelectedAddress.postcode)
    }
  }, [propSelectedAddress])

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Postcode Search */}
      {!showManualEntry && (
        <motion.div 
          className="space-y-4"
          variants={itemVariants}
        >
                    <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 mb-2 text-center">What's your Postcode?</h2>

          <div className="relative">


            <motion.input
              ref={inputRef}
              type="text"
              value={postcode}
              onChange={handlePostcodeChange}
              onKeyDown={handleKeyDown}
              placeholder="Start typing your postcode (e.g. SW1A 1AA)"
              className="w-full p-4 px-6 pr-12 bg-white text-gray-900 text-lg border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:border-transparent"
              style={{
                '--tw-ring-color': companyColor,
              } as React.CSSProperties}
              onFocus={(e) => {
                e.target.style.borderColor = companyColor;
                e.target.style.boxShadow = `0 0 0 2px ${companyColor}40`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
              maxLength={8}
              autoComplete="postal-code"
              transition={{ duration: 0.1 }}
            />
                         <div className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2">
               {loading ? (
                 <motion.div 
                   className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ duration: 0.2 }}
                 />
               ) : (
                 <motion.button
                   type="button"
                   onClick={handleSearchClick}
                   className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                   transition={{ duration: 0.1 }}
                 >
                   <Search size={20} className="text-gray-400 hover:text-gray-600" />
                 </motion.button>
               )}
             </div>
          </div>
          
          
          <AnimatePresence>
            {error && (
              <motion.p 
                className="text-red-600 text-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.1 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      )}

             {/* Address Dropdown */}
       {!showManualEntry && (
         <div className="relative" ref={dropdownRef}>
           <AnimatePresence>
             {showDropdown && addresses.length > 0 && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute top-0 left-0 right-0 z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
              >
                <div className="p-0">
                  <motion.p 
                    className="text-sm text-gray-600 px-3 py-2 border-b"
                    variants={addressItemVariants}
                  >
                    Select your address (use ↑↓ arrow keys and Enter):
                  </motion.p>
                  <div>
                    {addresses.map((address, index) => (
                      <motion.button
                        key={index}
                        ref={(el) => { itemRefs.current[index] = el }}
                        onClick={() => handleAddressSelect(address)}
                        className={`w-full text-left p-3 border-b border-gray-300 transition-colors ${
                          index === highlightedIndex 
                            ? 'border-l-2 bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        style={index === highlightedIndex ? {
                          backgroundColor: companyColor ? `${companyColor}10` : '#dbeafe',
                          borderLeftColor: companyColor || '#3b82f6'
                        } : {}}
                        variants={addressItemVariants}
                        transition={{ duration: 0.05 }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-gray-900 truncate">{address.address_line_1}</p>
                            {address.address_line_2 && (
                            <p className="text-sm text-gray-600 mb-1">{address.address_line_2}</p>
                          )}

                          <p className="text-sm text-gray-600">{address.town_or_city}</p>
                            {address.county && (
                              <>
                                <p className="text-sm text-gray-600">{address.county}</p>
                              </>
                            )}
                          </div>
                          
                          
                          {(address.building_name || address.sub_building) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {address.building_name && (
                                <span className="text-xs text-gray-600">
                                  {address.building_name}
                                </span>
                              )}
                              {address.sub_building && (
                                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                                  Unit {address.sub_building}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  
                  {addresses.length > 5 && (
                    <motion.p 
                      className="text-xs text-gray-500 px-3 py-2 border-t bg-gray-50"
                      variants={addressItemVariants}
                    >
                      Showing {addresses.length} addresses • Use arrow keys to navigate
                    </motion.p>
                  )}
                  
                  {/* Manual Entry Option */}
                  <motion.div 
                    className="border-t border-gray-200"
                    variants={addressItemVariants}
                  >
                    <motion.button
                      type="button"
                      onClick={() => setShowManualEntry(true)}
                      className="w-full text-left p-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-between"
                      transition={{ duration: 0.05 }}
                    >
                      <span>Can't find your address?</span>
                      <span className="text-blue-600 font-medium">Enter manually</span>
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Selected Address Display */}
      <AnimatePresence>
        {selectedAddress && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MapPin size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-800">Selected Address:</span>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    // Set up manual editing with current address
                    setManualAddress({
                      address_line_1: selectedAddress.address_line_1 || '',
                      address_line_2: selectedAddress.address_line_2 || '',
                      street_name: selectedAddress.street_name || '',
                      street_number: selectedAddress.street_number || '',
                      building_name: selectedAddress.building_name || '',
                      sub_building: selectedAddress.sub_building || '',
                      town_or_city: selectedAddress.town_or_city || '',
                      county: selectedAddress.county || '',
                      postcode: selectedAddress.postcode || '',
                      country: selectedAddress.country || 'United Kingdom'
                    })
                    setSelectedAddress(null)
                    setShowManualEntry(true)
                  }}
                  className="text-sm underline hover:opacity-80 transition-opacity"
                  style={{ color: companyColor || '#2563eb' }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    // Clear local state
                    setSelectedAddress(null)
                    setPostcode('')
                    setError('')
                    setShowDropdown(false)
                    setHighlightedIndex(-1)
                    setAddresses([])
                    // Notify parent to clear its state
                    onValueChange('')
                    if (onAddressSelect) {
                      onAddressSelect(null as any)
                    }
                    // Focus input after a short delay
                    setTimeout(() => {
                      inputRef.current?.focus()
                    }, 100)
                  }}
                  className="text-sm text-gray-700 hover:text-gray-800 underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-gray-900">
                <p className="font-semibold text-lg">{selectedAddress.address_line_1}</p>
                {selectedAddress.address_line_2 && (
                  <p className="text-gray-700">{selectedAddress.address_line_2}</p>
                )}
              </div>
              
              <div className="text-gray-700">
                <p>{selectedAddress.town_or_city}</p>
                {selectedAddress.county && (
                  <p className="text-sm">{selectedAddress.county}</p>
                )}
                <p className="font-medium">{selectedAddress.postcode}</p>
                {selectedAddress.country && (
                  <p className="text-sm text-gray-500">{selectedAddress.country}</p>
                )}
              </div>
              
              {(selectedAddress.building_name || selectedAddress.sub_building || selectedAddress.street_name) && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-green-800 mb-1">Additional Details:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAddress.street_name && (
                      <span className="text-xs bg-white text-gray-700 px-2 py-1 rounded border">
                        Street: {selectedAddress.street_name}
                      </span>
                    )}
                    {selectedAddress.building_name && (
                      <span className="text-xs px-2 py-1 rounded border bg-gray-50 text-gray-700" >
                        Building: {selectedAddress.building_name}
                      </span>
                    )}
                    {selectedAddress.sub_building && (
                      <span className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded border border-gray-200">
                        Unit: {selectedAddress.sub_building}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Manual Address Entry Form */}
      <AnimatePresence>
        {showManualEntry && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 p-6 bg-gray-50 rounded-lg border"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Enter your address</h3>
              <motion.button
                type="button"
                onClick={() => setShowManualEntry(false)}
                className="text-gray-400 hover:text-gray-600"
                transition={{ duration: 0.05 }}
              >
                ✕
              </motion.button>
            </div>

            <div className="space-y-3">
              {/* Street Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="street_number" className="block text-sm font-medium text-gray-700 mb-1">
                    House/Flat Number
                  </label>
                  <motion.input
                    type="text"
                    id="street_number"
                    value={manualAddress.street_number}
                    onChange={(e) => handleManualInputChange('street_number', e.target.value)}
                    placeholder="e.g. 123 or Flat 4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{
                      '--tw-ring-color': companyColor || '#3b82f6'
                    } as React.CSSProperties}
                    onFocus={(e) => {
                      e.target.style.boxShadow = `0 0 0 2px ${companyColor || '#3b82f6'}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '';
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                <div>
                  <label htmlFor="street_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Street Name *
                  </label>
                  <motion.input
                    type="text"
                    id="street_name"
                    value={manualAddress.street_name}
                    onChange={(e) => handleManualInputChange('street_name', e.target.value)}
                    placeholder="e.g. High Street"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{
                      '--tw-ring-color': companyColor || '#3b82f6'
                    } as React.CSSProperties}
                    onFocus={(e) => {
                      e.target.style.boxShadow = `0 0 0 2px ${companyColor || '#3b82f6'}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '';
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>

              {/* Building Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="building_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Building Name
                  </label>
                  <motion.input
                    type="text"
                    id="building_name"
                    value={manualAddress.building_name}
                    onChange={(e) => handleManualInputChange('building_name', e.target.value)}
                    placeholder="e.g. The Old Post Office"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{
                      '--tw-ring-color': companyColor || '#3b82f6'
                    } as React.CSSProperties}
                    onFocus={(e) => {
                      e.target.style.boxShadow = `0 0 0 2px ${companyColor || '#3b82f6'}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '';
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                <div>
                  <label htmlFor="sub_building" className="block text-sm font-medium text-gray-700 mb-1">
                    Unit/Flat Number
                  </label>
                  <motion.input
                    type="text"
                    id="sub_building"
                    value={manualAddress.sub_building}
                    onChange={(e) => handleManualInputChange('sub_building', e.target.value)}
                    placeholder="e.g. Flat 4A or Unit 12"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{
                      '--tw-ring-color': companyColor || '#3b82f6'
                    } as React.CSSProperties}
                    onFocus={(e) => {
                      e.target.style.boxShadow = `0 0 0 2px ${companyColor || '#3b82f6'}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '';
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>

              {/* Address Lines */}
              <div>
                <label htmlFor="address_line_1" className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1 *
                </label>
                <motion.input
                  type="text"
                  id="address_line_1"
                  value={manualAddress.address_line_1}
                  onChange={(e) => handleManualInputChange('address_line_1', e.target.value)}
                  placeholder="Full address line 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{
                    '--tw-ring-color': companyColor || '#3b82f6'
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    e.target.style.boxShadow = `0 0 0 2px ${companyColor || '#3b82f6'}40`;
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = '';
                  }}
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              <div>
                <label htmlFor="address_line_2" className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <motion.input
                  type="text"
                  id="address_line_2"
                  value={manualAddress.address_line_2}
                  onChange={(e) => handleManualInputChange('address_line_2', e.target.value)}
                  placeholder="Additional address information (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{
                    '--tw-ring-color': companyColor || '#3b82f6'
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    e.target.style.boxShadow = `0 0 0 2px ${companyColor || '#3b82f6'}40`;
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = '';
                  }}
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              {/* City and County */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="town_or_city" className="block text-sm font-medium text-gray-700 mb-1">
                    Town/City *
                  </label>
                  <motion.input
                    type="text"
                    id="town_or_city"
                    value={manualAddress.town_or_city}
                    onChange={(e) => handleManualInputChange('town_or_city', e.target.value)}
                    placeholder="Town or city"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{
                      '--tw-ring-color': companyColor || '#3b82f6'
                    } as React.CSSProperties}
                    onFocus={(e) => {
                      e.target.style.boxShadow = `0 0 0 2px ${companyColor || '#3b82f6'}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '';
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                <div>
                  <label htmlFor="county" className="block text-sm font-medium text-gray-700 mb-1">
                    County
                  </label>
                  <motion.input
                    type="text"
                    id="county"
                    value={manualAddress.county}
                    onChange={(e) => handleManualInputChange('county', e.target.value)}
                    placeholder="County (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{
                      '--tw-ring-color': companyColor || '#3b82f6'
                    } as React.CSSProperties}
                    onFocus={(e) => {
                      e.target.style.boxShadow = `0 0 0 2px ${companyColor || '#3b82f6'}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '';
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>

              {/* Postcode and Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="manual_postcode" className="block text-sm font-medium text-gray-700 mb-1">
                    Postcode *
                  </label>
                  <motion.input
                    type="text"
                    id="manual_postcode"
                    value={manualAddress.postcode}
                    onChange={(e) => handleManualInputChange('postcode', e.target.value.toUpperCase())}
                    placeholder="Postcode"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    transition={{ duration: 0.1 }}
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <motion.select
                    id="country"
                    value={manualAddress.country}
                    onChange={(e) => handleManualInputChange('country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    transition={{ duration: 0.1 }}
                  >
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Ireland">Ireland</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                  </motion.select>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.1 }}
                  className="text-red-600 text-sm"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex space-x-3 pt-2">
              <motion.button
                type="button"
                onClick={() => setShowManualEntry(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                transition={{ duration: 0.05 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="button"
                onClick={handleManualAddressSubmit}
                className="flex-1 px-4 py-2 text-white rounded-md hover:opacity-90 transition-colors"
                style={{ backgroundColor: companyColor }}
                transition={{ duration: 0.05 }}
              >
                Use this address
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      <motion.div 
        className="flex justify-center pt-6 max-w-md mx-auto"
        variants={itemVariants}
      >
        <motion.button
          type="button"
          onClick={() => {
            if (selectedAddress) {
              onNext()
            } else {
              setError('Please select an address to continue')
            }
          }}
          disabled={!selectedAddress}
          className={`px-6 py-2 rounded-md transition-colors ${
            selectedAddress
              ? 'text-white hover:opacity-90'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          style={selectedAddress ? { backgroundColor: companyColor } : {}}
          transition={{ duration: 0.05 }}
        >
          Next
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
