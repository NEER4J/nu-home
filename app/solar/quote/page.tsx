"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FormQuestion } from '@/types/database.types';
import { ChevronLeft } from 'lucide-react';
import PostcodeStep from '@/components/category-commons/quote/PostcodeStep';
import UserInfoForm from '@/components/category-commons/quote/UserInfoForm';
import QuoteFormSteps from '@/components/category-commons/quote/QuoteFormSteps';
import RoofMappingStep from '@/components/category-commons/quote/RoofMappingStep';
import { useDynamicStyles } from '@/hooks/use-dynamic-styles';
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner';
import { QuoteLoader } from '@/components/category-commons/Loader';
import { triggerQuoteSubmissionEvent, triggerGTMEventCrossFrame } from '@/lib/gtm';
import IframeNavigationTracker from '@/components/IframeNavigationTracker';

// Helper function to save data to lead_submission_data table
const saveLeadSubmissionData = async (
  supabase: any,
  submissionId: string,
  partnerId: string,
  serviceCategoryId: string,
  data: any,
  currentPage: string,
  pagesCompleted: string[] = []
) => {
  try {
    const { error } = await supabase
      .from('lead_submission_data')
      .upsert({
        submission_id: submissionId,
        partner_id: partnerId,
        service_category_id: serviceCategoryId,
        ...data,
        current_page: currentPage,
        pages_completed: pagesCompleted,
        last_activity_at: new Date().toISOString(),
        session_id: typeof window !== 'undefined' ? 
          (window as any).sessionStorage?.getItem('session_id') || 
          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
          `server_${Date.now()}`,
        device_info: typeof window !== 'undefined' ? {
          user_agent: navigator.userAgent,
          screen_resolution: `${screen.width}x${screen.height}`,
          viewport_size: `${window.innerWidth}x${window.innerHeight}`,
          language: navigator.language,
          platform: navigator.platform,
          cookie_enabled: navigator.cookieEnabled,
          online_status: navigator.onLine
        } : {},
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'submission_id'
      });

    if (error) {
      console.error('Error saving lead submission data:', error);
    } else {
      console.log('Successfully saved lead submission data for page:', currentPage);
    }
  } catch (error) {
    console.error('Error in saveLeadSubmissionData:', error);
  }
};

