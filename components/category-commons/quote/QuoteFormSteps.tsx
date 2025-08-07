'use client';

import { useState } from 'react';
import { FormQuestion } from '@/types/database.types';

interface QuoteFormStepsProps {
  questions: FormQuestion[];
  formValues: Record<string, any>;
  onValueChange: (questionId: string, value: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  showPrevious: boolean;
}

export default function QuoteFormSteps({
  questions,
  formValues,
  onValueChange,
  onNext,
  onPrevious,
  showPrevious
}: QuoteFormStepsProps) {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const validateStep = () => {
    const errors: Record<string, string> = {};
    
    questions.forEach(question => {
      if (question.is_required) {
        const value = formValues[question.question_id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          errors[question.question_id] = 'This field is required';
        }
      }
    });
    
    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      onNext();
    }
  };

  const renderQuestionField = (question: FormQuestion) => {
    const value = formValues[question.question_id] || '';
    const hasError = localErrors[question.question_id];

    if (question.is_multiple_choice && question.answer_options) {
      const options = Array.isArray(question.answer_options) 
        ? question.answer_options 
        : [];

      if (question.allow_multiple_selections) {
        // Multiple selection (checkboxes)
        const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
        
        return (
          <div className="space-y-3">
            {options.map((option: any, index: number) => {
              // Handle both string and object formats
              const optionText = typeof option === 'object' && option !== null ? option.text || option : option;
              const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
              
              return (
                <label key={index} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(optionText)}
                    onChange={(e) => {
                      let newValues;
                      if (e.target.checked) {
                        newValues = [...selectedValues, optionText];
                      } else {
                        newValues = selectedValues.filter((v: string) => v !== optionText);
                      }
                      onValueChange(question.question_id, newValues);
                      
                      // Clear error when user makes a selection
                      if (hasError) {
                        setLocalErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors[question.question_id];
                          return newErrors;
                        });
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">{optionText}</span>
                </label>
              );
            })}
          </div>
        );
      } else {
        // Single selection (radio buttons)
        return (
          <div className="space-y-3">
            {options.map((option: any, index: number) => {
              // Handle both string and object formats
              const optionText = typeof option === 'object' && option !== null ? option.text || option : option;
              
              return (
                <label key={index} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name={question.question_id}
                    value={optionText}
                    checked={value === optionText}
                    onChange={(e) => {
                      onValueChange(question.question_id, e.target.value);
                      
                      // Clear error when user makes a selection
                      if (hasError) {
                        setLocalErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors[question.question_id];
                          return newErrors;
                        });
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-gray-700">{optionText}</span>
                </label>
              );
            })}
          </div>
        );
      }
    } else {
      // Text input
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onValueChange(question.question_id, e.target.value);
            
            // Clear error when user starts typing
            if (hasError) {
              setLocalErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[question.question_id];
                return newErrors;
              });
            }
          }}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasError ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your answer..."
        />
      );
    }
  };

  return (
    <div className="space-y-8">
      {questions.map((question) => (
        <div key={question.question_id} className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            
            {renderQuestionField(question)}
            
            {localErrors[question.question_id] && (
              <p className="text-red-500 text-sm mt-1">
                {localErrors[question.question_id]}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-6">
        {showPrevious ? (
          <button
            type="button"
            onClick={onPrevious}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
        ) : (
          <div></div>
        )}
        
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
