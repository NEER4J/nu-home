"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FormQuestion } from '@/types/database.types';
import { ChevronLeft } from 'lucide-react';
import PostcodeStep from '@/components/category-commons/quote/PostcodeStep';
import UserInfoForm from '@/components/category-commons/quote/UserInfoForm';
import QuoteFormSteps from '@/components/category-commons/quote/QuoteFormSteps';
import { useDynamicStyles } from '@/hooks/use-dynamic-styles';

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
    company_color?: string;
    otp?: boolean;
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
  const [formValues, setFormValues] = useState<FormValues>({});
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partnerInfoFromSubdomain, setPartnerInfoFromSubdomain] = useState<any>(null);
  const supabase = createClient();

  // Get dynamic color based on partner info
  const getDynamicColor = () => {
    const effectivePartner = partnerInfo || partnerInfoFromSubdomain;
    return effectivePartner?.company_color || '#2563eb';
  }; 

  // Use dynamic styles hook
  const effectivePartner = partnerInfo || partnerInfoFromSubdomain;
  const classes = useDynamicStyles(effectivePartner?.company_color || null); 

  // Get the heating service category ID
  useEffect(() => {
    async function getHeatingCategoryId() {
      if (serviceCategoryId) return serviceCategoryId;
      
      const { data, error } = await supabase
        .from('ServiceCategories')
        .select('service_category_id')
        .eq('slug', 'boiler')
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
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        
        if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
          const { data: partner, error } = await supabase
            .from('UserProfiles')
            .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color, otp')
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
    
    if (!partnerInfo) {
      fetchPartnerFromSubdomain();
    }
  }, [partnerInfo]);

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
      if (Array.isArray(dependentAnswer)) {
        return dependentAnswer.every(value => dependentAnswer.includes(value));
      }
      return values.every(value => dependentAnswer === value);
    }
  }

  // Update active questions when formValues or questions change
  useEffect(() => {
    if (questions.length === 0) return;
    
    const updateActiveQuestions = () => {
      const active = questions.filter(question => {
        if (!question.conditional_display) return true;
        
        if (!('conditions' in question.conditional_display) || 
            !Array.isArray((question.conditional_display as any).conditions)) {
          const { dependent_on_question_id, show_when_answer_equals, logical_operator } = question.conditional_display;
          return evaluateCondition(dependent_on_question_id, show_when_answer_equals, logical_operator, formValues);
        }
        
        const conditions = (question.conditional_display as any).conditions;
        const group_logical_operator = (question.conditional_display as any).group_logical_operator || 'AND';

        if (!conditions || conditions.length === 0) return true;
        
        const results = conditions.map((condition: any) => {
          const { dependent_on_question_id, show_when_answer_equals, logical_operator } = condition;
          return evaluateCondition(dependent_on_question_id, show_when_answer_equals, logical_operator, formValues);
        });
        
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
  const totalSteps = activeSteps.length + 2;

  // Handle value changes
  const handleValueChange = (questionId: string, value: any) => {
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

      const { data: categoryData } = await supabase
        .from('ServiceCategories')
        .select('service_category_id')
        .eq('slug', 'boiler')
        .eq('is_active', true)
        .single();

      if (!categoryData) {
        throw new Error('Heating category not found');
      }

      const filteredAnswers = Object.entries(formValues).reduce((acc: Record<string, any>, [key, value]) => {
        if (key === 'postcode' || !value) return acc;
        
        const question = questions.find(q => q.question_id === key);
        
        if (question) {
          acc[key] = value;
        }
        
        return acc;
      }, {});

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
        serviceCategoryName: 'boiler'
      };
      
      const apiUrl = new URL('/api/quote-submissions', window.location.origin);
      
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
      
      router.push(`/boiler/products?submission=${result.data.submission_id}`);
      return;
      
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
      console.error('Error submitting heating quote form:', error);
      setIsSubmitting(false);
    }
  };

  // Get current step content
  const getCurrentStepContent = () => {
    if (currentStep <= activeSteps.length) {
      const currentQuestionStep = activeSteps[currentStep - 1];
      const currentQuestions = getVisibleQuestionsForStep(currentQuestionStep);
      const currentQuestion = currentQuestions[0];
      
      if (!currentQuestion) return null;

      return (
        <div className="space-y-3 sm:space-y-4 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black leading-tight">
            {currentQuestion.question_text}
            {currentQuestion.is_required && <span className="text-red-500 ml-1">*</span>}
          </h1>
        </div>
      );
    } else if (currentStep === activeSteps.length + 1) {
      return (
        <div className="space-y-6 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black leading-tight">
            What's your address?
          </h1>
          <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
            Enter your postcode to find your address
          </p>
        </div>
      );
    } else if (currentStep === activeSteps.length + 2) {
      return (
        <div className="space-y-6 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black leading-tight">
            Tell us about yourself
          </h1>
          <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
            We'll use this information to prepare your quote
          </p>
        </div>
      );
    }
    
    return null;
  };

  const getCurrentStepForm = () => {
    if (currentStep <= activeSteps.length) {
      const currentQuestionStep = activeSteps[currentStep - 1];
      const currentQuestions = getVisibleQuestionsForStep(currentQuestionStep);
      
      if (currentQuestions.length === 0) return null;

      return (
        <div className="mt-12 lg:mt-16">
          <QuoteFormSteps
            questions={currentQuestions}
            formValues={formValues}
            onValueChange={handleValueChange}
            onNext={handleNextStep}
            onPrevious={handlePrevStep}
            showPrevious={currentStep > 1}
            companyColor={getDynamicColor()}
            currentStep={currentStep}
            totalSteps={totalSteps}
          />
        </div>
      );
    } else if (currentStep === activeSteps.length + 1) {
      return (
        <div className="mt-12 lg:mt-16 max-w-md mx-auto">
          <PostcodeStep
            value={formValues.postcode || ''}
            onValueChange={(postcode) => handleValueChange('postcode', postcode)}
            onNext={handleNextStep}
            onPrevious={handlePrevStep}
            companyColor={getDynamicColor()}
          />
        </div>
      );
    } else if (currentStep === activeSteps.length + 2) {
      return (
        <div className="mt-12 lg:mt-16 max-w-lg mx-auto">
          <UserInfoForm
            initialUserInfo={userInfo}
            formValues={formValues}
            onUserInfoChange={setUserInfo}
            onSubmit={handleSubmit}
            companyColor={getDynamicColor()}
            otpEnabled={effectivePartner?.otp || false}
          />
        </div>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div 
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4"
            style={{ 
              borderColor: `${getDynamicColor()}40`,
              borderTopColor: 'transparent'
            }}
          ></div>
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
              className="px-4 py-2 text-white rounded-md hover:opacity-90"
              style={{ backgroundColor: getDynamicColor() }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  

  return (
    <div className="min-h-screen bg-gray-100 relative flex items-center">
      {/* Progress Bar */}
      <div className="h-1 bg-gray-200 relative overflow-hidden">
        <div
          className={`h-full ${classes.progress}`}
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-6 py-16 lg:py-24">
        <div className="w-full max-w-3xl">
          {/* Question/Step Content */}
          {getCurrentStepContent()}
          
          {/* Form */}
          {getCurrentStepForm()}
        </div>
      </main>

      {/* Back Button - Bottom Left Corner */}
      {currentStep > 1 && (
        <button
          onClick={handlePrevStep}
          className="fixed bottom-6 left-6 flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50 z-50"
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
      )}
    </div>
  );
}
