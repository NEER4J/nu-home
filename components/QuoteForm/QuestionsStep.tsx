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
  
  // Check if a question should be displayed based on conditional logic
  const shouldDisplayQuestion = (question: FormQuestion): boolean => {
    if (!question.conditional_display) return true;
    
    const { dependent_on_question_id, show_when_answer_equals, logical_operator } = question.conditional_display;
    const dependentAnswer = formValues[dependent_on_question_id];
    
    if (!dependentAnswer) return false;
    
    if (logical_operator === 'OR') {
      return show_when_answer_equals.includes(dependentAnswer);
    } else {
      // AND logic
      return show_when_answer_equals.every(value => {
        if (Array.isArray(dependentAnswer)) {
          return dependentAnswer.includes(value);
        }
        return dependentAnswer === value;
      });
    }
  };
  
  // Handle multiple choice selection
  const handleMultipleChoiceSelection = (questionId: string, option: string, allowMultiple: boolean) => {
    if (allowMultiple) {
      // If the question allows multiple selections
      const currentValues = Array.isArray(formValues[questionId]) 
        ? [...formValues[questionId]] 
        : formValues[questionId] ? [formValues[questionId]] : [];
      
      if (currentValues.includes(option)) {
        // Remove if already selected
        onValueChange(questionId, currentValues.filter(val => val !== option));
      } else {
        // Add if not selected
        onValueChange(questionId, [...currentValues, option]);
      }
    } else {
      // Single selection (traditional radio button behavior)
      onValueChange(questionId, option);
    }
  };
  
  // Validate responses before proceeding
  const validateResponses = () => {
    const newErrors: Record<string, string> = {};
    
    questions.forEach(question => {
      if (shouldDisplayQuestion(question) && question.is_required && !formValues[question.question_id]) {
        newErrors[question.question_id] = 'This field is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateResponses()) {
      onNext();
    }
  };
  
  return (
    <div>
      {questions.map(question => {
        // Skip questions that shouldn't be displayed based on conditional logic
        if (!shouldDisplayQuestion(question)) return null;
        
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
                {question.answer_options?.map((option, idx) => {
                  const hasImage = question.answer_images && question.answer_images[idx];
                  
                  // Check if this option is selected
                  const isSelected = allowMultipleSelections
                    ? Array.isArray(formValues[question.question_id]) 
                      ? formValues[question.question_id]?.includes(option)
                      : formValues[question.question_id] === option
                    : formValues[question.question_id] === option;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`
                        bg-white p-6 rounded-lg shadow-md border ${isSelected 
                          ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' 
                          : 'border-gray-200 hover:border-blue-300'} 
                        cursor-pointer transition-all hover:shadow-lg text-center
                      `}
                      onClick={() => handleMultipleChoiceSelection(question.question_id, option, allowMultipleSelections)}
                    >
                      <div className="flex flex-col items-center">
                        {hasImage && (
                          <div className="mb-4 p-4">
                            <img 
                              src={question.answer_images![idx]}
                              alt={option}
                              width={60}
                              height={60}
                              className="w-auto h-12"
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
                          <span className="font-medium text-lg">{option}</span>
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
                  onChange={(e) => onValueChange(question.question_id, e.target.value)}
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
            Previous
          </button>
        )}
        
        <button
          type="button"
          onClick={handleNext}
          className={`px-6 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 ${!showPrevious ? 'ml-auto' : ''}`}
        >
          Next
        </button>
      </div>
    </div>
  );
}