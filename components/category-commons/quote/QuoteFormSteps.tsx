'use client';

import { useState } from 'react';
import { FormQuestion } from '@/types/database.types';
import { Check } from 'lucide-react';

interface QuoteFormStepsProps {
  questions: FormQuestion[];
  formValues: Record<string, any>;
  onValueChange: (questionId: string, value: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  showPrevious: boolean;
  companyColor?: string;
  currentStep: number;
  totalSteps: number;
}

export default function QuoteFormSteps({
  questions,
  formValues,
  onValueChange,
  onNext,
  onPrevious,
  showPrevious,
  companyColor = '#2563eb',
  currentStep,
  totalSteps
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

  const handleOptionSelect = (questionId: string, value: any) => {
    onValueChange(questionId, value);
    onNext(); // Auto-advance after selection
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
        // Single selection with custom button layouts
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Check if any option has an image to determine layout */}
            {options.some((option: any) => typeof option === 'object' && option?.image) ? (
              // Grid layout for options with images
              <div className="flex flex-wrap justify-center gap-4 max-w-5xl mx-auto">
                {options.map((option: any, index: number) => {
                  const optionText = typeof option === 'object' && option !== null ? option.text || option : option;
                  const optionImage = typeof option === 'object' && option !== null ? option.image : null;
                  const isSelected = value === optionText;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleOptionSelect(question.question_id, optionText)}
                      className={`relative p-6 rounded-2xl text-center group w-40 h-40 sm:w-44 sm:h-44 flex flex-col items-center justify-center ${
                        isSelected
                          ? 'text-white shadow-lg scale-105'
                          : 'bg-white text-black hover:shadow-md border border-gray-200'
                      }`}
                      style={isSelected ? { 
                        backgroundColor: companyColor,
                        borderColor: companyColor
                      } : {
                        backgroundColor: 'white'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = companyColor + '10';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      {/* Option Image */}
                      {optionImage && (
                        <div className="mb-4">
                          <img 
                            src={optionImage} 
                            alt={optionText}
                            className={`w-16 h-16 sm:w-24 sm:h-24 object-contain mx-auto ${
                              isSelected ? 'filter invert brightness-0' : ''
                            }`}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Option Text */}
                      <span className="text-sm sm:text-base font-medium text-center leading-tight">{optionText}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              // List layout for options without images
              <div className="space-y-3 sm:space-y-4 max-w-md mx-auto">
                {options.map((option: any, index: number) => {
                  const optionText = typeof option === 'object' && option !== null ? option.text || option : option;
                  const isSelected = value === optionText;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleOptionSelect(question.question_id, optionText)}
                      className={`w-full p-4 sm:p-4 rounded-full text-left group ${
                        isSelected
                          ? 'text-white'
                          : 'bg-white text-black hover:text-white'
                      }`}
                      style={isSelected ? { 
                        backgroundColor: companyColor
                      } : {
                        backgroundColor: 'white'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = companyColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        {/* Selection Indicator */}
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                          isSelected
                            ? 'bg-white'
                            : 'bg-gray-200 group-hover:bg-white'
                        }`}>
                          {isSelected ? (
                            <Check size={10} className="sm:w-3 sm:h-3" style={{ color: companyColor }} />
                          ) : (
                            <>
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full group-hover:hidden" />
                              <Check size={16} className="sm:w-5 sm:h-5 hidden group-hover:block" style={{ color: companyColor }} strokeWidth={3} />
                            </>
                          )}
                        </div>
                        
                        {/* Option Text */}
                        <span className="text-base sm:text-lg font-medium flex-1">{optionText}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
    } else {
      // Text input
      return (
        <div className="space-y-4 sm:space-y-6 max-w-md mx-auto">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onValueChange(question.question_id, e.target.value);
              
              if (hasError) {
                setLocalErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors[question.question_id];
                  return newErrors;
                });
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && value.trim()) {
                handleNext();
              }
            }}
            className={`w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-lg ${
              hasError ? 'border-red-500' : ''
            }`}
            style={{
              '--tw-ring-color': companyColor,
              focusRingColor: companyColor
            } as React.CSSProperties}
            onFocus={(e) => {
              e.target.style.borderColor = companyColor;
              e.target.style.boxShadow = `0 0 0 2px ${companyColor}40`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = hasError ? '#ef4444' : '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="Enter your answer..."
          />
          
          {value.trim() && (
            <button
              onClick={handleNext}
              className="w-full py-3 rounded-lg font-medium text-white"
              style={{ backgroundColor: companyColor }}
            >
              Continue
            </button>
          )}
        </div>
      );
    }
  };

  return (
    <div className="space-y-8">
      {questions.map((question) => (
        <div key={question.question_id} className="space-y-4">
          <div>
         
            
            {renderQuestionField(question)}
            
            {localErrors[question.question_id] && (
              <p className="text-red-500 text-sm mt-1">
                {localErrors[question.question_id]}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Navigation buttons - only show for non-auto-advancing questions */}
      {questions.some(q => !q.is_multiple_choice || q.allow_multiple_selections) && (
        <div className="flex justify-between pt-6">
          {showPrevious ? (
            <button
              type="button"
              onClick={onPrevious}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Previous
            </button>
          ) : (
            <div></div>
          )}
          
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2 text-white rounded-md"
            style={{ backgroundColor: companyColor }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
