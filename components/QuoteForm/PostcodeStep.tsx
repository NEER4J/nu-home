// components/QuoteForm/PostcodeStep.tsx
import { useState } from 'react';

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
  
  const validatePostcode = () => {
    if (!value || value.trim() === '') {
      setError('Please enter your postcode');
      return false;
    }
    
    // Basic UK postcode validation
    // This is a simplified regex and may need to be adjusted for specific requirements
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
    
    if (!postcodeRegex.test(value)) {
      setError('Please enter a valid UK postcode');
      return false;
    }
    
    setError(null);
    return true;
  };
  
  const handleNext = () => {
    if (validatePostcode()) {
      onNext();
    }
  };
  
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">What is your postcode?</h2>
        <p className="text-gray-600">We need this to check if our service is available in your area</p>
      </div>
      
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onValueChange(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. SW1A 1AA"
            className="block w-full px-4 py-3 text-lg border border-gray-300 rounded-md -sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
      
      <div className="flex justify-between max-w-md mx-auto">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Previous
        </button>
        
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}