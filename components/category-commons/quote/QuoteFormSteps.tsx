'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormQuestion } from '@/types/database.types';
import { Check, DollarSign } from 'lucide-react';

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
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }
  };

  const questionVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  const questionTextVariants = {
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

  const optionsContainerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  const optionVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut",
        delay: 0.1
      }
    }
  };

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
          <motion.div 
            className="space-y-3"
            variants={optionsContainerVariants}
          >
            {options.map((option: any, index: number) => {
              const optionText = typeof option === 'object' && option !== null ? option.text || option : option;
              const hasAdditionalCost = typeof option === 'object' && option !== null ? option.hasAdditionalCost || false : false;
              const additionalCost = typeof option === 'object' && option !== null ? option.additionalCost || 0 : 0;
              const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
              
              return (
                <motion.label 
                  key={index} 
                  className="flex items-center space-x-3 cursor-pointer"
                  variants={optionVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
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
                  <div className="flex-1">
                    <span className="text-gray-700">{optionText}</span>
                    {hasAdditionalCost && (
                      <div className="flex items-center mt-1 text-sm text-blue-600">
                        <DollarSign size={12} className="mr-1" />
                        <span>+£{additionalCost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </motion.label>
              );
            })}
          </motion.div>
        );
      } else {
        // Single selection with custom button layouts
        return (
          <motion.div 
            className="space-y-4 sm:space-y-6"
            variants={optionsContainerVariants}
          >
            {/* Check if any option has an image to determine layout */}
            {options.some((option: any) => typeof option === 'object' && option?.image) ? (
              // Grid layout for options with images
              <motion.div 
                className="flex md:flex-wrap flex-col md:flex-row justify-center gap-3 max-w-5xl mx-auto"
                variants={optionsContainerVariants}
              >
                {options.map((option: any, index: number) => {
                  const optionText = typeof option === 'object' && option !== null ? option.text || option : option;
                  const optionImage = typeof option === 'object' && option !== null ? option.image : null;
                  const hasAdditionalCost = typeof option === 'object' && option !== null ? option.hasAdditionalCost || false : false;
                  const additionalCost = typeof option === 'object' && option !== null ? option.additionalCost || 0 : 0;
                  const isSelected = value === optionText;
                  
                  return (
                    <motion.button
                      key={index}
                      onClick={() => handleOptionSelect(question.question_id, optionText)}
                      className={`relative md:p-6 py-2 px-4 md:rounded-2xl rounded-full text-center group w-full h-auto sm:w-44 sm:h-44 flex md:flex-col flex-row items-center md:justify-center justify-start border-2 border-none gap-2 md:gap-0 ${
                        isSelected
                          ? 'text-white shadow-lg scale-105'
                          : 'bg-white text-black hover:shadow-sm border border-gray-200'
                      }`}
                      style={isSelected ? { 
                        backgroundColor: companyColor,
                        borderColor: companyColor
                      } : {
                        backgroundColor: 'white'
                      }}
                      variants={optionVariants}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.99 }}
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
                        <div className="mb-0">
                          <img 
                            src={optionImage} 
                            alt={optionText}
                            className={`w-10 h-10 md:w-32 md:h-32 object-contain mx-auto md:mt-[-20px]  ${
                              isSelected ? 'filter invert brightness-0' : ''
                            }`}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Option Text */}
                      <span className="text-base font-medium text-center leading-tight">{optionText}</span>
                      
                      {/* Additional Cost Badge */}
                      {hasAdditionalCost && additionalCost > 0 && (
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                          isSelected 
                            ? 'bg-white text-blue-600' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          <div className="flex items-center">
                            <span>+£{additionalCost.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : (
              // List layout for options without images
              <motion.div 
                className="space-y-3 sm:space-y-4 max-w-md mx-auto"
                variants={optionsContainerVariants}
              >
                {options.map((option: any, index: number) => {
                  const optionText = typeof option === 'object' && option !== null ? option.text || option : option;
                  const hasAdditionalCost = typeof option === 'object' && option !== null ? option.hasAdditionalCost || false : false;
                  const additionalCost = typeof option === 'object' && option !== null ? option.additionalCost || 0 : 0;
                  const isSelected = value === optionText;
                  
                  return (
                    <motion.button
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
                      variants={optionVariants}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
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
                        
                        {/* Option Text and Cost */}
                        <div className="flex-1">
                          <span className="text-base sm:text-lg font-medium">{optionText}</span>
                          {hasAdditionalCost && (
                            <div className={`flex items-center mt-1 text-sm ${
                              isSelected ? 'text-white' : 'text-blue-600'
                            }`}>
                              <DollarSign size={12} className="mr-1" />
                              <span>+£{additionalCost.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        );
      }
    } else {
      // Text input
      return (
        <motion.div 
          className="space-y-4 sm:space-y-6 max-w-md mx-auto"
          variants={optionsContainerVariants}
        >
          <motion.input
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
            variants={optionVariants}
            whileFocus={{ scale: 1.02 }}
          />
          
          <AnimatePresence>
            {value.trim() && (
              <motion.button
                onClick={handleNext}
                className="w-full py-3 rounded-lg font-medium text-white"
                style={{ backgroundColor: companyColor }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
              >
                Continue
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      );
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {questions.map((question, index) => (
          <motion.div
            key={question.question_id}
            className="space-y-4"
            variants={questionVariants}
          >
            <div>
              {/* Question Text Animation */}
              <motion.div
                className="mb-6 text-center"
                variants={questionTextVariants}
              >
                <h2 className="text-xl sm:text-3xl font-semibold text-gray-800 mb-2">
                  {question.question_text}
                </h2>
                {question.helper_text && (
                  <p className="text-gray-600 text-sm sm:text-base">
                    {question.helper_text}
                  </p>
                )}
              </motion.div>
              
              {renderQuestionField(question)}
              
              <AnimatePresence>
                {localErrors[question.question_id] && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.1 }}
                    className="text-red-500 text-sm mt-1"
                  >
                    {localErrors[question.question_id]}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}

        {/* Navigation buttons - only show for non-auto-advancing questions */}
        {questions.some(q => !q.is_multiple_choice || q.allow_multiple_selections) && (
          <motion.div
            className="flex justify-between pt-6"
            variants={buttonVariants}
          >
            {showPrevious ? (
              <motion.button
                type="button"
                onClick={onPrevious}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.05 }}
              >
                Previous
              </motion.button>
            ) : (
              <div></div>
            )}
            
            <motion.button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 text-white rounded-md"
              style={{ backgroundColor: companyColor }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.05 }}
            >
              Next
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
