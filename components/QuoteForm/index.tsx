"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FormQuestion } from '@/types/database.types';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionsStep from './QuestionsStep';
import PostcodeStep from '../category-commons/quote/PostcodeStep';
import UserInfoForm from '../category-commons/quote/UserInfoForm';
import ThankYouMessage from './ThankYouMessage';
import { triggerQuoteSubmissionEvent, triggerGTMEventCrossFrame } from '@/lib/gtm';

interface QuoteFormProps {
  serviceCategoryId: string;
  serviceCategorySlug: string;
  onSubmitSuccess?: (data: any) => void;
  // New props for flexible redirect behavior
  redirectToProducts?: boolean;
  showThankYouMessage?: boolean;
  partnerId?: string;
  // Add debug partner info
  partnerInfo?: {
    company_name: string;
    contact_person: string;
    postcode: string;
    subdomain: string;
    business_description?: string;
    website_url?: string;
    logo_url?: string;
    user_id: string;
  };
}

// Define a type for the form values
interface FormValues {
  [key: string]: any;
  option_images?: Record<string, string[]>;
}

export default function QuoteForm({ 
  serviceCategoryId, 
  serviceCategorySlug,
  onSubmitSuccess,
  redirectToProducts = false, // Default to not redirecting
  showThankYouMessage = true, // Default to showing thank you message
  partnerId,
  partnerInfo
}: QuoteFormProps) {
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [submissionData, setSubmissionData] = useState<any>(null);
  
  // Check for submission ID in URL parameters and populate form
  useEffect(() => {
    async function checkSubmissionId() {
      const urlParams = new URLSearchParams(window.location.search);
      const submissionId = urlParams.get('submission');
      
      if (submissionId) {
        try {
          const supabase = await createClient();
          
          // Fetch submission data
          const { data: submission, error } = await supabase
            .from('QuoteSubmissions')
            .select(`
              *,
              FormAnswers (
                question_id,
                answer
              )
            `)
            .eq('submission_id', submissionId)
            .single();
          
          if (!error && submission) {
            // If we have a submission ID, redirect to products page instead of showing form
            const currentUrl = new URL(window.location.href);
            const baseUrl = currentUrl.origin + currentUrl.pathname;
            const productsUrl = baseUrl.replace('/quote', '/products') + '?submission=' + submissionId;
            
            console.log('Redirecting to products page:', productsUrl);
            window.location.href = productsUrl;
            return;
          }
        } catch (error) {
          console.error('Error loading submission data:', error);
        }
      }
    }
    
    checkSubmissionId();
  }, []);

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
      
      setQuestions(data as FormQuestion[]);
      setLoading(false);
    }
    
    loadQuestions();
  }, [serviceCategoryId]);
  
  function evaluateCondition(
    questionId: string, 
    values: string[], 
    operator: string, 
    formValues: FormValues
  ): boolean {
    const dependentAnswer = formValues[questionId];
    
    if (!dependentAnswer) return false;
    
    if (operator === 'OR') {
      if (Array.isArray(dependentAnswer)) {
        return dependentAnswer.some(answer => values.includes(answer));
      }
      return values.includes(dependentAnswer);
    } else {
      // AND logic
      if (Array.isArray(dependentAnswer)) {
        return values.every(value => dependentAnswer.includes(value));
      }
      return values.every(value => dependentAnswer === value);
    }
  }

  // Update active questions when formValues or questions change
  useEffect(() => {
    if (questions.length === 0) return;
    
    // Filter to get only active questions based on conditional logic
    const updateActiveQuestions = () => {
      const active = questions.filter(question => {
        // If no conditional display, it's always active
        if (!question.conditional_display) return true;
        
        // Old format backward compatibility
        if (!('conditions' in question.conditional_display) || 
            !Array.isArray((question.conditional_display as any).conditions)) {
          const { dependent_on_question_id, show_when_answer_equals, logical_operator } = question.conditional_display;
          return evaluateCondition(dependent_on_question_id, show_when_answer_equals, logical_operator, formValues);
        }
        
        // New format with multiple conditions
        const conditions = (question.conditional_display as any).conditions;
        const group_logical_operator = (question.conditional_display as any).group_logical_operator || 'AND';

        
        if (!conditions || conditions.length === 0) return true;
        
        const results = conditions.map((condition: any) => {
          const { dependent_on_question_id, show_when_answer_equals, logical_operator } = condition;
          return evaluateCondition(dependent_on_question_id, show_when_answer_equals, logical_operator, formValues);
        });
        
        // Combine results based on group operator
        if (group_logical_operator === 'AND') {
          return results.every((result: boolean) => result === true);
        } else {
          return results.some((result: boolean) => result === true);
        }
      });
      
      setActiveQuestions(active);
    };
    
    updateActiveQuestions();
  }, [questions, formValues]);
  
  // Get visible questions for a specific step
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
          onAddressSelect={handleAddressSelect}
          selectedAddress={selectedAddress}
        />
      );
    } else {
      // This is the contact details step
      return (
        <UserInfoForm
          initialUserInfo={userInfo}
          formValues={formValues}
          onUserInfoChange={setUserInfo}
          onSubmit={handleSubmit}
          questions={questions}
        />
      );
    }
  };
  
  // Update the handleValueChange function to add debugging
  const handleValueChange = (questionId: string, value: any) => {
    // Debug logging
    console.log(`Setting value for question ${questionId}:`, value);
    
    // Validate the question exists if it's not a special field like 'postcode'
    if (questionId !== 'postcode') {
      const questionExists = questions.find(q => q.question_id === questionId);
      if (!questionExists) {
        console.warn(`Warning: No matching question found for ID: ${questionId}`);
      }
    }
    
    setFormValues((prev: FormValues) => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Handle address selection from PostcodeStep
  const handleAddressSelect = (address: any) => {
    setSelectedAddress(address);
    console.log('Address selected:', address);
  };
  
  // Handle next step
  const handleNextStep = () => {
    setCurrentStep(prev => prev + 1);
  };
  
  // Handle previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (contactDetails: any) => {
    try {
      setIsRedirecting(true);
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
        service_category_id: serviceCategoryId,
        first_name: contactDetails.firstName,
        last_name: contactDetails.lastName,
        email: contactDetails.email,
        phone: contactDetails.phone || null,
        city: contactDetails.city || null,
        postcode: contactDetails.postcode,
        form_answers: filteredAnswers,
        assigned_partner_id: partnerInfo?.user_id || partnerId || null,
        submission_date: new Date().toISOString(),
        status: 'new',
        serviceCategoryName: serviceCategorySlug,
        // Include selected address data if available
        ...(selectedAddress && {
          address_line_1: selectedAddress.address_line_1,
          address_line_2: selectedAddress.address_line_2,
          street_name: selectedAddress.street_name,
          street_number: selectedAddress.street_number,
          building_name: selectedAddress.building_name,
          sub_building: selectedAddress.sub_building,
          county: selectedAddress.county,
          country: selectedAddress.country,
          formatted_address: selectedAddress.formatted_address,
          address_type: 'residential'
        })
      };
      
      // Debug log to check what's being submitted
      console.log('Submitting form data:', formData);
      
      // Submit to API with partner ID if available
      const apiUrl = new URL('/api/quote-submissions', window.location.origin);
      
      // Add partner ID from props if available
      const effectivePartnerId = partnerInfo?.user_id || partnerId;
      if (effectivePartnerId) {
        apiUrl.searchParams.append('partner_id', effectivePartnerId);
      }
      
      // Add subdomain parameter if present in URL
      const urlParams = new URLSearchParams(window.location.search);
      const subdomain = urlParams.get('subdomain');
      if (subdomain) {
        apiUrl.searchParams.append('subdomain', subdomain);
      }

      // Detect if running in iframe
      const isIframe = window.self !== window.top;
      if (isIframe) {
        apiUrl.searchParams.append('is_iframe', 'true');
      }
      
      const response = await fetch(apiUrl.toString(), {
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
      
      // Send email with the correct submission_id
      try {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
        const subdomain = hostname || null

        const emailRes = await fetch('/api/email/boiler/quote-initial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: contactDetails.firstName,
            last_name: contactDetails.lastName,
            email: contactDetails.email,
            phone: contactDetails.phone,
            postcode: contactDetails.postcode,
            quote_data: filteredAnswers,
            address_data: selectedAddress,
            questions: questions,
            submission_id: result.data.submission_id,
            subdomain,
            is_iframe: isIframe,
          }),
        })

        const emailData = await emailRes.json().catch(() => ({}))
        if (!emailRes.ok) {
          console.warn('Failed to send initial quote email:', emailData?.error || 'Unknown error')
        }
      } catch (err: any) {
        console.warn('Failed to send initial quote email:', err?.message || 'Unknown error')
      }
      
      // Trigger GTM event if event name is provided
      if (result.gtm_event_name) {
        const gtmData = {
          serviceCategoryId: formData.service_category_id,
          serviceCategoryName: serviceCategorySlug,
          firstName: contactDetails.firstName,
          lastName: contactDetails.lastName,
          email: contactDetails.email,
          phone: contactDetails.phone,
          postcode: contactDetails.postcode,
          submissionId: result.data.submission_id,
          partnerId: effectivePartnerId
        };
        
        // Use cross-frame trigger to ensure it works in iframe contexts
        triggerGTMEventCrossFrame(result.gtm_event_name, {
          event_category: 'Quote Submission',
          event_label: serviceCategorySlug || 'Unknown Service',
          ...gtmData,
          timestamp: new Date().toISOString()
        });
      }
      
      // Call onSubmitSuccess callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess(result.data);
      }
      
      // Set success state to show thank you message
      setSuccess(true);
      setIsRedirecting(false);
      
      // Send message to parent window if in iframe
      if (window.self !== window.top) {
        window.parent.postMessage({
          type: 'quote-submitted',
          submissionId: result.data.submission_id,
          data: result.data,
          gtm_event_name: result.gtm_event_name,
          service_category_id: formData.service_category_id,
          service_category_name: serviceCategorySlug,
          customer_name: `${contactDetails.firstName} ${contactDetails.lastName}`,
          customer_email: contactDetails.email,
          customer_phone: contactDetails.phone,
          customer_postcode: contactDetails.postcode,
          partner_id: effectivePartnerId
        }, '*');
      }
      
      // If redirect to products is enabled, do it immediately
      if (redirectToProducts) {
        onSubmitSuccess?.(result.data);
      } else if (showThankYouMessage) {
        // Store submission data for the thank you page
        setSubmissionData({
          ...result.data,
          serviceCategoryName: serviceCategorySlug,
          firstName: contactDetails.firstName,
          email: contactDetails.email,
          postcode: contactDetails.postcode
        });
      }
      
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
      console.error('Error submitting form:', error);
      setIsRedirecting(false);
    }
  };
  
  // Page transition variants
  const pageVariants = {
    in: { opacity: 1, x: 1 },
  };
  
  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Loading form questions...</p>
        </div>
      </div>
    );
  }
  
  if (isRedirecting) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.1 }}
        className="w-full max-w-4xl mx-auto"
      >
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-blue-500 h-2"></div>
          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 flex items-center justify-center mb-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">Submitting Your Request...</h3>
              <p className="text-gray-600 mb-8 max-w-md">
                Please wait while we process your information.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  if (success && showThankYouMessage && submissionData) {
    return (
      <ThankYouMessage
        submissionId={submissionData.submission_id}
        firstName={submissionData.firstName}
        serviceCategoryName={serviceCategorySlug}
        redirectToProducts={redirectToProducts}
        productRedirectUrl={`/services/${serviceCategorySlug}/products?submission=${submissionData.submission_id}`}
        postcode={submissionData.postcode}
        email={submissionData.email}
      />
    );
  }
  
  if (success && !showThankYouMessage) {
    // This should not be displayed as the user will be redirected immediately
    // But as a fallback, we'll show a simple message
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.1 }}
        className="w-full max-w-4xl mx-auto"
      >
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-green-500 h-2"></div>
          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 flex items-center justify-center mb-4">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">Request Submitted!</h3>
              <p className="text-gray-600 mb-4 max-w-md">
                Redirecting you to our products page...
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Debug Partner Info Section */}
      {partnerInfo && (
        <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Partner Information (Debug)</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Company:</span> {partnerInfo.company_name}</p>
            <p><span className="font-medium">Contact:</span> {partnerInfo.contact_person}</p>
            <p><span className="font-medium">Postcode:</span> {partnerInfo.postcode}</p>
            <p><span className="font-medium">Subdomain:</span> {partnerInfo.subdomain}</p>
            {partnerInfo.business_description && (
              <p><span className="font-medium">Description:</span> {partnerInfo.business_description}</p>
            )}
            {partnerInfo.website_url && (
              <p><span className="font-medium">Website:</span> <a href={partnerInfo.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{partnerInfo.website_url}</a></p>
            )}
            {partnerInfo.logo_url && (
              <div className="mt-2">
                <span className="font-medium">Logo:</span>
                <img src={partnerInfo.logo_url} alt="Partner Logo" className="mt-1 h-12 object-contain" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Back button and service name */}
      <div className="mb-8">
        <motion.a 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200"
          whileHover={{ x: -3 }}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </motion.a>
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-semibold text-gray-900 mt-2 capitalize"
        >
          {serviceCategorySlug.replace(/-/g, ' ')} Quote Form
        </motion.h1>
      </div>
      
      {/* Main progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium flex items-center">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 text-xs">
              {currentStep}
            </div>
            <span>of {totalSteps} steps</span>
          </span>
          <span className="text-sm text-gray-500 font-medium">
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <motion.div 
            className="bg-blue-600 h-2.5 rounded-full"
            initial={{ width: `${((currentStep - 1) / totalSteps) * 100}%` }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.5 }}
          ></motion.div>
        </div>
      </div>
      
      {/* Main content container */}
      <div className="overflow-hidden">
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 rounded-md text-red-800 flex items-start"
          >
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium">{error}</p>
              <p className="text-sm mt-1">Please try again or contact support if the issue persists.</p>
            </div>
          </motion.div>
        )}
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.1 }}
          >
            {getCurrentStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}