// components/admin/SimpleFormQuestionsEditor.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { QuestionDialog } from './QuestionDialog';
import { ConditionalDialog } from './ConditionalDialog';
import Link from 'next/link';

export default function SimpleFormQuestionsEditor({ initialCategories }) {
  const router = useRouter();
  
  // State
  const [categories, setCategories] = useState(initialCategories || []);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInactiveQuestions, setShowInactiveQuestions] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Dialog state
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestionPosition, setNewQuestionPosition] = useState(null);
  const [isConditionalDialogOpen, setIsConditionalDialogOpen] = useState(false);
  const [editingConditional, setEditingConditional] = useState(null);
  const [sourceQuestionId, setSourceQuestionId] = useState(null);
  
  // Use the first category as default if none selected
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]?.service_category_id);
    }
  }, [categories, selectedCategory]);
  
  // Fetch questions when selected category changes
  useEffect(() => {
    if (!selectedCategory) {
      setQuestions([]);
      return;
    }
    
    const fetchQuestions = async () => {
      setIsLoading(true);
      
      try {
        const supabase = await createClient();
        
        let query = supabase
          .from('FormQuestions')
          .select(`
            *,
            ServiceCategories (
              name
            )
          `)
          .eq('service_category_id', selectedCategory)
          .eq('is_deleted', false);
          
        if (!showInactiveQuestions) {
          query = query.eq('status', 'active');
        }
        
        const { data, error } = await query
          .order('step_number')
          .order('display_order_in_step');
        
        if (error) throw error;
        
        setQuestions(data || []);
      } catch (error) {
        console.error('Error fetching questions:', error);
        alert('Failed to load questions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuestions();
  }, [selectedCategory, showInactiveQuestions]);
  
  // Group questions by step
  const questionsByStep = questions.reduce((acc, question) => {
    if (!acc[question.step_number]) {
      acc[question.step_number] = [];
    }
    acc[question.step_number].push(question);
    return acc;
  }, {});
  
  // Get sorted step keys
  const sortedSteps = Object.keys(questionsByStep).sort((a, b) => Number(a) - Number(b));
  
  // Event handlers
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };
  
  const handleToggleInactive = () => {
    setShowInactiveQuestions(!showInactiveQuestions);
  };
  
  const handleAddQuestion = (position) => {
    setNewQuestionPosition(position);
    setEditingQuestion(null);
    setIsQuestionDialogOpen(true);
  };
  
  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setNewQuestionPosition(null);
    setIsQuestionDialogOpen(true);
  };
  
  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const supabase = await createClient();
      
      const { error } = await supabase
        .from('FormQuestions')
        .update({ is_deleted: true })
        .eq('question_id', questionId);
      
      if (error) throw error;
      
      // Update the local state
      setQuestions(questions.filter(q => q.question_id !== questionId));
      
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddConditional = (question) => {
    setSourceQuestionId(null);
    setEditingConditional(question.question_id);
    setIsConditionalDialogOpen(true);
  };
  
  const handleEditConditional = (questionId, sourceId) => {
    setSourceQuestionId(sourceId);
    setEditingConditional(questionId);
    setIsConditionalDialogOpen(true);
  };
  
  const handleUpdateQuestionConditional = async (questionId, conditionalDisplay) => {
    try {
      setIsLoading(true);
      
      const supabase = await createClient();
      
      const { error } = await supabase
        .from('FormQuestions')
        .update({ conditional_display: conditionalDisplay })
        .eq('question_id', questionId);
      
      if (error) throw error;
      
      // Update the local state
      setQuestions(questions.map(q => 
        q.question_id === questionId 
          ? { ...q, conditional_display: conditionalDisplay }
          : q
      ));
      
      setIsConditionalDialogOpen(false);
      
    } catch (error) {
      console.error('Error updating conditional logic:', error);
      alert('Failed to update conditional logic: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQuestionSaved = (updatedQuestion) => {
    setIsQuestionDialogOpen(false);
    
    if (!updatedQuestion) return;
    
    if (editingQuestion) {
      // Update existing question
      setQuestions(questions.map(q => 
        q.question_id === updatedQuestion.question_id ? updatedQuestion : q
      ));
    } else {
      // Add new question
      setQuestions([...questions, updatedQuestion]);
    }
  };
  
  const handleSaveConditional = (conditionalData) => {
    if (!editingConditional) return;
    
    const conditionalDisplay = {
      dependent_on_question_id: conditionalData.sourceQuestionId,
      show_when_answer_equals: conditionalData.values,
      logical_operator: conditionalData.operator
    };
    
    handleUpdateQuestionConditional(editingConditional, conditionalDisplay);
  };
  
  // Get current category name
  const currentCategoryName = categories.find(c => c.service_category_id === selectedCategory)?.name || '';
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with Category Tabs */}
      <div className="border-b bg-white">
        <div className="flex justify-between items-center px-4 py-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-800">Form Questions</h1>
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
              title="Help"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {selectedCategory && (
            <div className="flex gap-2">
              <button 
                onClick={handleToggleInactive}
                className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z" clipRule="evenodd" />
                </svg>
                {showInactiveQuestions ? 'Hide Inactive' : 'Show Inactive'}
              </button>
              
              <button 
                onClick={() => handleAddQuestion({ step: sortedSteps.length > 0 ? Number(sortedSteps[0]) : 1, order: 1 })}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Add Question
              </button>
            </div>
          )}
        </div>
        
        {/* Category Tabs */}
        <div className="px-2 border-t">
          <div className="flex overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.service_category_id}
                onClick={() => handleCategoryChange(category.service_category_id)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                  selectedCategory === category.service_category_id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Questions Content */}
      <div className="flex-grow overflow-auto bg-gray-50 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500">Loading questions...</p>
            </div>
          </div>
        ) : questions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="mt-2 text-lg font-medium text-gray-900">No questions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                This category doesn't have any questions yet
              </p>
              <button
                onClick={() => handleAddQuestion({ step: 1, order: 1 })}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Add First Question
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="sticky top-4">
                  <h3 className="font-medium text-gray-900 mb-3">Steps</h3>
                  <nav className="space-y-1" aria-label="Steps">
                    {sortedSteps.map((step) => {
                      return (
                        <a
                          key={step}
                          href={`#step-${step}`}
                          className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                        >
                          <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mr-2">
                            {step}
                          </span>
                          <span>Step {step}</span>
                          <span className="ml-auto bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                            {questionsByStep[step].length}
                          </span>
                        </a>
                      );
                    })}
                  </nav>
                  
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-900 mb-3">Legend</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                        <span>Active Question</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <div className="h-3 w-3 rounded-full bg-gray-400 mr-2"></div>
                        <span>Inactive Question</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2">
                          Conditional
                        </span>
                        <span>Has condition</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-9 space-y-6">
                {sortedSteps.map((step) => {
                  const stepQuestions = questionsByStep[step];
                  
                  return (
                    <div key={step} id={`step-${step}`} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-gray-900">
                          Step {step}
                        </h2>
                        <button
                          onClick={() => handleAddQuestion({ step: Number(step), order: stepQuestions.length + 1 })}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                          </svg>
                          Add to Step {step}
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {stepQuestions.map((question, index) => (
                          <div key={question.question_id}>
                            <div 
                              className={`p-4 border rounded-lg ${question.status === 'active' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                  <div className="pt-1">
                                    <div className={`h-3 w-3 rounded-full ${question.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                  </div>
                                  <div>
                                    <div className="flex items-center">
                                      <h3 className="font-medium text-gray-900">{question.question_text}</h3>
                                      {question.is_required && (
                                        <span className="ml-2 text-red-500">*</span>
                                      )}
                                    </div>
                                    
                                    <div className="mt-1 flex flex-wrap items-center text-sm text-gray-500">
                                      <span className="mr-2 mb-1">
                                        Order: {question.display_order_in_step}
                                      </span>
                                      <span className="mr-2 mb-1">
                                        {question.is_multiple_choice ? 'Multiple Choice' : 'Text Input'}
                                      </span>
                                      {question.is_multiple_choice && question.allow_multiple_selections && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2 mb-1">
                                          Multiple Selections
                                        </span>
                                      )}
                                      {question.conditional_display && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2 mb-1">
                                          Conditional
                                        </span>
                                      )}
                                      {question.has_helper_video && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-2 mb-1">
                                          Has Video
                                        </span>
                                      )}
                                    </div>
                                    
                                    {question.conditional_display && (
                                      <div className="mt-2 text-xs p-2 bg-gray-100 rounded">
                                        <span className="font-medium">Conditional Display:</span> Shows when question {
                                          questions.find(q => q.question_id === question.conditional_display.dependent_on_question_id)?.question_text.substring(0, 30) || 
                                          question.conditional_display.dependent_on_question_id
                                        }
                                        ... is {question.conditional_display.logical_operator === 'OR' ? 'any of' : 'all of'} {question.conditional_display.show_when_answer_equals.join(', ')}
                                        <button 
                                          onClick={() => handleEditConditional(question.question_id, question.conditional_display.dependent_on_question_id)}
                                          className="ml-2 text-purple-600 hover:text-purple-800"
                                        >
                                          Edit
                                        </button>
                                      </div>
                                    )}
                                    
                                    {question.is_multiple_choice && question.answer_options && (
                                      <div className="mt-2 pl-4 border-l-2 border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">Options:</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                          {Array.isArray(question.answer_options) && question.answer_options.map((option, optIndex) => {
                                            const optionText = typeof option === 'string' ? option : 
                                                           (option && typeof option === 'object' && 'text' in option) ? option.text : '';
                                            return (
                                              <div key={optIndex} className="text-sm text-gray-600">
                                                <span className="font-medium">•</span> {optionText}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {!question.conditional_display && (
                                      <div className="mt-2">
                                        <button 
                                          onClick={() => handleAddConditional(question)}
                                          className="text-xs text-purple-600 hover:text-purple-800 flex items-center"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                          </svg>
                                          Add Condition
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEditQuestion(question)}
                                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteQuestion(question.question_id)}
                                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Add button between questions */}
                            {index < stepQuestions.length - 1 && (
                              <div className="flex justify-center my-3">
                                <button
                                  onClick={() => handleAddQuestion({ 
                                    step: Number(step), 
                                    order: question.display_order_in_step + 1 
                                  })}
                                  className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 border border-blue-300 text-blue-600 hover:bg-blue-200"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {/* Add New Step Button */}
                <div className="flex justify-center my-8">
                  <button
                    onClick={() => handleAddQuestion({ 
                      step: sortedSteps.length > 0 ? Number(sortedSteps[sortedSteps.length - 1]) + 1 : 1, 
                      order: 1 
                    })}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Add New Step
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Question Dialog */}
      {isQuestionDialogOpen && (
        <QuestionDialog
          isOpen={isQuestionDialogOpen}
          onClose={() => setIsQuestionDialogOpen(false)}
          question={editingQuestion}
          categories={categories}
          selectedCategoryId={selectedCategory}
          newQuestionPosition={newQuestionPosition}
          availableQuestions={questions.filter(q => 
            (!editingQuestion || q.question_id !== editingQuestion.question_id) &&
            (!editingQuestion || q.step_number < editingQuestion.step_number)
          )}
          onSave={handleQuestionSaved}
        />
      )}
      
      {/* Conditional Logic Dialog */}
      {isConditionalDialogOpen && (
        <ConditionalDialog
          isOpen={isConditionalDialogOpen}
          onClose={() => setIsConditionalDialogOpen(false)}
          targetQuestionId={editingConditional}
          availableQuestions={questions.filter(q => 
            q.question_id !== editingConditional && 
            (q.step_number < questions.find(tq => tq.question_id === editingConditional)?.step_number ||
             (q.step_number === questions.find(tq => tq.question_id === editingConditional)?.step_number &&
              q.display_order_in_step < questions.find(tq => tq.question_id === editingConditional)?.display_order_in_step))
          )}
          preselectedSourceId={sourceQuestionId}
          initialValues={
            questions.find(q => q.question_id === editingConditional)?.conditional_display || {
              operator: 'OR',
              values: []
            }
          }
          onSave={handleSaveConditional}
        />
      )}
      
      {/* Help Modal */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center"
          onClick={() => setShowHelpModal(false)}
          style={{backdropFilter: 'blur(2px)', backgroundColor: 'rgba(0, 0, 0, 0.5)'}}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">How to Use</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-600 h-5 w-5 text-xs mr-2 mt-0.5">1</span>
                  <span><strong>Select a category</strong> using the tabs at the top to edit questions for that form type.</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-600 h-5 w-5 text-xs mr-2 mt-0.5">2</span>
                  <span>Click <strong>+ buttons</strong> to add new questions between existing ones or at the end of a step.</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-600 h-5 w-5 text-xs mr-2 mt-0.5">3</span>
                  <span>Click <strong>Edit</strong> on a question to modify its properties.</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-600 h-5 w-5 text-xs mr-2 mt-0.5">4</span>
                  <span>Click <strong>Add Condition</strong> to create branching logic based on previous question answers.</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-600 h-5 w-5 text-xs mr-2 mt-0.5">5</span>
                  <span><strong>Add New Step</strong> button at the bottom creates a new form step.</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-600 h-5 w-5 text-xs mr-2 mt-0.5">6</span>
                  <span>Use the <strong>Show Inactive</strong> toggle to view inactive questions.</span>
                </li>
              </ul>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}