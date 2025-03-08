// components/QuoteForm/index.tsx
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

export default function QuoteForm({ 
  serviceCategoryId, 
  serviceCategorySlug,
  onSubmitSuccess 
}: QuoteFormProps) {
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formValues, setFormValues] = useState<any>({});
  
  // Fetch questions on component mount
  useEffect(() => {
    async function loadQuestions() {
      const supabase = createClient();
      
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
          setFormValues(prev => ({
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
          setFormValues(prev => ({
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
          setFormValues(prev => ({
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
  
  // Get total number of steps based on questions plus 2 additional steps (postcode and contact form)
  const questionSteps = questions.length > 0 
    ? Math.max(...questions.map(q => q.step_number))
    : 0;
  const totalSteps = questionSteps + 2; // +1 for postcode step, +1 for contact details step
  
  // Handle change of form values
  const handleValueChange = (questionId: string, value: any) => {
    setFormValues(prev => ({
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
  
  const handleSubmit = async (contactDetails: any) => {
    try {
      setError(null);
      
      // Combine question answers with contact details
      const formData = {
        serviceCategory: serviceCategoryId,
        ...contactDetails,
        answers: formValues
      };
      
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
  
  // Service name display
  const serviceName = "Solar Panel Installation";
  
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
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Solar</h1>
        <p className="text-gray-600">{serviceName}</p>
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
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-700">
            {error}
          </div>
        )}
        
        <div className="p-6">
          {/* Questions steps */}
          {currentStep <= questionSteps && (
            <QuestionsStep 
              questions={questions.filter(q => q.step_number === currentStep)}
              formValues={formValues}
              onValueChange={handleValueChange}
              onNext={handleNextStep}
              onPrevious={handlePrevStep}
              showPrevious={currentStep > 1}
            />
          )}
          
          {/* Postcode step */}
          {currentStep === questionSteps + 1 && (
            <PostcodeStep
              onValueChange={(postcode) => handleValueChange('postcode', postcode)}
              value={formValues.postcode || ''}
              onNext={handleNextStep}
              onPrevious={handlePrevStep}
            />
          )}
          
          {/* Contact details step */}
          {currentStep === totalSteps && (
            <ContactDetailsStep
              formValues={formValues}
              onSubmit={handleSubmit}
              onPrevious={handlePrevStep}
            />
          )}
        </div>
      </div>
    </div>
  );
}