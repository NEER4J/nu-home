"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FormQuestion } from '@/types/database.types';
import QuestionsStep from './QuestionsStep';
import PostcodeStep from './PostcodeStep';
import ContactDetailsStep from './ContactDetailsStep';

interface QuoteFormProps {
  serviceCategoryId: string;
  serviceCategorySlug: string;
  onSubmitSuccess?: (data: any) => void;
}

// Define a type for the form values
interface FormValues {
  [key: string]: any;
  option_images?: Record<string, string[]>;
}

export default function QuoteForm({ 
  serviceCategoryId, 
  serviceCategorySlug,
  onSubmitSuccess 
}: QuoteFormProps) {
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>({});
  
  // Fetch questions on component mount
  useEffect(() => {
    async function loadQuestions() {
      const supabase = await createClient();
      
      // First, fetch the standard form questions
      const { data, error } = await supabase
        .from('FormQuestions')
        .select('*')
        .eq('service_category_id', serviceCategoryId)
        .eq('status', 'active')
        .eq('is_deleted', false)
        .order('step_number')
        .order('display_order_in_step');
      
      if (error) {
        console.error('Error fetching form questions:', error);
        setQuestions([]);
        setLoading(false);
        return;
      }
      
      // Handle image loading based on your actual data structure
      // There are multiple potential ways your image data might be stored:
      
      // OPTION 1: If images are stored in a separate table
      try {
        // Collect all question IDs to fetch related images
        const questionIds = data.map(q => q.question_id);
        
        // Fetch option images from your database
        const { data: imageData, error: imageError } = await supabase
          .from('FormQuestionImages') // Update to your actual table name
          .select('*')
          .in('question_id', questionIds);
        
        if (!imageError && imageData) {
          // Process the image data
          const optionImages: Record<string, string[]> = {};
          
          // Adjust this based on your actual data structure
          imageData.forEach((item: any) => {
            if (!optionImages[item.question_id]) {
              optionImages[item.question_id] = [];
            }
            optionImages[item.question_id][item.option_index] = item.image_url;
          });
          
          // Store images in form values for use in components
          setFormValues((prev: FormValues) => ({
            ...prev,
            option_images: optionImages
          }));
        }
      } catch (imageErr) {
        console.error('Error fetching question images:', imageErr);
        // Continue with questions even if images fail to load
      }
      
      // OPTION 2: If your answer_images are stored as a JSONB field in your database
      // but not being properly typed in your TypeScript interface
      try {
        const optionImages: Record<string, string[]> = {};
        
        data.forEach((question: any) => {
          // Access the raw answer_images field if it exists in the database but not in your type
          if (question.answer_images) {
            optionImages[question.question_id] = question.answer_images;
          }
        });
        
        if (Object.keys(optionImages).length > 0) {
          setFormValues((prev: FormValues) => ({
            ...prev,
            option_images: optionImages
          }));
        }
      } catch (jsonErr) {
        console.error('Error processing answer images from questions:', jsonErr);
      }
      
      // OPTION 3: If your images are stored in Supabase Storage
      // You might need to construct URLs to images stored in Supabase Storage
      try {
        const optionImages: Record<string, string[]> = {};
        
        data.forEach((question: FormQuestion) => {
          if (question.is_multiple_choice && question.answer_options) {
            // Create URLs for each option based on a naming convention
            // Example: storing images as "question_id/option_index.png"
            optionImages[question.question_id] = question.answer_options.map((_, idx) => {
              return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/form-images/${question.question_id}/${idx}.png`;
            });
          }
        });
        
        if (Object.keys(optionImages).length > 0) {
          setFormValues((prev: FormValues) => ({
            ...prev,
            option_images: optionImages
          }));
        }
      } catch (storageErr) {
        console.error('Error constructing storage URLs:', storageErr);
      }
      
      setQuestions(data as FormQuestion[]);
      setLoading(false);
    }
    
    loadQuestions();
  }, [serviceCategoryId]);
  
  // Update active questions when formValues or questions change
  useEffect(() => {
    if (questions.length === 0) return;
    
    // Filter to get only active questions based on conditional logic
    const updateActiveQuestions = () => {
      const active = questions.filter(question => {
        // If no conditional display, it's always active
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
      });
      
      setActiveQuestions(active);
    };
    
    updateActiveQuestions();
  }, [questions, formValues]);
  
  // Get total number of steps based on active questions plus 2 additional steps (postcode and contact form)
  const getVisibleQuestionsForStep = (step: number) => {
    return activeQuestions.filter(q => q.step_number === step);
  };
  
  // Compute the list of step numbers with active questions
  const activeSteps = Array.from(new Set(activeQuestions.map(q => q.step_number))).sort((a, b) => a - b);
  
  // Get total steps (active question steps + postcode & contact details)
  const totalSteps = activeSteps.length + 2; // +1 for postcode step, +1 for contact details step
  
  // Convert the UI step number to actual step number
  const getCurrentStepContent = () => {
    if (currentStep <= activeSteps.length) {
      // This is a question step
      return (
        <QuestionsStep 
          questions={getVisibleQuestionsForStep(activeSteps[currentStep - 1])}
          formValues={formValues}
          onValueChange={handleValueChange}
          onNext={handleNextStep}
          onPrevious={handlePrevStep}
          showPrevious={currentStep > 1}
        />
      );
    } else if (currentStep === activeSteps.length + 1) {
      // This is the postcode step
      return (
        <PostcodeStep
          onValueChange={(postcode) => handleValueChange('postcode', postcode)}
          value={formValues.postcode || ''}
          onNext={handleNextStep}
          onPrevious={handlePrevStep}
        />
      );
    } else {
      // This is the contact details step
      return (
        <ContactDetailsStep
          formValues={formValues}
          onSubmit={handleSubmit}
          onPrevious={handlePrevStep}
        />
      );
    }
  };
  
// Update the handleValueChange function to add debugging
const handleValueChange = (questionId: string, value: any) => {
  // Debug logging
  console.log(`Setting value for question ${questionId}:`, value);
  
  // Validate the question exists
  const questionExists = questions.find(q => q.question_id === questionId);
  if (!questionExists) {
    console.warn(`Warning: No matching question found for ID: ${questionId}`);
  }
  
  setFormValues((prev: FormValues) => ({
    ...prev,
    [questionId]: value
  }));
};
  
  // Handle next step
  const handleNextStep = () => {
    setCurrentStep(currentStep + 1);
  };
  
  // Handle previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Update this section in QuoteForm.tsx

const handleSubmit = async (contactDetails: any) => {
  try {
    setError(null);
    
    // Filter out non-question data from formValues
    const filteredAnswers = Object.entries(formValues).reduce((acc: Record<string, any>, [key, value]) => {
      // Skip special keys and empty values
      if (key === 'option_images' || key === 'postcode' || !value) return acc;
      
      // Find the associated question
      const question = questions.find(q => q.question_id === key);
      
      if (question) {
        // Store simple string value (or comma-separated strings for multiple selections)
        acc[key] = value;
      }
      
      return acc;
    }, {});
    
    // Add question metadata separately to help with debugging/tracking
    const questionMetadata = questions.reduce((acc: Record<string, any>, question) => {
      acc[question.question_id] = {
        question_text: question.question_text,
        step_number: question.step_number,
        is_multiple_choice: question.is_multiple_choice,
        allow_multiple_selections: question.allow_multiple_selections
      };
      return acc;
    }, {});
    
    // Combine complete form data
    const formData = {
      serviceCategory: serviceCategoryId,
      serviceCategoryName: serviceCategorySlug, // Include the service name for better identification
      ...contactDetails,
      postcode: formValues.postcode,
      answers: filteredAnswers,
      questionMetadata: questionMetadata
    };
    
    // Debug log to check what's being submitted
    console.log('Submitting form data:', formData);
    
    // Submit to API
    const response = await fetch('/api/quote-submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit quote request');
    }
    
    setSuccess(true);
    if (onSubmitSuccess) {
      onSubmitSuccess(result.data);
    }
    
  } catch (error: any) {
    setError(error.message || 'An unexpected error occurred');
    console.error('Error submitting form:', error);
  }
};
  
  if (loading) {
    return <div className="p-4 text-center">Loading form questions...</div>;
  }
  
  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-2xl font-bold text-green-700 mb-4">Quote Request Submitted!</h3>
        <p className="mb-4">Thank you for your submission. Our team will contact you shortly.</p>
        <button 
          onClick={() => window.location.href = `/services/${serviceCategorySlug}`}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Return to Service Page
        </button>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {/* Back button and service name */}
      <div className="mb-8">
        <a href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </a>
        <h1 className="text-3xl font-bold text-gray-900 mt-2 capitalize">{serviceCategorySlug} Quote Form</h1>
      </div>
      
      {/* Main progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Main content container */}
      <div className=" overflow-hidden">
        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-700">
            {error}
          </div>
        )}
        
        <div className="p-6">
          {getCurrentStepContent()}
        </div>
      </div>
    </div>
  );
}