"use client";

import { useState, useRef, useEffect, RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useOnClickOutside } from '@/hooks/use-click-outside';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
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
  const [leadData, setLeadData] = useState<any>(null);
  const [serviceCategory, setServiceCategory] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement | null>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Click outside to close
  useOnClickOutside(chatWindowRef as RefObject<HTMLElement>, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

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
          }
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getDynamicColor = () => {
    return partnerInfo?.company_color || '#2563eb';
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare context data
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
          name: p.name,
          description: p.description,
          price: p.price,
          slug: p.slug,
        })),
        addons: partnerAddons.map(a => ({
          title: a.title,
          description: a.description,
          price: a.price,
        })),
        leadData: leadData ? {
          currentPage: leadData.current_page,
          pagesCompleted: leadData.pages_completed,
          quoteData: leadData.quote_data,
          productsData: leadData.products_data,
          addonsData: leadData.addons_data,
        } : null,
        userMessage: inputValue.trim(),
      };

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

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again or contact us directly.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn(
      "fixed z-50 flex flex-col items-end justify-end",
      isMobile 
        ? "inset-0" 
        : "bottom-6 right-6"
    , className)}>
      {/* Chat Button */}
     

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
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
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

            {/* Input */}
            <div className="px-6 py-4 pt-0 border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
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

       {/* Chat Button - Only show when chat is closed */}
       {!isOpen && (
         <button
           onClick={() => setIsOpen(true)}
           className="m-2 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center"
           style={{ backgroundColor: getDynamicColor() }}
         >
           <MessageCircle className="h-5 w-5 text-white" />
         </button>
       )}
    </div>
  );
}
