"use client";

import { useState, useEffect } from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';

interface ConditionalLogicProps {
  showConditionalLogic: boolean;
  setShowConditionalLogic: (show: boolean) => void;
  availableQuestions: any[];
  selectedQuestion: any;
  conditionalValues: string[];
  setConditionalValues: (values: string[]) => void;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
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
  
  // Helper function to extract option text from either string or object format
  const getOptionText = (option: any): string => {
    if (typeof option === 'object' && option !== null && 'text' in option) {
      return option.text;
    }
    return option;
  };
  
  const handleConditionalValueChange = (value: string, checked: boolean) => {
    if (checked) {
      const newValues = [...conditionalValues, value];
      setConditionalValues(newValues);
    } else {
      const newValues = conditionalValues.filter(v => v !== value);
      setConditionalValues(newValues);
    }
  };
  
  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">Conditional Logic</h3>
          <p className="mt-1 text-sm text-gray-500">
            Optionally make this question only appear based on previous answers.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setShowConditionalLogic(!showConditionalLogic)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showConditionalLogic ? 'Hide Conditional Logic' : 'Add Conditional Logic'}
          </button>
        </div>
      </div>
      
      {showConditionalLogic && (
        <div>
          <div className="rounded-md bg-blue-50 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1 md:flex md:justify-between">
                <p className="text-sm text-blue-700">
                  Conditional logic allows this question to be shown or hidden based on answers to previous questions.
                  Only questions from earlier steps in the same category can be used as dependencies.
                </p>
              </div>
            </div>
          </div>
          
          {availableQuestions.length === 0 && selectedCategoryId && (
            <div className="rounded-md bg-yellow-50 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">No available questions</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      There are no questions from earlier steps in this category that can be used for conditional logic.
                      Either add questions to earlier steps first, or increase the step number of this question.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <label htmlFor="conditional_question" className="block text-sm font-medium text-gray-700">
                Show this question when:
              </label>
              <div className="mt-1">
                <select
                  id="conditional_question"
                  {...register('conditional_question')}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  disabled={availableQuestions.length === 0}
                >
                  <option value="">Select a question</option>
                  {availableQuestions.map((question) => (
                    <option key={question.question_id} value={question.question_id}>
                      {question.question_text} (Step {question.step_number})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {selectedQuestion && (
              <>
                <div className="sm:col-span-3">
                  <label htmlFor="conditional_operator" className="block text-sm font-medium text-gray-700">
                    Condition Type
                  </label>
                  <div className="mt-1">
                    <select
                      id="conditional_operator"
                      {...register('conditional_operator')}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="OR">Any selected (OR)</option>
                      <option value="AND">All selected (AND)</option>
                    </select>
                  </div>
                </div>
                
                <div className="sm:col-span-6">
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700">
                      When answer is: (select one or more)
                    </legend>
                    <div className="mt-2 space-y-2">
                      {selectedQuestion.is_multiple_choice && selectedQuestion.answer_options ? (
                        selectedQuestion.answer_options.map((option: any, idx: number) => {
                          // Extract the text from the option (whether it's an object or a string)
                          const optionText = getOptionText(option);
                          
                          return (
                            <div key={idx} className="flex items-start">
                              <div className="flex items-center h-5">
                                <input
                                  id={`condition-value-${idx}`}
                                  type="checkbox"
                                  value={optionText}
                                  checked={conditionalValues.includes(optionText)}
                                  onChange={(e) => handleConditionalValueChange(optionText, e.target.checked)}
                                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                />
                              </div>
                              <div className="ml-3 text-sm">
                                <label htmlFor={`condition-value-${idx}`} className="font-medium text-gray-700">
                                  {optionText}
                                </label>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="mt-2">
                          <input
                            type="text"
                            {...register('conditional_values')}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Comma-separated values, e.g.: Mains Gas,LPG"
                            onChange={(e) => {
                              const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                              setConditionalValues(values);
                            }}
                          />
                          <p className="mt-2 text-sm text-gray-500">
                            Enter comma-separated values that the selected question must have for this question to appear.
                          </p>
                        </div>
                      )}
                    </div>
                  </fieldset>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { default as ConditionalLogic } from './ConditionalLogic';