// Helper function to update OTP verification stage
const updateOtpVerificationStage = async (
  supabase: any,
  submissionId: string,
  stage: 'otp_sent' | 'otp_verified',
  additionalData?: any
) => {
  try {
    // Get current data
    const { data: currentData, error: fetchError } = await supabase
      .from('lead_submission_data')
      .select('quote_data')
      .eq('submission_id', submissionId)
      .single();

    if (fetchError) {
      console.error('Error fetching current data for OTP stage update:', fetchError);
      return;
    }

    const currentQuoteData = currentData?.quote_data || {};
    const currentStageHistory = currentQuoteData.stage_history || [];

    // Create new stage entry
    const newStageEntry = {
      stage: stage,
      timestamp: new Date().toISOString(),
      data: additionalData || {}
    };

    // Update the quote_data with new stage
    const updatedQuoteData = {
      ...currentQuoteData,
      verification_stage: stage,
      stage_history: [...currentStageHistory, newStageEntry],
      // Mark as complete if OTP is verified
      ...(stage === 'otp_verified' && {
        is_complete: true,
        completed_at: new Date().toISOString()
      })
    };

    // Update in database
    const { error: updateError } = await supabase
      .from('lead_submission_data')
      .update({
        quote_data: updatedQuoteData,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('submission_id', submissionId);

    if (updateError) {
      console.error('Error updating OTP verification stage:', updateError);
    } else {
      console.log(`Successfully updated OTP stage to: ${stage} for submission: ${submissionId}`);
    }

    // Add conversion event for OTP verified
    if (stage === 'otp_verified') {
      const currentConversionEvents = currentData?.conversion_events || [];
      const newConversionEvent = {
        event: 'otp_verified',
        timestamp: new Date().toISOString(),
        data: {
          submission_id: submissionId,
          verification_completed_at: new Date().toISOString(),
          ...additionalData
        }
      };

      await supabase
        .from('lead_submission_data')
        .update({
          conversion_events: [...currentConversionEvents, newConversionEvent]
        })
        .eq('submission_id', submissionId);
    }

  } catch (error) {
    console.error('Error in updateOtpVerificationStage:', error);
  }
};

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

export default function SolarQuotePage({ 
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
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partnerInfoFromDomain, setPartnerInfoFromDomain] = useState<PartnerProfile | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [showOtpScreen, setShowOtpScreen] = useState<boolean>(false);
  const [pageStartTime, setPageStartTime] = useState<number>(Date.now());
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const [roofMappingData, setRoofMappingData] = useState<any>(null);
  const supabase = createClient();

  // Background database save function (non-blocking)
  const saveLeadSubmissionDataInBackground = async (
    submissionId: string,
    partnerId: string,
    serviceCategoryId: string,
    filteredAnswers: any,
    selectedAddress: any,
    contactDetails: any,
    questions: any[],
    isOtpEnabled: boolean,
    pageStartTime: number
  ) => {
    try {
      const totalTimeOnPage = Date.now() - pageStartTime;
      
      // Create enhanced form answers with question text
      const formAnswersWithText = Object.entries(filteredAnswers).reduce((acc, [key, val]) => {
        const q = questions.find(question => question.question_id === key);
        acc[key] = {
          question_id: key,
          question_text: q?.question_text || key,
          answer: val,
          answered_at: new Date().toISOString()
        };
        return acc;
      }, {} as Record<string, any>);

      // Determine the current stage and completion status
      const currentStage = isOtpEnabled ? 'details_filled' : 'completed';
      const isComplete = !isOtpEnabled; // Complete immediately if no OTP required

      await saveLeadSubmissionData(
        supabase,
        submissionId,
        partnerId,
        serviceCategoryId,
        {
          quote_data: {
            form_answers: formAnswersWithText,
            selected_address: selectedAddress,
            contact_details: {
              first_name: contactDetails.firstName,
              last_name: contactDetails.lastName,
              email: contactDetails.email,
              phone: contactDetails.phone,
              postcode: contactDetails.postcode,
              city: contactDetails.city
            },
            // Stage tracking
            verification_stage: currentStage,
            otp_enabled: isOtpEnabled,
            stage_history: [{
              stage: 'details_filled',
              timestamp: new Date().toISOString(),
              data: {
                form_questions_answered: Object.keys(filteredAnswers).length,
                total_questions: questions.length,
                otp_required: isOtpEnabled
              }
            }],
            // Completion tracking
            completed_at: isComplete ? new Date().toISOString() : null,
            is_complete: isComplete,
            total_time_on_page_ms: totalTimeOnPage,
            form_submission_count: 1
          },
          form_submissions: [{
            submission_id: submissionId,
            submitted_at: new Date().toISOString(),
            form_type: 'quote',
            data_completeness: Object.keys(filteredAnswers).length,
            total_questions: questions.length,
            verification_stage: currentStage
          }],
          conversion_events: [{
            event: isComplete ? 'quote_completed' : 'details_filled',
            timestamp: new Date().toISOString(),
            data: {
              submission_id: submissionId,
              partner_id: partnerId,
              service_category: 'solar',
              verification_stage: currentStage,
              otp_required: isOtpEnabled
            }
          }],
          page_timings: {
            quote_page: {
              total_time_ms: totalTimeOnPage,
              started_at: new Date(pageStartTime).toISOString(),
              completed_at: new Date().toISOString()
            }
          }
        },
        'products',
        ['quote']
      );
      console.log('Lead submission data saved successfully in background');
    } catch (error) {
      console.error('Error saving lead submission data in background:', error);
    }
  };

  // Background email sending function (non-blocking with persistence)
  const sendInitialEmailInBackground = async (submissionId: string) => {
    console.log('🚀 Starting sendInitialEmailInBackground with submissionId:', submissionId)
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const subdomain = hostname || null
      
      // Detect if running in iframe
      const isIframe = typeof window !== 'undefined' ? window.self !== window.top : false
      
      // Generate quote link for the customer
      const quoteLink = typeof window !== 'undefined' 
        ? `${window.location.origin}/solar/products?submission=${submissionId}`
        : null

      const emailData = {
        submissionId: submissionId,
        subdomain,
        is_iframe: isIframe,
        quoteLink: quoteLink,
      }

      console.log('📧 Email data to send:', emailData)

      // Use sendBeacon for critical email sending (persists through page navigation)
      if (typeof window !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(emailData)], { type: 'application/json' })
        const success = navigator.sendBeacon('/api/email/solar/quote-initial-v2', blob)
        console.log('📡 sendBeacon result:', success)
        if (success) {
          console.log('✅ Initial quote email queued with sendBeacon')
        } else {
          console.log('⚠️ sendBeacon failed, trying fetch fallback')
          // Fallback to fetch if sendBeacon fails
          const response = await fetch('/api/email/solar/quote-initial-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData),
          })
          console.log('📡 Fetch fallback response:', response.status, response.statusText)
        }
      } else {
        console.log('📡 Using regular fetch (sendBeacon not available)')
        // Fallback to regular fetch
        const emailRes = await fetch('/api/email/solar/quote-initial-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailData),
        })

        const responseData = await emailRes.json().catch(() => ({}))
        console.log('📡 Fetch response:', emailRes.status, responseData)
        if (!emailRes.ok) {
          console.error('❌ Failed to send initial quote email:', responseData?.error || 'Unknown error')
        } else {
          console.log('✅ Initial quote email sent successfully in background')
        }
      }
    } catch (err: any) {
      console.warn('Failed to send initial quote email in background:', err?.message || 'Unknown error')
    }
  };

  // Get dynamic color based on partner info
  const getDynamicColor = () => {
    const effectivePartner = partnerInfo || partnerInfoFromDomain;
    return effectivePartner?.company_color || '#2563eb';
  }; 

  // Use dynamic styles hook
  const effectivePartner = partnerInfo || partnerInfoFromDomain;
  const classes = useDynamicStyles(effectivePartner?.company_color || null);

  // Upload roof mapping image to Supabase
  const uploadRoofMappingImage = async (submissionId: string, imageData: string) => {
    try {
      const response = await fetch('/api/roof-mapping/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId,
          imageData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const result = await response.json();
      console.log('Roof mapping image uploaded:', result.imageUrl);
      return result.imageUrl;
    } catch (error) {
      console.error('Error uploading roof mapping image:', error);
      throw error;
    }
  }; 

  // Initialize session tracking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Generate session ID if not exists
      if (!sessionStorage.getItem('session_id')) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('session_id', sessionId);
      }
    }
  }, []);

  // Get the solar service category ID
  useEffect(() => {
    async function getSolarCategoryId() {
      if (serviceCategoryId) return serviceCategoryId;
      
      const { data, error } = await supabase
        .from('ServiceCategories')
        .select('service_category_id')
        .eq('slug', 'solar')
        .eq('is_active', true)
        .single();
      
      if (error) {
        console.error('Error fetching solar category:', error);
        setError('Failed to load solar category');
        setLoading(false);
        return;
      }
      
      return data?.service_category_id;
    }

    async function loadQuestions() {
      const categoryId = await getSolarCategoryId();
      if (!categoryId) return;

      // Get the effective partner ID
      const effectivePartnerId = partnerInfo?.user_id || partnerId || partnerInfoFromDomain?.user_id;
      if (!effectivePartnerId) {
        // Don't set error here, just return - partner info might still be loading
        console.log('Partner information not yet available, waiting...');
        return;
      }

      const { data, error } = await supabase
        .from('FormQuestions')
        .select('*')
        .eq('service_category_id', categoryId)
        .eq('user_id', effectivePartnerId) // Filter by partner's user_id
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
      
      setQuestions(data as unknown as FormQuestion[]);
      setLoading(false);
    }
    
    // Only load questions if we have partner information
    const effectivePartnerId = partnerInfo?.user_id || partnerId || partnerInfoFromDomain?.user_id;
    if (effectivePartnerId) {
      loadQuestions();
    }
  }, [serviceCategoryId, partnerInfo, partnerId, partnerInfoFromDomain]);

  // Fetch partner information by host (custom domain preferred, fallback to subdomain)
  useEffect(() => {
    async function fetchPartnerByHost() {
      try {
        const hostname = window.location.hostname;
        const partner = await resolvePartnerByHost(supabase, hostname);
        if (partner) {
          setPartnerInfoFromDomain(partner);
        }
      } catch (error) {
        console.error('Error resolving partner from host:', error);
      }
    }
    if (!partnerInfo) {
      fetchPartnerByHost();
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
  
  // Get total steps (active question steps + postcode + roof mapping + contact details)
  const totalSteps = activeSteps.length + 3;


  // Handle value changes
  const handleValueChange = async (questionId: string, value: any) => {
    setFormValues((prev: FormValues) => ({
      ...prev,
      [questionId]: value
    }));

    // Save quote data if we have submission info
    if (submissionId && partnerInfoFromDomain?.user_id) {
      const effectivePartnerId = partnerInfo?.user_id || partnerId || partnerInfoFromDomain?.user_id;
      const categoryId = serviceCategoryId || (await supabase
        .from('ServiceCategories')
        .select('service_category_id')
        .eq('slug', 'solar')
        .eq('is_active', true)
        .single()).data?.service_category_id;

      if (effectivePartnerId && categoryId) {
        // Find the question to get its text
        const question = questions.find(q => q.question_id === questionId);
        const questionText = question?.question_text || questionId;
        
        // Create enhanced form answers with question text
        const enhancedFormAnswers = { ...formValues, [questionId]: value };
        const formAnswersWithText = Object.entries(enhancedFormAnswers).reduce((acc, [key, val]) => {
          const q = questions.find(question => question.question_id === key);
          acc[key] = {
            question_id: key,
            question_text: q?.question_text || key,
            answer: val,
            answered_at: new Date().toISOString()
          };
          return acc;
        }, {} as Record<string, any>);
        
        await saveLeadSubmissionData(
          supabase,
          submissionId,
          effectivePartnerId,
          categoryId.toString(),
          {
            quote_data: {
              form_answers: formAnswersWithText,
              current_step: currentStep,
              last_updated: new Date().toISOString()
            }
          },
          'quote',
          []
        );
      }
    }
  };

  // Handle address selection from PostcodeStep
  const handleAddressSelect = async (address: any) => {
    setSelectedAddress(address);
    console.log('Address selected:', address);

    // Save address data if we have submission info
    if (submissionId && partnerInfoFromDomain?.user_id) {
      const effectivePartnerId = partnerInfo?.user_id || partnerId || partnerInfoFromDomain?.user_id;
      const categoryId = serviceCategoryId || (await supabase
        .from('ServiceCategories')
        .select('service_category_id')
        .eq('slug', 'solar')
        .eq('is_active', true)
        .single()).data?.service_category_id;

      if (effectivePartnerId && categoryId) {
        // Create enhanced form answers with question text
        const formAnswersWithText = Object.entries(formValues).reduce((acc, [key, val]) => {
          const q = questions.find(question => question.question_id === key);
          acc[key] = {
            question_id: key,
            question_text: q?.question_text || key,
            answer: val,
            answered_at: new Date().toISOString()
          };
          return acc;
        }, {} as Record<string, any>);

        await saveLeadSubmissionData(
          supabase,
          submissionId,
          effectivePartnerId,
          categoryId.toString(),
          {
            quote_data: {
              form_answers: formAnswersWithText,
              selected_address: address,
              address_selected_at: new Date().toISOString(),
              last_updated: new Date().toISOString()
            }
          },
          'quote',
          []
        );
      }
    }
  };

  // Handle roof mapping completion
  const handleRoofMappingComplete = (mappingData: any) => {
    setRoofMappingData(mappingData);
    console.log('Roof mapping completed:', mappingData);
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

  // Handle initial form data saving (called immediately after form submission)
  const saveInitialFormData = async (contactDetails: any) => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate submission');
      return null;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);

      const { data: categoryData } = await supabase
        .from('ServiceCategories')
        .select('service_category_id')
        .eq('slug', 'solar')
        .eq('is_active', true)
        .single();

      if (!categoryData || !categoryData.service_category_id) {
        throw new Error('Solar category not found');
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
        serviceCategoryName: 'solar',
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
        }),
        // Include roof mapping data if available
        ...(roofMappingData && {
          roof_mapping_data: roofMappingData
        })
      };
      
      const apiUrl = new URL('/api/quote-submissions', window.location.origin);
      
      const effectivePartnerId = partnerInfo?.user_id || partnerId || partnerInfoFromDomain?.user_id || null;
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
        throw new Error(result.error || 'Failed to submit solar quote request');
      }

      // Set submission ID for tracking
      setSubmissionId(result.data.submission_id);

      // Upload roof mapping image to Supabase if available
      if (roofMappingData?.roofImage) {
        try {
          await uploadRoofMappingImage(result.data.submission_id, roofMappingData.roofImage);
          console.log('✅ Roof mapping image uploaded successfully');
        } catch (error) {
          console.error('❌ Failed to upload roof mapping image:', error);
        }
      }

      // Save initial quote data to lead_submission_data in background (non-blocking)
      const finalEffectivePartnerId = partnerInfo?.user_id || partnerId || partnerInfoFromDomain?.user_id;
      if (finalEffectivePartnerId) {
        try {
          await saveLeadSubmissionDataInBackground(
            result.data.submission_id,
            finalEffectivePartnerId,
            String(categoryData.service_category_id),
            filteredAnswers,
            selectedAddress,
            contactDetails,
            questions,
            effectivePartner?.otp || false,
            pageStartTime
          )
          console.log('✅ Lead submission data saved successfully')
          
          // Send email after data is saved
          if (!emailSent) {
            setEmailSent(true) // Mark email as sent to prevent duplicates
            sendInitialEmailInBackground(result.data.submission_id)
          }
        } catch (err) {
          console.warn('Failed to save lead submission data:', err)
          // Still try to send email even if data saving fails
          if (!emailSent) {
            setEmailSent(true)
            sendInitialEmailInBackground(result.data.submission_id)
          }
        }
      }
      
      // Trigger GTM event if event name is provided
      if (result.gtm_event_name) {
        const gtmData = {
          serviceCategoryId: formData.service_category_id,
          serviceCategoryName: 'solar',
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
          event_label: 'solar',
          ...gtmData,
          timestamp: new Date().toISOString()
        });
      }

      // Create GHL lead directly from frontend (visible in network tab)
      if (effectivePartnerId) {
        try {
          console.log('🚀 Creating GHL lead from frontend...');
          
          const ghlResponse = await fetch('/api/ghl/create-lead-client', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              partnerId: effectivePartnerId,
              submissionId: result.data.submission_id, // Pass the newly created submissionId for field mapping engine
              emailType: 'quote-initial', // Explicitly set email type for initial quote
              contactData: {
                firstName: contactDetails.firstName,
                lastName: contactDetails.lastName,
                email: contactDetails.email,
                phone: contactDetails.phone,
                address1: selectedAddress?.address_line_1 || contactDetails.postcode,
                city: contactDetails.city || contactDetails.postcode,
                country: selectedAddress?.country || 'United Kingdom'
              },
              customFields: {}, // Will be populated by the field mapping engine
              pipelineId: null, // Will be determined by the API based on GHL field mappings
              stageId: null, // Will be determined by the API based on GHL field mappings
              opportunityName: `${contactDetails.firstName} ${contactDetails.lastName} - Quote Request`,
              monetaryValue: 0,
              tags: ['Quote Request', 'Initial Submission']
            })
          });

          if (ghlResponse.ok) {
            const ghlResult = await ghlResponse.json();
            console.log('✅ GHL lead created successfully from frontend:', ghlResult);
          } else {
            const errorText = await ghlResponse.text();
            console.error('❌ GHL lead creation failed from frontend:', ghlResponse.status, errorText);
          }
        } catch (ghlError) {
          console.error('❌ GHL lead creation error from frontend:', ghlError);
          // Don't fail the form submission if GHL fails
        }
      }
      
      // Only redirect immediately if OTP is NOT enabled
      const isOtpEnabled = effectivePartner?.otp || false;
      if (!isOtpEnabled) {
        router.push(`/solar/products?submission=${result.data.submission_id}`);
      }
      
      return result.data.submission_id; // Return submission ID for OTP flow
      
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
      console.error('Error submitting solar quote form:', error);
      setIsSubmitting(false);
    } finally {
      // Only set submitting to false if OTP is not enabled (since OTP flow will handle this)
      const isOtpEnabled = effectivePartner?.otp || false;
      if (!isOtpEnabled) {
        setIsSubmitting(false);
      }
    }
  };

  // Handle completion after OTP verification (redirect to products page)
  const handlePostVerificationCompletion = async (submissionId: string) => {
    console.log('=== POST VERIFICATION COMPLETION ===');
    console.log('About to redirect to products page with submissionId:', submissionId);
    
    try {
      // The OTP verification API already updated the verification stage to 'otp_verified'
      // and marked the quote as complete, so we just need to redirect
      setShowOtpScreen(false); // Reset OTP screen state
      console.log('showOtpScreen set to false');
      
      const redirectUrl = `/solar/products?submission=${submissionId}`;
      console.log('Attempting redirect to:', redirectUrl);
      
      // Use window.location.href for more reliable redirect
      if (typeof window !== 'undefined') {
        window.location.href = redirectUrl;
      } else {
        router.push(redirectUrl);
      }
      console.log('Redirect initiated');
    } catch (error: any) {
      console.error('Error during post-verification completion:', error);
      setError(error.message || 'An error occurred after verification');
    }
  };

  // Handle OTP verification completion
  const handleOtpVerificationComplete = async (submissionId: string) => {
    console.log('=== OTP VERIFICATION COMPLETE ===');
    console.log('Received submissionId:', submissionId);
    console.log('Stack trace:', new Error().stack);
    
    try {
      // The OTP verification API already updated the submission and marked it as complete
      // We just need to redirect to the products page - no need to resubmit
      await handlePostVerificationCompletion(submissionId);
      setIsSubmitting(false);
      console.log('OTP completion handled successfully');
    } catch (error: any) {
      console.error('Error handling OTP verification completion:', error);
      setError(error.message || 'An error occurred after verification');
      setIsSubmitting(false);
    }
  };

  // Main form submission handler (only handles initial form data saving)
  const handleSubmit = async (contactDetails: any) => {
    console.log('=== HANDLE SUBMIT CALLED ===');
    console.log('Contact details:', contactDetails);
    console.log('Stack trace:', new Error().stack);
    
    try {
      // Save the form data immediately
      console.log('Calling saveInitialFormData...');
      const submissionId = await saveInitialFormData(contactDetails);
      console.log('saveInitialFormData completed, submissionId:', submissionId);
      
      // If OTP is enabled, show OTP verification screen
      // If OTP is disabled, saveInitialFormData already redirected to products
      const isOtpEnabled = effectivePartner?.otp || false;
      console.log('OTP enabled:', isOtpEnabled);
      
      if (isOtpEnabled && submissionId) {
        // Store submission ID for OTP verification flow
        setSubmissionId(submissionId);
        // Signal that data is saved and OTP screen should be shown
        setShowOtpScreen(true);
        console.log('OTP flow: showOtpScreen set to true');
        // Keep isSubmitting true for OTP flow
      } else {
        // OTP not enabled, form is complete
        setIsSubmitting(false);
        console.log('No OTP: form complete, isSubmitting set to false');
      }
      
    } catch (error: any) {
      console.error('Error in main form submission handler:', error);
      setError(error.message || 'An unexpected error occurred');
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
        <div className="space-y-3 sm:space-y-4 text-center hidden">
         
        </div>
      );
    } else if (currentStep === activeSteps.length + 1) {
      return (
        <div className="space-y-6 text-center hidden">
         
        </div>
      );
    } else if (currentStep === activeSteps.length + 2) {
      return (
        <div className="space-y-6 text-center hidden">
          
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
        <div className="">
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
        <div className="mt-6 lg:mt-8 max-w-md mx-auto">
          <PostcodeStep
            value={formValues.postcode || ''}
            onValueChange={(postcode) => handleValueChange('postcode', postcode)}
            onNext={handleNextStep}
            onPrevious={handlePrevStep}
            companyColor={getDynamicColor()}
            onAddressSelect={handleAddressSelect}
            selectedAddress={selectedAddress}
          />
        </div>
      );
    } else if (currentStep === activeSteps.length + 2) {
      return (
        <RoofMappingStep
          selectedAddress={selectedAddress}
          onNext={handleNextStep}
          onPrevious={handlePrevStep}
          companyColor={getDynamicColor()}
          onRoofMappingComplete={handleRoofMappingComplete}
        />
      );
    } else if (currentStep === activeSteps.length + 3) {
      return (
        <div className="mt-6 lg:mt-8 max-w-lg mx-auto">
          <UserInfoForm
            initialUserInfo={userInfo}
            formValues={{...formValues, submission_id: submissionId}}
            onUserInfoChange={setUserInfo}
            onSubmit={handleSubmit}
            onOtpVerified={handleOtpVerificationComplete}
            companyColor={getDynamicColor()}
            otpEnabled={effectivePartner?.otp || false}
            showOtpScreen={showOtpScreen}
            questions={questions}
          />
        </div>
      );
    }
    
    return null;
  };

  if (loading || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <QuoteLoader />
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
    <div className="min-h-[calc(100vh-150px)] relative flex items-center">
      {/* Iframe Navigation Tracker */}
      <IframeNavigationTracker categorySlug="solar" />
      
      {/* Progress Bar */}
      <div className="h-1 bg-gray-200 relative overflow-hidden">
        <div
          className={`h-full ${classes.progress}`}
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      {currentStep === activeSteps.length + 2 ? (
        // Full screen for roof mapping
        <main className="flex-1">
          {getCurrentStepForm()}
        </main>
      ) : (
        // Normal layout for other steps
        <main className="flex-1 flex items-start justify-center px-6 py-16 lg:py-24">
          <div className="w-full max-w-3xl">
            {/* Question/Step Content */}
            {getCurrentStepContent()}
            
            {/* Form */}
            {getCurrentStepForm()}
          </div>
        </main>
      )}

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
