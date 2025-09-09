// components/QuoteForm/PostcodeStep.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PostcodeStepProps {
  value: string;
  onValueChange: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function PostcodeStep({
  value,
  onValueChange,
  onNext,
  onPrevious
}: PostcodeStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // Format postcode with a space in the middle (e.g., "SW1A 1AA")
  const formatPostcode = (input: string) => {
    // Remove existing spaces
    let postcode = input.replace(/\s/g, '').toUpperCase();
    
    // Format with space if long enough
    if (postcode.length > 3) {
      const inwardCode = postcode.substring(postcode.length - 3);
      const outwardCode = postcode.substring(0, postcode.length - 3);
      postcode = `${outwardCode} ${inwardCode}`;
    }
    
    return postcode;
  };
  
  const validatePostcode = () => {
    if (!value || value.trim() === '') {
      setError('Please enter your postcode');
      return false;
    }
    
    // Basic UK postcode validation
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
    
    if (!postcodeRegex.test(value)) {
      setError('Please enter a valid UK postcode');
      return false;
    }
    
    setError(null);
    return true;
  };
  
  const handleNext = () => {
    setIsValidating(true);
    
    // Simulate checking a service availability API
    setTimeout(() => {
      if (validatePostcode()) {
        onNext();
      }
      setIsValidating(false);
    }, 600);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPostcode(e.target.value);
    onValueChange(formatted);
    
    if (error) setError(null);
    setIsTyping(true);
    
    // Clear typing indicator after short delay
    setTimeout(() => setIsTyping(false), 1000);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="">
        <div className="text-center mb-8">
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="text-2xl font-semibold text-gray-800 mb-2"
          >
            What is your postcode?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.2 }}
            className="text-gray-600"
          >
            We need this to check if our service is available in your area
          </motion.p>
        </div>
        
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            
            <input
              type="text"
              value={value}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleNext()}
              placeholder="e.g. SW1A 1AA"
              className="block w-full pl-10 pr-12 py-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
            
            {/* Status indicator */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-5 h-5 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"
                ></motion.div>
              )}
              
              {!isTyping && value && !error && (
                <motion.svg
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
                </motion.svg>
              )}
            </div>
            
            {/* Progress bar for input length */}
            <div className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-full transition-all duration-300" style={{ 
              width: value ? `${Math.min((value.length / 8) * 100, 100)}%` : '0%' 
            }}></div>
          </div>
          
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-center text-sm text-red-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </motion.p>
          )}
          
          {/* Helpful tip */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.2 }}
            className="mt-3 text-xs text-gray-500"
          >
            For example: SW1A 1AA for Buckingham Palace, E1 6AN for Tower of London
          </motion.p>
        </div>
        
        <div className="flex justify-between max-w-md mx-auto">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onPrevious}
            className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all duration-200 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleNext}
            disabled={isValidating}
            className={`px-6 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all duration-200 flex items-center ${
              isValidating ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isValidating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking...
              </>
            ) : (
              <>
                Next
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}