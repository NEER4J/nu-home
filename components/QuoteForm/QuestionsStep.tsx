// components/QuoteForm/QuestionsStep.tsx
import { useState, useEffect } from 'react';
import { FormQuestion } from '@/types/database.types';
import { motion } from 'framer-motion';

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
  const [selectedQuestion, setSelectedQuestion] = useState<string>(
    questions.length > 0 ? questions[0].question_id : ''
  );
  
  // Update selected question when questions change
  useEffect(() => {
    if (questions.length > 0 && !questions.find(q => q.question_id === selectedQuestion)) {
      setSelectedQuestion(questions[0].question_id);
    }
  }, [questions, selectedQuestion]);
  
  // Handle multiple choice selection with improved deselection logic
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
        : formValues[questionId] ? formValues[questionId].split(', ') : [];
      
      // Check if the option is already selected
      const isSelected = currentValues.includes(optionValue);
      
      let newValues;
      if (isSelected) {
        // Remove if already selected
        newValues = currentValues.filter((val: string) => val !== optionValue);
      } else {
        // Add if not selected
        newValues = [...currentValues, optionValue];
      }
      
      // Store as string with comma separator if there are multiple values
      const formattedValue = newValues.length > 0 ? newValues.join(', ') : '';
      onValueChange(questionId, formattedValue);
    } else {
      // Single selection - just use the option text
      onValueChange(questionId, optionValue);
      
      // Automatically proceed to next question for single-choice selections
      // only if this is the only question in the step
      if (questions.length === 1) {
        onNext();
      }
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

  // Get current active question
  const currentQuestion = questions.find(q => q.question_id === selectedQuestion) || questions[0];
  
  // Determine if multiple selections are allowed for current question
  const allowMultipleSelections = currentQuestion?.is_multiple_choice && currentQuestion?.allow_multiple_selections;
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-4xl mx-auto p-3"
    >
      {/* Question Navigation Pills - Show if more than one question */}
      {questions.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {questions.map((question, index) => (
            <button
              key={question.question_id}
              onClick={() => setSelectedQuestion(question.question_id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                question.question_id === selectedQuestion
                  ? 'bg-blue-600 text-white shadow-md'
                  : formValues[question.question_id]
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
      
      {/* Current Question */}
      <motion.div
        key={currentQuestion?.question_id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          {currentQuestion?.question_text}
          {currentQuestion?.is_required && <span className="text-red-500 ml-1">*</span>}
        </h2>
        
        {/* Show multiple selection helper text */}
        {allowMultipleSelections && (
          <div className="text-center mb-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              You can select multiple options
            </span>
          </div>
        )}
        
        {currentQuestion?.is_multiple_choice ? (
          <div className={`grid ${currentQuestion.answer_options && currentQuestion.answer_options.length > 2 ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'} gap-6 max-w-8xl mx-auto`}>
            {currentQuestion.answer_options?.map((option: any, idx) => {
                // Handle both old and new data formats with explicit typing
                const isOptionObject = typeof option === 'object' && option !== null;
                const optionText = isOptionObject ? (option as any).text : option as string;
                const optionImage = isOptionObject 
                  ? (option as any).image 
                  : (currentQuestion.answer_images && currentQuestion.answer_images[idx]);
              
              // Check if this option is selected
              const isSelected = isOptionSelected(currentQuestion.question_id, optionText, !!allowMultipleSelections);
              
              return (
                <motion.div 
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    bg-white p-6 rounded-lg border-2 ${isSelected 
                      ? 'border-blue-500 ring-4 ring-blue-100' 
                      : 'border-gray-200 hover:border-blue-300'} 
                    cursor-pointer transition-all shadow-sm hover:shadow-md text-center relative overflow-hidden
                  `}
                  onClick={() => handleMultipleChoiceSelection(currentQuestion.question_id, option, !!allowMultipleSelections)}
                >
                  {/* Highlight effect for selected items */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-50 opacity-30"></div>
                  )}
                  
                  {/* Checkbox in top right corner for multiple selection questions */}
                  {allowMultipleSelections && (
                    <div className="absolute top-3 right-3 z-10">
                      <div className={`w-5 h-5 border rounded-md flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'} transition-colors duration-200`}>
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center relative z-0">
                    {optionImage && (
                      <div className="mb-3 rounded-lg overflow-hidden p-2">
                        <img 
                          src={optionImage}
                          alt={optionText}
                          width={200}
                          height={200}
                          className="w-[140px] h-[140px] object-contain"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-center">
                      <span className="font-medium text-lg">{optionText}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={formValues[currentQuestion.question_id] || ''}
                onChange={(e) => handleTextInputChange(currentQuestion.question_id, e.target.value)}
                onKeyPress={handleTextInputKeyPress}
                className="mt-1 block w-full px-4 py-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Your answer"
              />
              <div className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-full transition-all duration-300" style={{ 
                width: formValues[currentQuestion?.question_id] ? `${Math.min((formValues[currentQuestion.question_id].length / 20) * 100, 100)}%` : '0%' 
              }}></div>
            </div>
          </div>
        )}
        
        {errors[currentQuestion?.question_id] && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm text-red-600 text-center flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errors[currentQuestion.question_id]}
          </motion.p>
        )}
        
        {currentQuestion?.has_helper_video && currentQuestion?.helper_video_url && (
          <div className="mt-6 text-center">
            <a 
              href={currentQuestion.helper_video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 mr-2" 
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
      </motion.div>
      
      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between max-w-md mx-auto">
        {showPrevious && (
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
            Back
          </motion.button>
        )}
        
        {/* If multiple questions in step, show prev/next question buttons */}
        {questions.length > 1 && (
          <div className="flex gap-3">
            {currentQuestion?.question_id !== questions[0].question_id && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => {
                  const currentIndex = questions.findIndex(q => q.question_id === currentQuestion?.question_id);
                  if (currentIndex > 0) {
                    setSelectedQuestion(questions[currentIndex - 1].question_id);
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
              >
                Previous Question
              </motion.button>
            )}
            
            {currentQuestion?.question_id !== questions[questions.length - 1].question_id && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => {
                  const currentIndex = questions.findIndex(q => q.question_id === currentQuestion?.question_id);
                  if (currentIndex < questions.length - 1) {
                    setSelectedQuestion(questions[currentIndex + 1].question_id);
                  }
                }}
                className="px-4 py-2 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-sm"
              >
                Next Question
              </motion.button>
            )}
          </div>
        )}
        
        {/* Next step button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => validateResponses() && onNext()}
          className={`px-6 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all duration-200 flex items-center ${!showPrevious && questions.length === 1 ? 'ml-auto' : ''}`}
        >
          Next Step
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>
      
      {/* Progress Indicator */}
      {questions.length > 1 && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Question {questions.findIndex(q => q.question_id === currentQuestion?.question_id) + 1} of {questions.length}
        </div>
      )}
    </motion.div>
  );
}