// components/admin/QuestionDialog.jsx
import React from 'react';
import { QuestionForm } from '@/components/admin/QuestionForm';

export function QuestionDialog({
  isOpen,
  onClose,
  question,
  categories,
  selectedCategoryId,
  selectedPartnerId,
  newQuestionPosition,
  availableQuestions,
  onSave
}) {
  if (!isOpen) return null;
  
  const categoryStepMap = newQuestionPosition 
    ? { [selectedCategoryId]: newQuestionPosition.step - 1 } 
    : {};
  
  // Handle backdrop click to close the dialog
  const handleBackdropClick = (e) => {
    // Only close if clicking directly on the backdrop, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center"
      onClick={handleBackdropClick}
      style={{backdropFilter: 'blur(2px)', backgroundColor: 'rgba(0, 0, 0, 0.5)'}}
    >
      <div 
        className="bg-white rounded-lg -xl max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{maxHeight: '90vh'}}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing 
      >
        


        <div className="px-6 py-4 border-b border-gray-200 bg-blue-600 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">{question ? 'Edit Question' : 'Add New Question'}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-1">Define when this question should be displayed</p>
        </div>
        
        <div className="p-6">
          <QuestionForm
            question={question}
            categories={categories}
            selectedPartnerId={selectedPartnerId}
            conditionalQuestions={availableQuestions}
            categoryStepMap={categoryStepMap}
            onSave={onSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}