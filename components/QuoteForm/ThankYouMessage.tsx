// components/QuoteForm/ThankYouMessage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ThankYouMessageProps {
  submissionId: string;
  firstName: string;
  serviceCategoryName: string;
  redirectToProducts: boolean;
  productRedirectUrl?: string;
  postcode: string;
  email: string;
}

export default function ThankYouMessage({
  submissionId,
  firstName,
  serviceCategoryName,
  redirectToProducts,
  productRedirectUrl,
  postcode,
  email
}: ThankYouMessageProps) {
  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Format the service category name for display
  const formattedCategory = serviceCategoryName
    ? serviceCategoryName.replace(/-/g, ' ')
    : 'our service';
  
  // Auto-redirect if enabled
  useEffect(() => {
    if (redirectToProducts && productRedirectUrl) {
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        window.location.href = productRedirectUrl;
      }, 5000);
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [redirectToProducts, productRedirectUrl]);
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="bg-white rounded-lg border border-gray-100">
        <div className="bg-green-500 h-1"></div>
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Thank You, {firstName}!
            </h2>
            
            <p className="text-base font-medium text-gray-600 mb-6">
              Your {formattedCategory} quote request has been submitted
            </p>
            
            <div className="border border-blue-100 bg-blue-50 p-4 rounded-md mb-5 w-full max-w-3xl">
              <p className="text-blue-800 font-medium text-sm">
                Reference Number
              </p>
              <p className="font-mono text-blue-700 text-lg mt-1">{submissionId}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mb-6">
              <div className="border border-gray-100 bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="text-gray-700 font-medium">{email}</p>
              </div>
              
              <div className="border border-gray-100 bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500 mb-1">Location</p>
                <p className="text-gray-700 font-medium">{postcode}</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6 max-w-lg text-sm">
              Our team will review your requirements and get back to you within 24-48 hours with a personalized quote 
              for your {formattedCategory} project.
            </p>
            
            {redirectToProducts && productRedirectUrl && (
              <div className="mb-6 w-full max-w-sm">
                {!isRedirecting ? (
                  <div className="text-center">
                    <p className="text-gray-600 text-sm mb-2">
                      Redirecting to recommended products in {countdown} seconds...
                    </p>
                    <div className="w-full bg-gray-100 rounded-full h-1 mb-4">
                      <div 
                        className="bg-blue-500 h-1 rounded-full transition-all duration-1000" 
                        style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                    <p className="text-blue-600 text-sm">Redirecting...</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex flex-wrap gap-3 justify-center">
              {redirectToProducts && productRedirectUrl && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setIsRedirecting(true);
                    window.location.href = productRedirectUrl;
                  }}
                  className="px-5 py-2 bg-blue-500 text-white rounded-md border border-blue-500 hover:bg-blue-600 transition-colors duration-200 flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  View Recommended Products
                </motion.button>
              )}
              
              <motion.a
                href="/"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="px-5 py-2 bg-white text-gray-700 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors duration-200 flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Return to Home
              </motion.a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeline section */}
      <div className="mt-6 bg-white rounded-lg border border-gray-100 p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-5">What happens next</h3>
        
        <div className="space-y-5">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center mr-3 mt-0.5">
              <span className="text-blue-600 font-medium text-xs">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 text-sm">Quote Preparation</h4>
              <p className="text-gray-500 text-sm mt-1">Our team will analyze your requirements and prepare a Customised quote.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center mr-3 mt-0.5">
              <span className="text-blue-600 font-medium text-xs">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 text-sm">Contact</h4>
              <p className="text-gray-500 text-sm mt-1">A representative will contact you within 24-48 hours to discuss your quote.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center mr-3 mt-0.5">
              <span className="text-blue-600 font-medium text-xs">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 text-sm">Confirmation</h4>
              <p className="text-gray-500 text-sm mt-1">Once you're happy with the quote, we'll schedule your installation or service.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}