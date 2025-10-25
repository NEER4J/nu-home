"use client";

import { useState, useRef, useEffect, RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner';
import { MessageCircle, X, Send, Bot, User, Loader2, Bug, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useOnClickOutside } from '@/hooks/use-click-outside';
import ReactMarkdown from 'react-markdown';
import { FormQuestion } from '@/types/database.types';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

enum QuoteStep {
  INITIAL = 'initial',
  QUESTIONS = 'questions',
  POSTCODE = 'postcode',
  USER_INFO = 'user_info',
  SUBMITTING = 'submitting',
  COMPLETED = 'completed',
}

interface ChatbotProps {
  partnerInfo?: PartnerProfile;
  className?: string;
}

export default function Chatbot({ partnerInfo: propPartnerInfo, className }: ChatbotProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<PartnerProfile | null>(propPartnerInfo || null);
  const [partnerProducts, setPartnerProducts] = useState<any[]>([]);
  const [partnerAddons, setPartnerAddons] = useState<any[]>([]);
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]); // Use FormQuestion type
  const [leadData, setLeadData] = useState<any>(null);
  const [serviceCategory, setServiceCategory] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [debugContextData, setDebugContextData] = useState<any>(null); // Store context data sent to LLM
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const [showChatButton, setShowChatButton] = useState(true); // Default to true as chat is initially closed

  // New state variables for Quote Feature
  const [isQuoteInProgress, setIsQuoteInProgress] = useState(false);
  const [currentQuoteStep, setCurrentQuoteStep] = useState<QuoteStep>(QuoteStep.INITIAL);
  const [quoteFormValues, setQuoteFormValues] = useState<Record<string, any>>({});
  const [activeQuoteQuestions, setActiveQuoteQuestions] = useState<FormQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedQuoteAddress, setSelectedQuoteAddress] = useState<Address | null>(null);
  const [quoteUserInfo, setQuoteUserInfo] = useState<any>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Define Address type (since it's not exported from @/types/index)
  interface Address {
    address_line_1: string
    address_line_2?: string
    street_name?: string
    street_number?: string
    building_name?: string
    sub_building?: string
    town_or_city: string
    county?: string
    postcode: string
    formatted_address: string
    country?: string
  }

  // Click outside to close
  useOnClickOutside(chatWindowRef as RefObject<HTMLElement>, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  // Control chat button visibility
  useEffect(() => {
    if (isOpen) {
      setShowChatButton(false); // Hide button immediately when chat opens
    } else {
      // Delay showing the chat button when closing
      const timer = setTimeout(() => {
        setShowChatButton(true); // Show button after transition when chat closes
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Fetch partner info if not provided
  useEffect(() => {
    async function fetchPartnerByHost() {
      if (propPartnerInfo) {
        setPartnerInfo(propPartnerInfo);
        return;
      }

      try {
        const supabase = createClient();
        const hostname = window.location.hostname;
        const partner = await resolvePartnerByHost(supabase, hostname);
        if (partner) {
          setPartnerInfo(partner);
        }
      } catch (error) {
        console.error('Error resolving partner from host:', error);
      }
    }
    
    fetchPartnerByHost();
  }, [propPartnerInfo]);

  // Detect service category from URL path
  useEffect(() => {
    async function detectServiceCategory() {
      if (!pathname) return;

      try {
        const supabase = createClient();
        
        // Extract service slug from pathname (e.g., /boiler/quote -> boiler)
        const pathSegments = pathname.split('/').filter(Boolean);
        const serviceSlug = pathSegments[0]; // First segment after domain
        
        if (serviceSlug && ['boiler', 'solar', 'battery', 'heat-pump', 'insulation'].includes(serviceSlug)) {
          const { data: categoryData } = await supabase
            .from('ServiceCategories')
            .select('service_category_id, name, slug, description')
            .eq('slug', serviceSlug)
            .eq('is_active', true)
            .single();

          if (categoryData) {
            setServiceCategory(categoryData);
          } else {
            console.log('No active service category found for slug:', serviceSlug);
          }
        } else {
          console.log('Service slug not recognized or not present:', serviceSlug);
        }
      } catch (error) {
        console.error('Error detecting service category:', error);
      }
    }

    detectServiceCategory();
  }, [pathname]);

  // Fetch partner products and addons
  useEffect(() => {
    async function fetchPartnerData() {
      if (!partnerInfo?.user_id || !serviceCategory?.service_category_id) return;

      try {
        const supabase = createClient();
        
        // Fetch products for this specific service category
        const { data: products } = await supabase
          .from('PartnerProducts')
          .select('*')
          .eq('partner_id', partnerInfo.user_id)
          .eq('service_category_id', serviceCategory.service_category_id)
          .eq('is_active', true);

        // Fetch addons for this specific service category
        const { data: addons } = await supabase
          .from('Addons')
          .select('*')
          .eq('partner_id', partnerInfo.user_id)
          .eq('service_category_id', serviceCategory.service_category_id);

        setPartnerProducts(products || []);
        setPartnerAddons(addons || []);
      } catch (error) {
        console.error('Error fetching partner data:', error);
      }
    }

    fetchPartnerData();
  }, [partnerInfo?.user_id, serviceCategory?.service_category_id]);

  // Fetch form questions for the service category
  useEffect(() => {
    async function fetchFormQuestions() {
      if (!partnerInfo?.user_id || !serviceCategory?.service_category_id) return;

      try {
        const supabase = createClient();
        
        // Fetch form questions for this specific service category and partner
        const { data: questions } = await supabase
          .from('FormQuestions')
          .select('*')
          .eq('service_category_id', serviceCategory.service_category_id)
          .eq('user_id', partnerInfo.user_id)
          .eq('status', 'active')
          .eq('is_deleted', false)
          .order('step_number', { ascending: true })
          .order('display_order_in_step', { ascending: true });

        setFormQuestions(questions as unknown as FormQuestion[] || []); // Aggressively cast to FormQuestion[]
      } catch (error) {
        console.error('Error fetching form questions:', error);
      }
    }

    fetchFormQuestions();
  }, [partnerInfo?.user_id, serviceCategory?.service_category_id]);

  // Fetch lead submission data if available
  useEffect(() => {
    async function fetchLeadData() {
      const submissionId = new URLSearchParams(window.location.search).get('submission');
      if (!submissionId || !partnerInfo?.user_id) return;

      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('lead_submission_data')
          .select('*')
          .eq('submission_id', submissionId)
          .eq('partner_id', partnerInfo.user_id)
          .single();

        if (data) {
          setLeadData(data);
        }
      } catch (error) {
        console.error('Error fetching lead data:', error);
      }
    }

    fetchLeadData();
  }, [partnerInfo?.user_id]);

  // Load chat history from database or local storage
  useEffect(() => {
    async function loadChatHistory() {
      const submissionId = new URLSearchParams(window.location.search).get('submission');
      
      if (submissionId && partnerInfo?.user_id) {
        // Load from database if submission ID exists
        try {
          const supabase = createClient();
          const { data: chatData } = await supabase
            .from('chat_messages')
            .select('messages')
            .eq('submission_id', submissionId)
            .eq('partner_id', partnerInfo.user_id)
            .single();

          if (chatData && chatData.messages && Array.isArray(chatData.messages)) {
            const formattedMessages: Message[] = chatData.messages.map((msg: any) => ({
              id: String(msg.id),
              content: String(msg.content),
              role: msg.role as 'user' | 'assistant',
              timestamp: new Date(String(msg.timestamp))
            }));
            setMessages(formattedMessages);
          }
        } catch (error) {
          console.error('Error loading chat history from database:', error);
        }
      } else {
        // Load from local storage if no submission ID
        try {
          const localChatKey = `chatbot_messages_${partnerInfo?.user_id || 'default'}`;
          const localMessages = localStorage.getItem(localChatKey);
          
          if (localMessages) {
            const parsedMessages = JSON.parse(localMessages);
            const formattedMessages: Message[] = parsedMessages.map((msg: any) => ({
              id: String(msg.id),
              content: String(msg.content),
              role: msg.role as 'user' | 'assistant',
              timestamp: new Date(String(msg.timestamp))
            }));
            setMessages(formattedMessages);
          }
        } catch (error) {
          console.error('Error loading chat history from local storage:', error);
        }
      }
    }

    loadChatHistory();
  }, [partnerInfo?.user_id]);

  // Helper to send a bot message
  const sendBotMessage = (content: string) => {
    const botMessage: Message = {
      id: Date.now().toString(),
      content: content,
      role: 'assistant',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMessage]);
    saveMessagesToStorage([...messages, botMessage]); // Save immediately
  };

  // Evaluate conditional display logic for form questions
  const evaluateCondition = (
    questionId: string, 
    values: string[], 
    operator: string, 
    currentFormValues: Record<string, any>
  ): boolean => {
    const dependentAnswer = currentFormValues[questionId];
    
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
  };

  // Update active questions when quoteFormValues or formQuestions change
  useEffect(() => {
    if (formQuestions.length === 0) return;
    
    const updateActiveQuestions = () => {
      const active = formQuestions.filter(question => {
        if (!question.conditional_display) return true;
        
        const conditionalDisplay = question.conditional_display;
        
        if (!('conditions' in conditionalDisplay) || !Array.isArray((conditionalDisplay as any).conditions)) {
          // Old format backward compatibility
          const { dependent_on_question_id, show_when_answer_equals, logical_operator } = conditionalDisplay;
          return evaluateCondition(dependent_on_question_id, show_when_answer_equals, logical_operator, quoteFormValues);
        }
        
        // New format with multiple conditions
        const conditions = (conditionalDisplay as any).conditions;
        const group_logical_operator = (conditionalDisplay as any).group_logical_operator || 'AND';
        
        if (!conditions || conditions.length === 0) return true;
        
        const results = conditions.map((condition: any) => {
          const { dependent_on_question_id, show_when_answer_equals, logical_operator } = condition;
          return evaluateCondition(dependent_on_question_id, show_when_answer_equals, logical_operator, quoteFormValues);
        });
        
        if (group_logical_operator === 'AND') {
          return results.every((result: boolean) => result === true);
        } else {
          return results.some((result: boolean) => result === true);
        }
      });
      
      setActiveQuoteQuestions(active);
    };
    
    updateActiveQuestions();
  }, [formQuestions, quoteFormValues]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initiate quote flow when chatbot opens and service category is available
  useEffect(() => {
    if (isOpen && !isQuoteInProgress && serviceCategory && formQuestions.length > 0) {
      setIsQuoteInProgress(true);
      setCurrentQuoteStep(QuoteStep.QUESTIONS);
      // Find the first active question based on initial empty form values
      const initialActiveQuestions = formQuestions.filter(q => !q.conditional_display || (
        !('conditions' in q.conditional_display) || !Array.isArray((q.conditional_display as any).conditions)
          ? evaluateCondition(q.conditional_display?.dependent_on_question_id || '', q.conditional_display?.show_when_answer_equals || [], q.conditional_display?.logical_operator || 'AND', {})
          : (q.conditional_display as any).group_logical_operator === 'AND'
            ? (q.conditional_display as any).conditions.every((cond: any) => evaluateCondition(cond.dependent_on_question_id, cond.show_when_answer_equals, cond.logical_operator, {}))
            : (q.conditional_display as any).conditions.some((cond: any) => evaluateCondition(cond.dependent_on_question_id, cond.show_when_answer_equals, cond.logical_operator, {}))
      ));
      
      setActiveQuoteQuestions(initialActiveQuestions);

      if (initialActiveQuestions.length > 0) {
        const firstQuestion = initialActiveQuestions[0];
        sendBotMessage(firstQuestion.question_text);
      } else {
        sendBotMessage("I'm sorry, I couldn't find any questions for this service category.");
        setIsQuoteInProgress(false);
        setCurrentQuoteStep(QuoteStep.INITIAL);
      }
    }
  }, [isOpen, isQuoteInProgress, serviceCategory, formQuestions]);

  // When active questions change, adjust currentQuestionIndex if needed
  useEffect(() => {
    if (isQuoteInProgress && currentQuoteStep === QuoteStep.QUESTIONS) {
      // If current question is no longer active, reset index to 0 or first active question
      if (activeQuoteQuestions.length > 0 && currentQuestionIndex >= activeQuoteQuestions.length) {
        setCurrentQuestionIndex(0);
      }
    }
  }, [activeQuoteQuestions, isQuoteInProgress, currentQuoteStep, currentQuestionIndex]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getDynamicColor = () => {
    return partnerInfo?.company_color || '#2563eb';
  };

  // State for available addresses during postcode step
  const [availableAddresses, setAvailableAddresses] = useState<Address[]>([]);

  // Function to perform postcode lookup
  const fetchAddresses = async (postcode: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/postcode-lookup?postcode=${encodeURIComponent(postcode)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      const data = await response.json();
      setAvailableAddresses(data.addresses || []);
      if (data.success && data.addresses.length === 0) {
        sendBotMessage("I couldn't find any addresses for that postcode. Please try again or enter manually (feature coming soon).");
      } else if (data.success) {
        sendBotMessage("Please select your address:");
      } else {
        sendBotMessage("Sorry, I encountered an error fetching addresses. Please try again.");
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      sendBotMessage("Sorry, I encountered an error fetching addresses. Please try again.");
      setAvailableAddresses([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle address selection by user
  const handleAddressSelection = async (address: Address) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: address.formatted_address,
      role: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    await saveMessagesToStorage([...messages, userMessage]);

    setSelectedQuoteAddress(address);
    setQuoteFormValues(prev => ({ ...prev, postcode: address.postcode }));
    setAvailableAddresses([]); // Clear options after selection
    setCurrentQuoteStep(QuoteStep.USER_INFO);
    sendBotMessage("Thanks! Now, please tell us your first name, last name, email, and phone number.");
  };

  // Clear chat function
  const clearChat = async () => {
    const submissionId = new URLSearchParams(window.location.search).get('submission');
    
    // Clear messages in state
    setMessages([]);
    
    if (submissionId && partnerInfo?.user_id) {
      // Clear from database if submission ID exists
      try {
        const supabase = createClient();
        
        // Update database with empty messages array
        const { data: existingChat } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('submission_id', submissionId)
          .eq('partner_id', partnerInfo.user_id)
          .maybeSingle();

        if (existingChat && existingChat.id) {
          // Update existing record with empty messages
          await supabase
            .from('chat_messages')
            .update({
              messages: [],
              last_updated: new Date().toISOString()
            })
            .eq('id', existingChat.id);
        } else {
          // Create new record with empty messages
          await supabase
            .from('chat_messages')
            .insert({
              submission_id: submissionId,
              partner_id: partnerInfo.user_id,
              messages: [],
              last_updated: new Date().toISOString()
            });
        }
      } catch (error) {
        console.error('Error clearing chat from database:', error);
      }
    } else {
      // Clear from local storage if no submission ID
      try {
        const localChatKey = `chatbot_messages_${partnerInfo?.user_id || 'default'}`;
        localStorage.removeItem(localChatKey);
      } catch (error) {
        console.error('Error clearing chat from local storage:', error);
      }
    }
    // Reset quote-related states
    setIsQuoteInProgress(false);
    setCurrentQuoteStep(QuoteStep.INITIAL);
    setQuoteFormValues({});
    setActiveQuoteQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedQuoteAddress(null);
    setQuoteUserInfo(null);
    setSubmissionId(null);
    setAvailableAddresses([]);
  };

  // Save all messages to database or local storage
  const saveMessagesToStorage = async (messages: Message[]) => {
    const submissionId = new URLSearchParams(window.location.search).get('submission');
    
    if (submissionId && partnerInfo?.user_id) {
      // Save to database if submission ID exists
      try {
        const supabase = createClient();
        
        // Format messages for JSON storage
        const messagesData = messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp.toISOString()
        }));

        // Check if chat record exists
        const { data: existingChat } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('submission_id', submissionId)
          .eq('partner_id', partnerInfo.user_id)
          .maybeSingle();

        if (existingChat && existingChat.id) {
          // Update existing record
          await supabase
            .from('chat_messages')
            .update({
              messages: messagesData,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingChat.id);
        } else {
          // Create new record
          await supabase
            .from('chat_messages')
            .insert({
              submission_id: submissionId,
              partner_id: partnerInfo.user_id,
              messages: messagesData,
              last_updated: new Date().toISOString()
            });
        }
      } catch (error) {
        console.error('Error saving messages to database:', error);
      }
    } else {
      // Save to local storage if no submission ID
      try {
        const localChatKey = `chatbot_messages_${partnerInfo?.user_id || 'default'}`;
        const messagesData = messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp.toISOString()
        }));
        
        localStorage.setItem(localChatKey, JSON.stringify(messagesData));
      } catch (error) {
        console.error('Error saving messages to local storage:', error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    // Save all messages to storage (database or local storage)
    await saveMessagesToStorage(updatedMessages);

    try {
      // If in quote progression mode, handle answer
      if (isQuoteInProgress) {
        if (currentQuoteStep === QuoteStep.QUESTIONS) {
          const currentQuestion = activeQuoteQuestions[currentQuestionIndex];
          if (currentQuestion) {
            // For text input questions, process the inputValue
            if (!currentQuestion.is_multiple_choice) {
              const newFormValues = { ...quoteFormValues, [currentQuestion.question_id]: inputValue.trim() };
              setQuoteFormValues(newFormValues);
              await processNextQuoteQuestion(newFormValues, currentQuestionIndex + 1);
            } else {
              // If it's a multiple-choice question and somehow handleSendMessage is called,
              // it means the user typed an answer instead of clicking a button. 
              // For now, we'll treat it as a text answer, but ideally, this path shouldn't be taken for MCQs.
              sendBotMessage("Please select an option from the buttons above.");
            }
          }
        } else if (currentQuoteStep === QuoteStep.POSTCODE) {
          // Handle postcode input and trigger lookup
          const postcode = inputValue.trim();
          setQuoteFormValues(prev => ({ ...prev, postcode }));
          await fetchAddresses(postcode);
        } else if (currentQuoteStep === QuoteStep.USER_INFO) {
          // Handle user info input: Expecting "FirstName LastName, Email, Phone"
          const userInfoInput = inputValue.trim();
          const parts = userInfoInput.split(',').map(s => s.trim());

          if (parts.length >= 3) {
            const [fullName, email, phone] = parts;
            const [firstName, ...lastNameParts] = fullName.split(' ').map(s => s.trim());
            const lastName = lastNameParts.join(' ');

            // Basic validation (can be enhanced)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^\+?[0-9\s()-]+$/; // Simple phone regex

            if (!firstName || !lastName || !emailRegex.test(email) || !phoneRegex.test(phone)) {
              sendBotMessage("I couldn't understand that. Please provide your details in the format: 'FirstName LastName, Email, Phone'.");
              setIsLoading(false);
              return;
            }

            const newUserInfo = {
              firstName,
              lastName,
              email,
              phone,
              fullPhoneNumber: phone, // For now, treat phone as fullPhoneNumber
              countryCode: "", // Placeholder, could add detection later
            };
            setQuoteUserInfo(newUserInfo);
            setCurrentQuoteStep(QuoteStep.SUBMITTING);
            sendBotMessage("Thank you for providing your details. We are now submitting your quote...");
            // Trigger actual submission logic here (next step)
          } else {
            sendBotMessage("Please provide your details in the format: 'FirstName LastName, Email, Phone'.");
          }
          setIsLoading(false);
          return;
        }
      } else {
        // Original LLM call logic for general chat
        const contextData = {
          partnerInfo: {
            company_name: partnerInfo?.company_name,
            business_description: partnerInfo?.business_description,
            contact_person: partnerInfo?.contact_person,
            phone: partnerInfo?.phone,
          },
          serviceCategory: serviceCategory ? {
            name: serviceCategory.name,
            slug: serviceCategory.slug,
            description: serviceCategory.description,
          } : null,
          products: partnerProducts.map(p => ({
            // Include ALL product fields including product_fields JSONB
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            slug: p.slug,
            product_fields: p.product_fields, // Include full JSONB data
            // Include any other product fields
            ...p
          })),
          addons: partnerAddons.map(a => ({
            title: a.title,
            description: a.description,
            price: a.price,
          })),
          formQuestions: formQuestions.map(q => ({
            // Include ALL fields from FormQuestions table
            questionId: q.question_id,
            serviceCategoryId: q.service_category_id,
            questionText: q.question_text,
            stepNumber: q.step_number,
            displayOrderInStep: q.display_order_in_step,
            isMultipleChoice: q.is_multiple_choice,
            answerOptions: q.answer_options,
            hasHelperVideo: q.has_helper_video,
            helperVideoUrl: q.helper_video_url,
            isRequired: q.is_required,
            conditionalDisplay: q.conditional_display,
            status: q.status,
            createdBy: q.created_by,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
            isDeleted: q.is_deleted,
            allowMultipleSelections: q.allow_multiple_selections,
            answerImages: q.answer_images,
            positionX: q.position_x,
            positionY: q.position_y,
            userId: q.user_id,
            // Include the entire raw question object for complete data access
            rawQuestionData: q
          })),
          leadData: leadData ? {
            // Pass ALL data from the database record
            ...leadData,
            // Ensure nested objects are properly included
            quoteData: leadData.quote_data || {},
            productsData: leadData.products_data || {},
            addonsData: leadData.addons_data || {},
            surveyData: leadData.survey_data || {},
            checkoutData: leadData.checkout_data || {},
            enquiryData: leadData.enquiry_data || {},
            successData: leadData.success_data || {},
            formSubmissions: leadData.form_submissions || [],
            saveQuoteData: leadData.save_quote_data || [],
            esurveyData: leadData.esurvey_data || {},
            callbackData: leadData.callback_data || {},
            deviceInfo: leadData.device_info || {},
            conversionEvents: leadData.conversion_events || [],
            pageTimings: leadData.page_timings || {},
            pagesCompleted: leadData.pages_completed || [],
          } : null,
          userMessage: inputValue.trim(),
          // Include chat history for context
          chatHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString()
          })),
        };

        // Store context data for debug
        setDebugContextData(contextData);

        const response = await fetch('/api/chatbot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(contextData),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from chatbot');
        }

        const data = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          role: 'assistant',
          timestamp: new Date(),
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        
        // Save all messages to storage (database or local storage)
        await saveMessagesToStorage(finalMessages);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again or contact us directly.',
        role: 'assistant',
        timestamp: new Date(),
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      
      // Save all messages to storage (database or local storage)
      await saveMessagesToStorage(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to process to the next quote question or step
  const processNextQuoteQuestion = async (currentFormValues: Record<string, any>, nextQuestionIndex: number) => {
    if (nextQuestionIndex < activeQuoteQuestions.length) {
      setCurrentQuestionIndex(nextQuestionIndex);
      sendBotMessage(activeQuoteQuestions[nextQuestionIndex].question_text);
    } else {
      // All questions answered, move to postcode step
      setCurrentQuoteStep(QuoteStep.POSTCODE);
      sendBotMessage("Great! Now, what's your postcode?");
    }
    await saveMessagesToStorage(messages); // Save messages after bot replies
    setIsLoading(false);
  };

  const handleSendMessageAsQuoteAnswer = async (questionId: string, option: any) => {
    const optionText = typeof option === 'object' ? option.text : String(option);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: optionText,
      role: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);
    await saveMessagesToStorage(updatedMessages);

    // Update form values
    const currentQuestion = activeQuoteQuestions[currentQuestionIndex];
    let newFormValues = { ...quoteFormValues };

    if (currentQuestion?.is_multiple_choice && currentQuestion?.allow_multiple_selections) {
      const currentAnswer = newFormValues[questionId] ? (newFormValues[questionId].split(', ') as string[]) : [];
      if (currentAnswer.includes(optionText)) {
        newFormValues[questionId] = currentAnswer.filter(item => item !== optionText).join(', ');
      } else {
        newFormValues[questionId] = [...currentAnswer, optionText].join(', ');
      }
    } else {
      newFormValues[questionId] = optionText;
    }
    setQuoteFormValues(newFormValues);

    // If multiple choice with multiple selections allowed, don't immediately go to next question on selection
    if (currentQuestion?.is_multiple_choice && currentQuestion?.allow_multiple_selections) {
      setIsLoading(false); // Stay on the same question, just update selection
    } else {
      // Process next question or step
      await processNextQuoteQuestion(newFormValues, currentQuestionIndex + 1);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPlaceholderText = () => {
    if (isQuoteInProgress) {
      if (currentQuoteStep === QuoteStep.QUESTIONS) {
        return activeQuoteQuestions[currentQuestionIndex]?.question_text || "Type your answer...";
      } else if (currentQuoteStep === QuoteStep.POSTCODE) {
        return "Enter your postcode...";
      } else if (currentQuoteStep === QuoteStep.USER_INFO) {
        return "Enter your details (e.g., John Doe, john@example.com, 07...)";
      }
    }
    return "Type your message...";
  };
  
  return (
    <div className={cn(
      "fixed z-50 flex flex-col-reverse items-end justify-end",
      isMobile 
        ? "inset-0" 
        : "bottom-6 right-6",
      !isOpen && "pointer-events-none", // Apply pointer-events-none when closed
      className
    )}>
      {/* Chat Button */}
       {showChatButton && (
         <button
           onClick={() => setIsOpen(true)}
           className="m-2 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center pointer-events-auto" // Override with pointer-events-auto
           style={{ backgroundColor: getDynamicColor() }}
         >
           <MessageCircle className="h-5 w-5 text-white" />
         </button>
       )}
  
      {/* Chat Window */}
      <div 
        ref={chatWindowRef}
        className={cn(
          "transition-all duration-300 ease-out transform-gpu",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : isMobile 
              ? "opacity-0 scale-100 translate-y-full pointer-events-none"
              : "opacity-0 scale-90 translate-y-8 pointer-events-none"
        )}
      >
        <Card className={cn(
          "shadow-2xl border-0 bg-white rounded-2xl",
          isMobile ? "w-full h-full rounded-none" : "rounded-2xl"
        )} style={{
          height: isMobile ? '90vh' : 'calc(100vh - 140px)', 
          width: isMobile ? '100vw' : '380px'
        }}>
          <CardContent className="p-0 h-full flex flex-col">
            {/* Header */}
            <div 
              className={cn(
                "flex items-center justify-between px-6 py-4 text-white",
                isMobile ? "rounded-t-2xl" : "rounded-t-2xl"
              )}
              style={{ backgroundColor: getDynamicColor() }}
            >
              <div className="flex items-center space-x-3">
             
                <div>
                  <h3 className="font-medium text-base">
                    {partnerInfo?.company_name || 'Support'}
                  </h3>
                 
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Clear Chat Button */}
                {messages.length > 0 && (
                  <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                    <DialogTrigger asChild>
                      <button
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                        title="Clear Chat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Clear Chat History</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <p className="text-sm text-gray-600 mb-4">
                          Are you sure you want to clear all chat messages? This action cannot be undone.
                        </p>
                        <div className="flex space-x-3">
                          <Button
                            onClick={() => {
                              clearChat();
                              setShowClearConfirm(false);
                            }}
                            variant="destructive"
                            className="flex-1"
                          >
                            Clear Chat
                          </Button>
                          <Button
                            onClick={() => setShowClearConfirm(false)}
                            variant="outline"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Debug Button */}
                <Dialog open={showDebug} onOpenChange={setShowDebug}>
                  <DialogTrigger asChild>
                    <button
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                      title="Debug Data"
                    >
                      <Bug className="h-4 w-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>LLM Context Data (What's Sent to AI)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {debugContextData ? (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Complete Context Data Sent to LLM</h3>
                          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto max-h-[70vh] overflow-y-auto">
                            {JSON.stringify(debugContextData, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No context data available yet. Send a message to see what data is sent to the LLM.</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-6 py-4 w-full">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-gray-400" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Hi! I'm here to help</h4>
                  <p className="text-sm text-gray-500">
                    Ask me anything about your {serviceCategory?.name?.toLowerCase() || 'service'} quote
                  </p>
                </div>
              ) : (
                <div className="space-y-6 w-full">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                       <div
                         className={cn(
                           "max-w-[85%] rounded-2xl px-4 py-3 text-sm break-words",
                           message.role === 'user'
                             ? 'bg-blue-600 text-white'
                             : 'bg-gray-50 text-gray-900 border border-gray-100'
                         )}
                       >
                         {message.role === 'assistant' ? (
                           <div className="prose prose-sm max-w-none leading-relaxed">
                             <ReactMarkdown 
                               components={{
                                 p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                 ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                 li: ({ children }) => <li className="mb-1">{children}</li>,
                                 strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                 em: ({ children }) => <em className="italic">{children}</em>,
                               }}
                             >
                               {message.content}
                             </ReactMarkdown>
                           </div>
                         ) : (
                           <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                         )}
                       </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm">
                        <div className="flex items-center space-x-3">
                          
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          <span className="text-gray-600">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input / Quote Buttons */}
            <div className="px-6 py-4 pt-0 border-gray-100">
              {/* Render quote-specific buttons or inputs */}
              {isQuoteInProgress && currentQuoteStep === QuoteStep.QUESTIONS && activeQuoteQuestions.length > 0 && (
                <div className="flex flex-col space-y-2 mb-4">
                  {activeQuoteQuestions[currentQuestionIndex]?.answer_options?.map((option: any, idx: number) => (
                    <Button
                      key={idx}
                      variant="outline"
                      onClick={() => handleSendMessageAsQuoteAnswer(activeQuoteQuestions[currentQuestionIndex].question_id, option)}
                      className={cn(
                        "w-full justify-start text-left",
                        quoteFormValues[activeQuoteQuestions[currentQuestionIndex].question_id] === (option.text || option) || 
                        (Array.isArray(quoteFormValues[activeQuoteQuestions[currentQuestionIndex].question_id]) && quoteFormValues[activeQuoteQuestions[currentQuestionIndex].question_id]?.includes(option.text || option))
                          ? "bg-blue-50 text-blue-700 border-blue-200" : "hover:bg-gray-50"
                      )}
                    >
                      {option.text || option}
                    </Button>
                  ))}
                  {currentQuestionIndex > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                      className="w-full justify-center text-sm text-gray-500 hover:bg-gray-100"
                    >
                      Previous Question
                    </Button>
                  )}
                </div>
              )}

              {/* Render postcode options if available */}
              {isQuoteInProgress && currentQuoteStep === QuoteStep.POSTCODE && availableAddresses.length > 0 && (
                <div className="flex flex-col space-y-2 mb-4">
                  <p className="text-sm text-gray-500 mb-2">Please select your address:</p>
                  {availableAddresses.map((address, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      onClick={() => handleAddressSelection(address)}
                      className="w-full justify-start text-left hover:bg-gray-50"
                    >
                      {address.formatted_address}
                    </Button>
                  ))}
                </div>
              )}
              
              {/* Always render the input field and send button */}
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={getPlaceholderText()}
                    disabled={isLoading}
                    className="w-full px-4 py-3 pr-12 rounded-2xl border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ 
                      backgroundColor: getDynamicColor(),
                      opacity: (!inputValue.trim() || isLoading) ? 0.5 : 1
                    }}
                  >
                    <Send className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
