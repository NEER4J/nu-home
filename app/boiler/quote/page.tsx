"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FormQuestion } from '@/types/database.types';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronLeft, Info, Check, MessageCircle, Phone } from 'lucide-react';
import PostcodeStep from '@/components/category-commons/quote/PostcodeStep';
import ContactDetailsStep from '@/components/category-commons/quote/ContactDetailsStep';

interface HeatingQuotePageProps {
  serviceCategoryId?: string;
  partnerId?: string;
  partnerInfo?: {
    company_name: string;
    contact_person: string;
    postcode: string;
    subdomain: string;
    business_description?: string;
    website_url?: string;
    logo_url?: string;
    user_id: string;
    phone?: string;
  };
}

interface FormValues {
  [key: string]: any;
  postcode?: string;
}

export default function HeatingQuotePage({ 
  serviceCategoryId,
  partnerId,
  partnerInfo 
}: HeatingQuotePageProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partnerInfoFromSubdomain, setPartnerInfoFromSubdomain] = useState<any>(null);
  const [showPartnerInfo, setShowPartnerInfo] = useState(true);
  const supabase = createClient();

  // Get the heating service category ID
  useEffect(() => {
    async function getHeatingCategoryId() {
      if (serviceCategoryId) return serviceCategoryId;
      
      const { data, error } = await supabase
        .from('ServiceCategories')
        .select('service_category_id')
        .eq('slug', 'heating')
        .eq('is_active', true)
        .single();
      
      if (error) {
        console.error('Error fetching heating category:', error);
        setError('Failed to load heating category');
        setLoading(false);
        return;
      }
      
      return data?.service_category_id;
    }

    async function loadQuestions() {
      const categoryId = await getHeatingCategoryId();
      if (!categoryId) return;

      const { data, error } = await supabase
        .from('FormQuestions')
        .select('*')
        .eq('service_category_id', categoryId)
        .eq('status', 'active')
        .eq('is_deleted', false)
        .order('step_number')
        .order('display_order_in_step');
      
      if (error) {
        console.error('Error fetching form questions:', error);
        setError('Failed to load form questions');
        setQuestions([]);
        setLoading(false);
        return;
      }
      
      setQuestions(data as FormQuestion[]);
      setLoading(false);
    }
    
    loadQuestions();
  }, [serviceCategoryId]);

  // Fetch partner information from subdomain
  useEffect(() => {
    async function fetchPartnerFromSubdomain() {
      try {
        // Get subdomain from hostname
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        
        if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
          const { data: partner, error } = await supabase
            .from('UserProfiles')
            .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone')
            .eq('subdomain', subdomain)
            .eq('status', 'active')
            .single();
          
          if (!error && partner) {
            setPartnerInfoFromSubdomain(partner);
          }
        }
      } catch (error) {
        console.error('Error fetching partner from subdomain:', error);
      }
    }
    
    // Only fetch if we don't already have partner info passed as props
    if (!partnerInfo) {
      fetchPartnerFromSubdomain();
    }
  }, [supabase, partnerInfo]);

  // Conditional logic evaluation
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
    
    const updateActiveQuestions = () => {
      const active = questions.filter(question => {
        // If no conditional display, it's always active
        if (!question.conditional_display) return true;
        
        // Handle conditional display logic
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

  // Handle value changes
  const handleValueChange = (questionId: string, value: any) => {
    console.log(`Setting value for question ${questionId}:`, value);
    
    setFormValues((prev: FormValues) => ({
      ...prev,
      [questionId]: value
    }));
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
      setIsSubmitting(true);
      setError(null);

      // Get the heating category ID
      const { data: categoryData } = await supabase
        .from('ServiceCategories')
        .select('service_category_id')
        .eq('slug', 'heating')
        .eq('is_active', true)
        .single();

      if (!categoryData) {
        throw new Error('Heating category not found');
      }

      // Filter out non-question data from formValues
      const filteredAnswers = Object.entries(formValues).reduce((acc: Record<string, any>, [key, value]) => {
        // Skip special keys and empty values
        if (key === 'postcode' || !value) return acc;
        
        // Find the associated question
        const question = questions.find(q => q.question_id === key);
        
        if (question) {
          acc[key] = value;
        }
        
        return acc;
      }, {});

      // Combine complete form data
      const formData = {
        service_category_id: categoryData.service_category_id,
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
        serviceCategoryName: 'heating'
      };
      
      console.log('Submitting heating quote form data:', formData);
      
      // Submit to API
      const apiUrl = new URL('/api/quote-submissions', window.location.origin);
      
      // Add partner ID if available
      const effectivePartnerId = partnerInfo?.user_id || partnerId;
      if (effectivePartnerId) {
        apiUrl.searchParams.append('partner_id', effectivePartnerId);
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
        throw new Error(result.error || 'Failed to submit heating quote request');
      }
      
      // Set success state
      setSuccess(true);
      setIsSubmitting(false);
      
      // Redirect to thank you page or products page
      setTimeout(() => {
        router.push(`/boiler/products?submission=${result.data.submission_id}`);
      }, 2000);
      
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
      console.error('Error submitting heating quote form:', error);
      setIsSubmitting(false);
    }
  };

  // Get current step content
  const getCurrentStepContent = () => {
    if (currentStep <= activeSteps.length) {
      // This is a question step - render individual question
      const currentQuestionStep = activeSteps[currentStep - 1];
      const currentQuestions = getVisibleQuestionsForStep(currentQuestionStep);
      const currentQuestion = currentQuestions[0]; // Get first question for the step
      
      if (!currentQuestion) return null;

      return (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.question_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="space-y-3 sm:space-y-4 text-center"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black leading-tight">
              {currentQuestion.question_text}
              {currentQuestion.is_required && <span className="text-red-500 ml-1">*</span>}
            </h1>
       
          </motion.div>
        </AnimatePresence>
      );
    } else if (currentStep === activeSteps.length + 1) {
      // This is the postcode step
      return (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="space-y-6 text-center"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black leading-tight">
              What's your address?
            </h1>
            <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
              Enter your postcode to find your address
            </p>
          </motion.div>
        </AnimatePresence>
      );
    } else {
      // This is the contact details step
      return (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="space-y-6 text-center"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black leading-tight">
              Tell us about yourself
            </h1>
            <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
              We'll use this information to prepare your quote
            </p>
          </motion.div>
        </AnimatePresence>
      );
    }
  };

  const getCurrentOptions = () => {
    if (currentStep <= activeSteps.length) {
      const currentQuestionStep = activeSteps[currentStep - 1];
      const currentQuestions = getVisibleQuestionsForStep(currentQuestionStep);
      const currentQuestion = currentQuestions[0];
      
      if (!currentQuestion) return null;

      const currentValue = formValues[currentQuestion.question_id] || '';

      if (currentQuestion.is_multiple_choice && currentQuestion.answer_options) {
        const options = Array.isArray(currentQuestion.answer_options) 
          ? currentQuestion.answer_options 
          : [];

        return (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.question_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="space-y-4 sm:space-y-6"
            >
              {/* Check if any option has an image to determine layout */}
              {options.some((option: any) => typeof option === 'object' && option?.image) ? (
                // Grid layout for options with images
                <div className="flex flex-wrap justify-center gap-4 max-w-5xl mx-auto">
                  {options.map((option: any, index: number) => {
                    const optionText = typeof option === 'object' && option !== null ? option.text || option : option;
                    const optionImage = typeof option === 'object' && option !== null ? option.image : null;
                    const isSelected = currentValue === optionText;
                    
                    return (
                      <motion.button
                        key={index}
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0 }}
                        onClick={() => {
                          handleValueChange(currentQuestion.question_id, optionText);
                          // Auto-advance after selection
                          setTimeout(() => {
                            handleNextStep();
                          }, 300);
                        }}
                        className={`relative p-6 rounded-2xl text-center group transition-all duration-200 w-40 h-40 sm:w-44 sm:h-44 flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                            : 'bg-white text-black hover:bg-blue-50 hover:shadow-md border border-gray-200'
                        }`}
                      >
                        {/* Option Image */}
                        {optionImage && (
                          <div className="mb-4">
                            <img 
                              src={optionImage} 
                              alt={optionText}
                              className={`w-16 h-16 sm:w-24 sm:h-24 object-contain mx-auto transition-all duration-200 ${
                                isSelected ? 'filter invert brightness-0' : ''
                              }`}
                              onError={(e) => {
                                // Hide image if it fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Option Text */}
                        <span className="text-sm sm:text-base font-medium text-center leading-tight">{optionText}</span>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                // List layout for options without images (existing layout)
                <div className="space-y-3 sm:space-y-4 max-w-md mx-auto">
                  {options.map((option: any, index: number) => {
                    const optionText = typeof option === 'object' && option !== null ? option.text || option : option;
                    const isSelected = currentValue === optionText;
                    
                    return (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.15, ease: "easeOut" }}
                        onClick={() => {
                          handleValueChange(currentQuestion.question_id, optionText);
                          // Auto-advance after selection
                          setTimeout(() => {
                            handleNextStep();
                          }, 300);
                        }}
                        className={`w-full p-4 sm:p-4 rounded-full text-left group ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-black hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          {/* Selection Indicator */}
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                            isSelected
                              ? 'bg-white'
                              : 'bg-gray-200 group-hover:bg-white'
                          }`}>
                            {isSelected ? (
                              <Check size={10} className="sm:w-3 sm:h-3 text-blue-600" />
                            ) : (
                              <>
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full group-hover:hidden" />
                                <Check size={16} className="sm:w-5 sm:h-5 text-blue-600 hidden group-hover:block" strokeWidth={3} />
                              </>
                            )}
                          </div>
                          
                          {/* Option Text */}
                          <span className="text-base sm:text-lg font-medium flex-1">{optionText}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        );
      } else {
        // Text input question
        return (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.question_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="space-y-4 sm:space-y-6 max-w-md mx-auto"
            >
              <input
                type="text"
                value={currentValue}
                onChange={(e) => handleValueChange(currentQuestion.question_id, e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && currentValue.trim()) {
                    handleNextStep();
                  }
                }}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="Enter your answer..."
              />
              
              {currentValue.trim() && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleNextStep}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Continue
                </motion.button>
              )}
            </motion.div>
          </AnimatePresence>
        );
      }
    } else if (currentStep === activeSteps.length + 1) {
      // Postcode step
      return (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="max-w-md mx-auto"
          >
            <PostcodeStep
              value={formValues.postcode || ''}
              onValueChange={(postcode) => handleValueChange('postcode', postcode)}
              onNext={handleNextStep}
              onPrevious={handlePrevStep}
            />
          </motion.div>
        </AnimatePresence>
      );
    } else {
      // Contact details step
      return (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="max-w-lg mx-auto"
          >
            <ContactDetailsStep
              formValues={formValues}
              onSubmit={handleSubmit}
              onPrevious={handlePrevStep}
            />
          </motion.div>
        </AnimatePresence>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Loading heating quote form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Form</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center"
        >
          <div className="text-green-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Quote Submitted Successfully!</h3>
          <p className="text-gray-600 mb-4">
            Thank you for your interest in our heating services. We'll be in touch soon with your personalized quote.
          </p>
          <p className="text-sm text-gray-500">Redirecting to available products...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 relative flex items-center">
      {/* Progress Bar */}
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="h-1 bg-gray-200 relative overflow-hidden"
      >
        <motion.div
          className="h-full bg-blue-600"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </motion.div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-6 py-16 lg:py-24">
        <div className="w-full max-w-3xl">
          {/* Question/Step Content */}
          {getCurrentStepContent()}
          
          {/* Options/Form */}
          <div className="mt-12 lg:mt-16">
            {getCurrentOptions()}
          </div>
        </div>
      </main>

      {/* Back Button - Bottom Left Corner */}
      {currentStep > 1 && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handlePrevStep}
          className="fixed bottom-6 left-6 flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors z-50"
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </motion.button>
      )}

      
    </div>
  );
}
