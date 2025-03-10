// components/admin/ConditionalDialog.jsx
import React, { useState, useEffect } from 'react';
import { X, Info, CheckCircle, AlertTriangle, ChevronDown } from 'lucide-react';

export function ConditionalDialog({
  isOpen,
  onClose,
  targetQuestionId,
  availableQuestions,
  preselectedSourceId,
  initialValues,
  onSave
}) {
  const [sourceQuestionId, setSourceQuestionId] = useState(
    preselectedSourceId || initialValues?.dependent_on_question_id || ''
  );
  const [operator, setOperator] = useState(initialValues?.logical_operator || 'OR');
  const [selectedValues, setSelectedValues] = useState(initialValues?.show_when_answer_equals || []);
  const [sourceQuestion, setSourceQuestion] = useState(null);
  const [availableOptions, setAvailableOptions] = useState([]);
  const [validationError, setValidationError] = useState('');
  
  if (!isOpen) return null;
  
  // Handle backdrop click to close the dialog
  const handleBackdropClick = (e) => {
    // Only close if clicking directly on the backdrop, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Update source question when id changes
  useEffect(() => {
    if (!sourceQuestionId) {
      setSourceQuestion(null);
      setAvailableOptions([]);
      return;
    }
    
    const question = availableQuestions.find(q => q.question_id === sourceQuestionId);
    setSourceQuestion(question);
    
    // Extract options from the question
    if (question?.is_multiple_choice && question?.answer_options) {
      try {
        let options = [];
        
        if (Array.isArray(question.answer_options)) {
          if (typeof question.answer_options[0] === 'string') {
            // Format: ["Option 1", "Option 2", ...]
            options = question.answer_options;
          } else if (typeof question.answer_options[0] === 'object') {
            // Format: [{ text: "Option 1", ... }, { text: "Option 2", ... }, ...]
            options = question.answer_options.map(opt => 
              typeof opt === 'object' && opt !== null && 'text' in opt ? opt.text : ''
            ).filter(Boolean);
          }
        }
        
        setAvailableOptions(options);
      } catch (error) {
        console.error('Error parsing question options:', error);
        setAvailableOptions([]);
      }
    } else {
      setAvailableOptions([]);
    }
  }, [sourceQuestionId, availableQuestions]);
  
  const handleValueChange = (value) => {
    if (selectedValues.includes(value)) {
      setSelectedValues(selectedValues.filter(v => v !== value));
    } else {
      setSelectedValues([...selectedValues, value]);
    }
    
    // Clear validation error when making a selection
    if (validationError) {
      setValidationError('');
    }
  };
  
  const handleSave = () => {
    if (!sourceQuestionId) {
      setValidationError('Please select a source question');
      return;
    }
    
    if (selectedValues.length === 0) {
      setValidationError('Please select at least one value');
      return;
    }
    
    onSave({
      sourceQuestionId,
      operator,
      values: selectedValues
    });
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center"
      onClick={handleBackdropClick}
      style={{
        backdropFilter: 'blur(5px)', 
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-md transform transition-all duration-300 ease-in-out mx-4"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Configure Conditional Logic</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-1">Define when this question should be displayed</p>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex items-center">
                <AlertTriangle size={18} className="text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{validationError}</p>
              </div>
            </div>
          )}
          
          {/* Source Question */}
          <div>
            <label htmlFor="sourceQuestion" className="block text-sm font-medium text-gray-700 mb-1">
              Show this question based on the answer to:
            </label>
            <div className="relative">
              <select
                id="sourceQuestion"
                value={sourceQuestionId}
                onChange={(e) => setSourceQuestionId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-colors appearance-none bg-white pr-10"
              >
                <option value="">Select a question</option>
                {availableQuestions.map((q) => (
                  <option key={q.question_id} value={q.question_id}>
                    Step {q.step_number}.{q.display_order_in_step}: {q.question_text.substring(0, 40)}{q.question_text.length > 40 ? '...' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
          
          {sourceQuestion && (
            <>
              {/* Operator Selection */}
              <div>
                <label htmlFor="operator" className="block text-sm font-medium text-gray-700 mb-1">
                  Logical Operator:
                </label>
                <div className="relative">
                  <select
                    id="operator"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-colors appearance-none bg-white pr-10"
                  >
                    <option value="OR">OR - Show if ANY selected options match</option>
                    <option value="AND">AND - Show if ALL selected options match</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Available Options */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Show When Answer Equals:
                  </label>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {selectedValues.length} selected
                  </span>
                </div>
                
                {availableOptions.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-60 overflow-y-auto">
                    {availableOptions.map((option, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center p-2.5 mb-1.5 rounded-md cursor-pointer transition-colors ${
                          selectedValues.includes(option)
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          id={`option-${idx}`}
                          type="checkbox"
                          checked={selectedValues.includes(option)}
                          onChange={() => handleValueChange(option)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className={`ml-3 block text-sm ${
                          selectedValues.includes(option) ? 'text-blue-700 font-medium' : 'text-gray-700'
                        }`}>
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center bg-amber-50 text-amber-700 p-4 rounded-lg border border-amber-200">
                    <AlertTriangle size={18} className="mr-2 flex-shrink-0" />
                    <p className="text-sm">
                      This question has no predefined answer options available.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4 flex items-start">
            <Info size={16} className="text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              The selected question must have been answered for this conditional logic to apply.
              When conditions are not met, this question will be hidden from the form.
            </p>
          </div>
          
          {/* Buttons */}
          <div className="mt-6 flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center"
            >
              <CheckCircle size={16} className="mr-1.5" />
              Save Logic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}