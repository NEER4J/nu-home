// components/admin/ConditionalLogic.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { FormQuestion } from '@/types/database.types';

interface ConditionalLogicProps {
  showConditionalLogic: boolean;
  setShowConditionalLogic: (show: boolean) => void;
  availableQuestions: FormQuestion[];
  selectedQuestion: FormQuestion | null;
  conditionalValues: string[];
  setConditionalValues: (values: string[]) => void;
  register: any; // React Hook Form's register function
  errors: any; // React Hook Form's errors object
  stepNumber: number;
  selectedCategoryId: string;
}

export default function ConditionalLogic({
  showConditionalLogic,
  setShowConditionalLogic,
  availableQuestions,
  selectedQuestion,
  conditionalValues,
  setConditionalValues,
  register,
  errors,
  stepNumber,
  selectedCategoryId
}: ConditionalLogicProps) {
  const [availableOptions, setAvailableOptions] = useState<any[]>([]);
  
  // Update available options when selected question changes
  useEffect(() => {
    if (!selectedQuestion || !selectedQuestion.is_multiple_choice) {
      setAvailableOptions([]);
      return;
    }
    
    // Extract options from the selected question
    try {
      let options: string[] = [];
      
      if (selectedQuestion.answer_options) {
        if (Array.isArray(selectedQuestion.answer_options)) {
          // Handle different formats of answer_options
          if (typeof selectedQuestion.answer_options[0] === 'string') {
            // Format: ["Option 1", "Option 2", ...]
            options = selectedQuestion.answer_options as string[];
          } else if (typeof selectedQuestion.answer_options[0] === 'object') {
            // Format: [{ text: "Option 1", ... }, { text: "Option 2", ... }, ...]
            options = (selectedQuestion.answer_options as any[]).map(opt => 
              typeof opt === 'object' && opt !== null && 'text' in opt ? opt.text : ''
            ).filter(Boolean);
          }
        }
      }
      
      setAvailableOptions(options);
    } catch (error) {
      console.error('Error parsing question options:', error);
      setAvailableOptions([]);
    }
  }, [selectedQuestion]);
  
  // Handle checkbox selection changes
  const handleOptionChange = (option: string) => {
    if (conditionalValues.includes(option)) {
      // Remove from selection
      setConditionalValues(conditionalValues.filter(val => val !== option));
    } else {
      // Add to selection
      setConditionalValues([...conditionalValues, option]);
    }
  };
  
  return (
    <div className="space-y-6 pt-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900">Conditional Display</h3>
        <p className="mt-1 text-sm text-gray-500">
          Optionally show this question based on the answer to a previous question.
        </p>
      </div>
      
      <div className="flex items-start mb-4">
        <div className="flex items-center h-5">
          <input
            id="show_conditional_logic"
            type="checkbox"
            checked={showConditionalLogic}
            onChange={(e) => setShowConditionalLogic(e.target.checked)}
            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="show_conditional_logic" className="font-medium text-gray-700">
            Use Conditional Logic
          </label>
          <p className="text-gray-500">If enabled, this question will only show under certain conditions</p>
        </div>
      </div>
      
      {showConditionalLogic && (
        <div className="space-y-4 ml-7 border-l-2 border-blue-200 pl-4">
          {availableQuestions.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    {selectedCategoryId 
                      ? 'No previous questions available. Add more questions to enable conditional logic.'
                      : 'Select a service category first.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="conditional_question" className="block text-sm font-medium text-gray-700">
                  Dependent on Question
                </label>
                <div className="mt-1">
                  <select
                    id="conditional_question"
                    {...register('conditional_question')}
                    className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Select a question</option>
                    {availableQuestions.map((q) => (
                      <option key={q.question_id} value={q.question_id}>
                        Step {q.step_number}: {q.question_text}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.conditional_question && (
                  <p className="mt-2 text-sm text-red-600">{errors.conditional_question.message}</p>
                )}
              </div>
              
              {selectedQuestion && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Show When Answer Equals
                    </label>
                    
                    {availableOptions.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {availableOptions.map((option, idx) => (
                          <div key={idx} className="flex items-center">
                            <input
                              id={`option-${idx}`}
                              type="checkbox"
                              checked={conditionalValues.includes(option)}
                              onChange={() => handleOptionChange(option)}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <label htmlFor={`option-${idx}`} className="ml-2 block text-sm text-gray-700">
                              {option}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        No options available for this question
                      </div>
                    )}
                    
                    {conditionalValues.length === 0 && showConditionalLogic && selectedQuestion && (
                      <p className="mt-2 text-sm text-amber-600">Select at least one option</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="conditional_operator" className="block text-sm font-medium text-gray-700">
                      Logical Operator
                    </label>
                    <div className="mt-1">
                      <select
                        id="conditional_operator"
                        {...register('conditional_operator')}
                        className="-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="OR">OR - Show if any selected answers match</option>
                        <option value="AND">AND - Show only if all selected answers match</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}