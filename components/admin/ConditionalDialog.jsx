// components/admin/ConditionalDialog.jsx
import React, { useState, useEffect } from 'react';
import { X, Info, CheckCircle, AlertTriangle, ChevronDown, PlusCircle, Trash2 } from 'lucide-react';

export function ConditionalDialog({
  isOpen,
  onClose,
  targetQuestionId,
  availableQuestions,
  preselectedSourceId,
  initialValues,
  onSave
}) {
  // Initialize with multiple conditions if they exist, otherwise create one default condition
  const [conditions, setConditions] = useState(() => {
    if (initialValues?.conditions) {
      return initialValues.conditions.map(condition => ({
        sourceQuestionId: condition.dependent_on_question_id || '',
        operator: condition.logical_operator || 'OR',
        values: condition.show_when_answer_equals || []
      }));
    } else if (initialValues?.dependent_on_question_id) {
      // For backwards compatibility with old format
      return [{
        sourceQuestionId: initialValues.dependent_on_question_id || preselectedSourceId || '',
        operator: initialValues.logical_operator || 'OR',
        values: initialValues.show_when_answer_equals || []
      }];
    } else {
      return [{
        sourceQuestionId: preselectedSourceId || '',
        operator: 'OR',
        values: []
      }];
    }
  });
  
  // Group operator (how to combine all conditions)
  const [groupOperator, setGroupOperator] = useState(
    initialValues?.group_logical_operator || 'AND'
  );
  
  const [sourceQuestions, setSourceQuestions] = useState([]);
  const [availableOptionsByQuestion, setAvailableOptionsByQuestion] = useState({});
  const [validationError, setValidationError] = useState('');
  
  if (!isOpen) return null;
  
  // Handle backdrop click to close the dialog
  const handleBackdropClick = (e) => {
    // Only close if clicking directly on the backdrop, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Update source questions when ids change
  useEffect(() => {
    // For each condition, find the corresponding question
    const questions = conditions.map(condition => 
      condition.sourceQuestionId ? 
        availableQuestions.find(q => q.question_id === condition.sourceQuestionId) : 
        null
    );
    setSourceQuestions(questions);
    
    // Extract options for each question
    const optionsMap = {};
    
    conditions.forEach((condition, index) => {
      const questionId = condition.sourceQuestionId;
      if (!questionId || optionsMap[questionId]) return;
      
      const question = availableQuestions.find(q => q.question_id === questionId);
      if (!question?.is_multiple_choice || !question?.answer_options) {
        optionsMap[questionId] = [];
        return;
      }
      
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
        
        optionsMap[questionId] = options;
      } catch (error) {
        console.error('Error parsing question options:', error);
        optionsMap[questionId] = [];
      }
    });
    
    setAvailableOptionsByQuestion(optionsMap);
  }, [conditions, availableQuestions]);
  
  const handleValueChange = (conditionIndex, value) => {
    const updatedConditions = [...conditions];
    const condition = updatedConditions[conditionIndex];
    
    if (condition.values.includes(value)) {
      condition.values = condition.values.filter(v => v !== value);
    } else {
      condition.values = [...condition.values, value];
    }
    
    setConditions(updatedConditions);
    
    // Clear validation error when making a selection
    if (validationError) {
      setValidationError('');
    }
  };
  
  const handleAddCondition = () => {
    setConditions([...conditions, {
      sourceQuestionId: '',
      operator: 'OR',
      values: []
    }]);
  };
  
  const handleRemoveCondition = (index) => {
    if (conditions.length <= 1) return;
    const newConditions = [...conditions];
    newConditions.splice(index, 1);
    setConditions(newConditions);
  };
  
  const updateConditionField = (index, field, value) => {
    const updatedConditions = [...conditions];
    updatedConditions[index] = {
      ...updatedConditions[index],
      [field]: value
    };
    
    // If changing the question, clear selected values
    if (field === 'sourceQuestionId') {
      updatedConditions[index].values = [];
    }
    
    setConditions(updatedConditions);
  };
  
  const handleSave = () => {
    // Validate all conditions
    const invalidIndex = conditions.findIndex(condition => 
      !condition.sourceQuestionId || condition.values.length === 0
    );
    
    if (invalidIndex !== -1) {
      setValidationError(`Condition ${invalidIndex + 1}: Please select a question and at least one answer option`);
      return;
    }
    
    onSave({
      conditions,
      groupOperator
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
        className="bg-white rounded-lg -2xl w-full max-w-lg transform transition-all duration-300 ease-in-out mx-4"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-600 rounded-t-lg">
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
        
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex items-center">
                <AlertTriangle size={18} className="text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{validationError}</p>
              </div>
            </div>
          )}
          
          {/* Group Operator Selection */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How to combine multiple conditions:
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  checked={groupOperator === 'AND'} 
                  onChange={() => setGroupOperator('AND')}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">ALL conditions must match (AND)</span>
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  checked={groupOperator === 'OR'} 
                  onChange={() => setGroupOperator('OR')}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">ANY condition can match (OR)</span>
              </label>
            </div>
          </div>
          
          {/* Conditions */}
          {conditions.map((condition, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg bg-white">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-900">Condition {index + 1}</h3>
                {conditions.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveCondition(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              {/* Source Question */}
              <div className="mb-3">
                <label htmlFor={`sourceQuestion-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Show based on answer to:
                </label>
                <div className="relative">
                  <select
                    id={`sourceQuestion-${index}`}
                    value={condition.sourceQuestionId}
                    onChange={(e) => updateConditionField(index, 'sourceQuestionId', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 -sm transition-colors appearance-none bg-white pr-10"
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
              
              {sourceQuestions[index] && (
                <>
                  {/* Operator Selection */}
                  <div className="mb-3">
                    <label htmlFor={`operator-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      For this condition:
                    </label>
                    <div className="relative">
                      <select
                        id={`operator-${index}`}
                        value={condition.operator}
                        onChange={(e) => updateConditionField(index, 'operator', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 -sm transition-colors appearance-none bg-white pr-10"
                      >
                        <option value="OR">Show if ANY selected options match</option>
                        <option value="AND">Show if ALL selected options match</option>
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
                        When answer equals:
                      </label>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {condition.values.length} selected
                      </span>
                    </div>
                    
                    {availableOptionsByQuestion[condition.sourceQuestionId]?.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-40 overflow-y-auto">
                        {availableOptionsByQuestion[condition.sourceQuestionId].map((option, optIdx) => (
                          <label
                            key={optIdx}
                            className={`flex items-center p-1 mb-1 rounded-md cursor-pointer transition-colors ${
                              condition.values.includes(option)
                                ? 'bg-blue-50 border border-blue-200'
                                : 'bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              id={`option-${index}-${optIdx}`}
                              type="checkbox"
                              checked={condition.values.includes(option)}
                              onChange={() => handleValueChange(index, option)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className={`ml-2 block text-sm ${
                              condition.values.includes(option) ? 'text-blue-700 font-medium' : 'text-gray-700'
                            }`}>
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center bg-amber-50 text-amber-700 p-3 rounded-lg border border-amber-200 text-sm">
                        <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
                        <p className="text-sm">
                          {!sourceQuestions[index]?.is_multiple_choice 
                            ? "This question doesn't have predefined answer options." 
                            : "No options available for this question."}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          
          {/* Add Condition Button */}
          <button
            type="button"
            onClick={handleAddCondition}
            className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 w-full justify-center"
          >
            <PlusCircle size={16} className="mr-1.5" />
            Add Another Condition
          </button>
          
          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4 flex items-start">
            <Info size={16} className="text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              The selected questions must have been answered for this conditional logic to apply.
              When conditions are not met, this question will be hidden from the form.
            </p>
          </div>
          
          {/* Buttons */}
          <div className="mt-6 flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg -sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 border border-transparent rounded-lg -sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center"
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