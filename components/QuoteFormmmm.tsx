// components/QuoteForm.tsx
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormQuestion, QuoteFormData } from '@/types/database.types';
import { createClient } from '@/utils/supabase/client';

// Define form validation schema
const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().min(1, 'Postcode is required'), 
  // Dynamic answers will be added based on questions
});

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
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Get total number of steps
  const totalSteps = questions.length > 0 
    ? Math.max(...questions.map(q => q.step_number))
    : 1;
  
  // Get questions for current step
  const currentQuestions = questions.filter(q => q.step_number === currentStep);
  
  // Setup form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
    getValues
  } = useForm<any>({
    resolver: zodResolver(formSchema) as any,
    mode: 'onChange'
  });
  
  // Watch form values for conditional logic
  const formValues = watch();
  
  // Fetch questions on component mount
  useEffect(() => {
    async function loadQuestions() {
      const supabase = await createClient();
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
      } else {
        setQuestions(data as FormQuestion[]);
      }
      
      setLoading(false);
    }
    
    loadQuestions();
  }, [serviceCategoryId]);
  
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
  
  // Handle next step
  const handleNextStep = async () => {
    // Validate current step fields
    const fieldsToValidate = currentQuestions
      .filter(shouldDisplayQuestion)
      .map(q => q.question_id)
      .concat(['firstName', 'lastName', 'email', 'postcode']
        .filter(field => currentStep === totalSteps));
    
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        // Final step - submit form
        handleFinalSubmit();
      }
    }
  };
  
  // Handle previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Handle final form submission
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Prepare form data
      const formData: QuoteFormData = {
        serviceCategory: serviceCategoryId,
        firstName: getValues('firstName'),
        lastName: getValues('lastName'),
        email: getValues('email'),
        phone: getValues('phone'),
        city: getValues('city'),
        postcode: getValues('postcode'),
        answers: {}
      };
      
      // Add answers for all questions
      questions.forEach(question => {
        const questionId = question.question_id;
        if (getValues(questionId) !== undefined) {
          formData.answers[questionId] = getValues(questionId);
        }
      });
      
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
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className="p-4 text-center">Loading form questions...</div>;
  }
  
  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-2xl font-semibold text-green-700 mb-4">Quote Request Submitted!</h3>
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
    <div className="w-full max-w-2xl mx-auto bg-white p-6 rounded-lg border -md">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-6">
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
      
      <form>
        {/* Display current step questions */}
        {currentQuestions.map(question => {
          // Skip questions that shouldn't be displayed based on conditional logic
          if (!shouldDisplayQuestion(question)) return null;
          
          return (
            <div key={question.question_id} className="mb-6">
              <label 
                htmlFor={question.question_id} 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {question.question_text}
                {question.is_required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {question.is_multiple_choice ? (
                <div className="space-y-2">
                  {question.answer_options?.map((option, idx) => (
                    <div key={idx} className="flex items-center">
                      <input
                        type="radio"
                        id={`${question.question_id}-${idx}`}
                        value={option}
                        {...register(question.question_id, {
                          required: question.is_required ? 'This field is required' : false
                        })}
                        className="h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <label 
                        htmlFor={`${question.question_id}-${idx}`}
                        className="ml-2 block text-sm text-gray-700"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  id={question.question_id}
                  {...register(question.question_id, {
                    required: question.is_required ? 'This field is required' : false
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md -sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              )}
              
              {errors[question.question_id] && (
                <p className="mt-1 text-sm text-red-600">
                  {errors[question.question_id]?.message as string}
                </p>
              )}
              
              {question.has_helper_video && question.helper_video_url && (
                <div className="mt-2">
                  <a 
                    href={question.helper_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center"
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
        
        {/* Contact details form fields on last step */}
        {currentStep === totalSteps && (
          <div className="space-y-4 mt-8 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900">Your Contact Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  {...register('firstName')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md -sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.firstName.message as string}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  {...register('lastName')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md -sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.lastName.message as string}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md -sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message as string}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md -sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  {...register('city')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md -sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="postcode" className="block text-sm font-medium text-gray-700">
                  Postcode <span className="text-red-500">*</span>
                </label>
                <input
                  id="postcode"
                  type="text"
                  {...register('postcode')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md -sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.postcode && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.postcode.message as string}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-8 flex justify-between">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous
            </button>
          )}
          
          <button
            type="button"
            onClick={handleNextStep}
            disabled={submitting}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 ${
              submitting ? 'opacity-70 cursor-not-allowed' : ''
            } ${currentStep === 1 ? 'ml-auto' : ''}`}
          >
            {submitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : currentStep < totalSteps ? (
              'Next'
            ) : (
              'Submit Quote Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}