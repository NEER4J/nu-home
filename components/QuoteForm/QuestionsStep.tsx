// components/QuoteForm/QuestionsStep.tsx
import { useState, useEffect } from 'react';
import { FormQuestion } from '@/types/database.types';
import Image from 'next/image';

interface QuestionsStepProps {
  questions: FormQuestion[];
  formValues: any;
  onValueChange: (questionId: string, value: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  showPrevious: boolean;
}

export default function QuestionsStep({
  questions,
  formValues,
  onValueChange,
  onNext,
  onPrevious,
  showPrevious
}: QuestionsStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Handle multiple choice selection and auto proceed to next question
  const handleMultipleChoiceSelection = (questionId: string, option: string | { text: string; image: string }, allowMultiple: boolean) => {
    // Ensure questionId is valid
    if (!questionId || questionId === 'undefined') {
      console.error('Invalid question ID in selection handler:', questionId);
      return;
    }
    
    // Get option value (handle both string and object formats)
    const optionValue = typeof option === 'object' && option !== null ? option.text : String(option);
    
    if (allowMultiple) {
      // If the question allows multiple selections
      const currentValues = Array.isArray(formValues[questionId]) 
        ? [...formValues[questionId]] 
        : formValues[questionId] ? [formValues[questionId]] : [];
      
      if (currentValues.includes(optionValue)) {
        // Remove if already selected
        const newValues = currentValues.filter(val => val !== optionValue);
        // Store as string with comma separator if there are multiple values
        const formattedValue = newValues.length > 0 ? newValues.join(', ') : '';
        onValueChange(questionId, formattedValue);
      } else {
        // Add if not selected
        const newValues = [...currentValues, optionValue];
        // Join multiple values with comma separator
        const formattedValue = newValues.join(', ');
        onValueChange(questionId, formattedValue);
      }
    } else {
      // Single selection - just use the option text
      onValueChange(questionId, optionValue);
      
      // Automatically proceed to next question for single-choice selections
      onNext();
    }
  };
  
  // Handle text input change and check for Enter key press
  const handleTextInputChange = (questionId: string, value: string) => {
    onValueChange(questionId, value);
  };
  
  const handleTextInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateResponses() && onNext();
    }
  };
  
  // Validate responses before proceeding
  const validateResponses = () => {
    const newErrors: Record<string, string> = {};
    
    questions.forEach(question => {
      if (question.is_required && !formValues[question.question_id]) {
        newErrors[question.question_id] = 'This field is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Check if an option is selected in a multi-select question
  const isOptionSelected = (questionId: string, optionText: string, allowMultiple: boolean) => {
    const currentValue = formValues[questionId];
    
    if (!currentValue) return false;
    
    if (allowMultiple) {
      // For multiple selections, check if the option exists in the comma-separated string
      const selectedOptions = currentValue.split(', ');
      return selectedOptions.includes(optionText);
    } else {
      // For single selection, direct comparison
      return currentValue === optionText;
    }
  };
  
  return (
    <div>
      {questions.map(question => {
        // Determine if multiple selections are allowed
        const allowMultipleSelections = question.is_multiple_choice && question.allow_multiple_selections;
        
        return (
          <div key={question.question_id} className="mb-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </h2>
            
            {question.is_multiple_choice ? (
              <div className={`grid ${question.answer_options && question.answer_options.length > 2 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} gap-6 max-w-2xl mx-auto`}>
                {question.answer_options?.map((option: any, idx) => {
                    // Handle both old and new data formats with explicit typing
                    const isOptionObject = typeof option === 'object' && option !== null;
                    const optionText = isOptionObject ? (option as any).text : option as string;
                    const optionImage = isOptionObject 
                      ? (option as any).image 
                      : (question.answer_images && question.answer_images[idx]);
                  
                  // Check if this option is selected
                  const isSelected = isOptionSelected(question.question_id, optionText, !!allowMultipleSelections);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`
                        bg-white p-6 rounded-lg shadow-md border ${isSelected 
                          ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' 
                          : 'border-gray-200 hover:border-blue-300'} 
                        cursor-pointer transition-all hover:shadow-lg text-center
                      `}
                      onClick={() => handleMultipleChoiceSelection(question.question_id, option, !!allowMultipleSelections)}
                    >
                      <div className="flex flex-col items-center">
                        {optionImage && (
                          <div className="">
                            <img 
                              src={optionImage}
                              alt={optionText}
                              width={200}
                              height={200}
                              className="w-[140px] h-[140px]"
                            />
                          </div>
                        )}
                        <div className="flex items-center">
                          {allowMultipleSelections && (
                            <div className={`w-5 h-5 mr-2 border rounded flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                              {isSelected && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          )}
                          <span className="font-medium text-lg">{optionText}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="max-w-xl mx-auto">
                <input
                  type="text"
                  value={formValues[question.question_id] || ''}
                  onChange={(e) => handleTextInputChange(question.question_id, e.target.value)}
                  onKeyPress={handleTextInputKeyPress}
                  className="mt-1 block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your answer"
                />
              </div>
            )}
            
            {errors[question.question_id] && (
              <p className="mt-4 text-sm text-red-600 text-center">
                {errors[question.question_id]}
              </p>
            )}
            
            {question.has_helper_video && question.helper_video_url && (
              <div className="mt-4 text-center">
                <a 
                  href={question.helper_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center justify-center"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Watch helper video
                </a>
              </div>
            )}
          </div>
        );
      })}
      
      <div className="mt-8 flex justify-between max-w-md mx-auto">
        {showPrevious && (
          <button
            type="button"
            onClick={onPrevious}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back
          </button>
        )}
        
        {/* Next button only shown for text input questions or multiple-selection questions */}
        {questions.some(q => !q.is_multiple_choice || (q.is_multiple_choice && q.allow_multiple_selections)) && (
          <button
            type="button"
            onClick={() => validateResponses() && onNext()}
            className={`px-6 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 ${!showPrevious ? 'ml-auto' : ''}`}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}