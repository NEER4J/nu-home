import { NextRequest, NextResponse } from 'next/server';
import { createGeminiService, type ChatContext } from '@/lib/gemini-service';

// Helper function to format context data for better AI understanding
function formatContextData(context: any) {
  const parts: string[] = [];
  
  // Format partner information
  if (context.partnerInfo) {
    parts.push(`🏢 PARTNER INFORMATION:`);
    parts.push(`- Company: ${context.partnerInfo.company_name || 'Unknown'}`);
    if (context.partnerInfo.business_description) {
      parts.push(`- Business: ${context.partnerInfo.business_description}`);
    }
    if (context.partnerInfo.contact_person) {
      parts.push(`- Contact: ${context.partnerInfo.contact_person}`);
    }
    if (context.partnerInfo.phone) {
      parts.push(`- Phone: ${context.partnerInfo.phone}`);
    }
    parts.push('');
  }

  // Format service category
  if (context.serviceCategory) {
    parts.push(`🔧 SERVICE CATEGORY:`);
    parts.push(`- Service: ${context.serviceCategory.name || 'Unknown'}`);
    if (context.serviceCategory.description) {
      parts.push(`- Description: ${context.serviceCategory.description}`);
    }
    parts.push('');
  }

  // Format products
  if (context.products && context.products.length > 0) {
    parts.push(`📦 AVAILABLE PRODUCTS:`);
    context.products.forEach((product: any, index: number) => {
      parts.push(`${index + 1}. ${product.name}`);
      if (product.description) {
        parts.push(`   Description: ${product.description}`);
      }
      if (product.price) {
        parts.push(`   Price: £${product.price}`);
      }
    });
    parts.push('');
  }

  // Format addons
  if (context.addons && context.addons.length > 0) {
    parts.push(`➕ AVAILABLE ADDONS:`);
    context.addons.forEach((addon: any, index: number) => {
      parts.push(`${index + 1}. ${addon.title}`);
      if (addon.description) {
        parts.push(`   Description: ${addon.description}`);
      }
      if (addon.price) {
        parts.push(`   Price: £${addon.price}`);
      }
    });
    parts.push('');
  }

  // Format form questions with cost information
  if (context.formQuestions && context.formQuestions.length > 0) {
    parts.push(`📋 FORM QUESTIONS & COSTS:`);
    
    // Extract and highlight cost information first
    const costInfo: Array<{question: string, option: string, cost: number}> = [];
    context.formQuestions.forEach((question: any) => {
      if (question.answerOptions) {
        question.answerOptions.forEach((option: any) => {
          if (option.additionalCost !== undefined && option.additionalCost > 0) {
            costInfo.push({
              question: question.questionText,
              option: option.text,
              cost: option.additionalCost
            });
          }
        });
      }
    });
    
    if (costInfo.length > 0) {
      parts.push(`💰 ADDITIONAL COSTS:`);
      costInfo.forEach(cost => {
        parts.push(`- ${cost.option}: +£${cost.cost} (${cost.question})`);
      });
      parts.push('');
    }
    
    // Group questions by step
    const questionsByStep = context.formQuestions.reduce((acc: any, question: any) => {
      if (!acc[question.stepNumber]) {
        acc[question.stepNumber] = [];
      }
      acc[question.stepNumber].push(question);
      return acc;
    }, {});

    Object.entries(questionsByStep).forEach(([stepNumber, questions]: [string, any]) => {
      parts.push(`STEP ${stepNumber}:`);
      questions.forEach((question: any, index: number) => {
        parts.push(`  ${index + 1}. ${question.questionText}`);
        if (question.answerOptions) {
          question.answerOptions.forEach((option: any, optionIndex: number) => {
            parts.push(`     ${optionIndex + 1}. ${option.text}`);
            if (option.additionalCost !== undefined && option.additionalCost > 0) {
              parts.push(`        - COST: +£${option.additionalCost}`);
            }
          });
        }
      });
      parts.push('');
    });
  }

  // Format lead data
  if (context.leadData) {
    parts.push(`👤 CUSTOMER CONTEXT:`);
    parts.push(`- Submission ID: ${context.leadData.submissionId || 'Unknown'}`);
    parts.push(`- Current Page: ${context.leadData.currentPage || 'Unknown'}`);
    parts.push(`- Pages Completed: ${context.leadData.pagesCompleted?.join(', ') || 'None'}`);
    
    // Process nested lead data
    if (context.leadData.quoteData && Object.keys(context.leadData.quoteData).length > 0) {
      parts.push(`- Quote Data: Available`);
      // Include key customer information
      if (context.leadData.quoteData.customer_name) {
        parts.push(`- Customer Name: ${context.leadData.quoteData.customer_name}`);
      }
      if (context.leadData.quoteData.property_type) {
        parts.push(`- Property Type: ${context.leadData.quoteData.property_type}`);
      }
      if (context.leadData.quoteData.bedrooms) {
        parts.push(`- Bedrooms: ${context.leadData.quoteData.bedrooms}`);
      }
    }
    parts.push('');
  }

  return parts.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [Chatbot API] Processing request');
    
    const { 
      partnerInfo, 
      serviceCategory, 
      products, 
      addons, 
      formQuestions,
      leadData, 
      userMessage 
    } = await request.json();

    // Check if Gemini API key is configured
    const geminiApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!geminiApiKey) {
      console.error('❌ [Chatbot API] Gemini API key not configured');
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    console.log('✅ [Chatbot API] API key found, creating Gemini service');

    // Create Gemini service with enhanced configuration
    const geminiService = createGeminiService(geminiApiKey, {
      temperature: 0.7,
      maxOutputTokens: 4096, // Increased for better context handling
      retryAttempts: 3,
      retryDelay: 1000,
    });

    // Prepare comprehensive context for the AI
    const context: ChatContext = {
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
      } : undefined,
      products: products || [],
      addons: addons || [],
      formQuestions: formQuestions || [],
      leadData: leadData ? {
        // Include all lead data fields
        id: leadData.id,
        submissionId: leadData.submissionId,
        partnerId: leadData.partnerId,
        serviceCategoryId: leadData.serviceCategoryId,
        currentPage: leadData.currentPage,
        pagesCompleted: leadData.pagesCompleted,
        quoteData: leadData.quoteData,
        productsData: leadData.productsData,
        addonsData: leadData.addonsData,
        surveyData: leadData.surveyData,
        checkoutData: leadData.checkoutData,
        enquiryData: leadData.enquiryData,
        successData: leadData.successData,
        formSubmissions: leadData.formSubmissions,
        saveQuoteData: leadData.saveQuoteData,
        esurveyData: leadData.esurveyData,
        callbackData: leadData.callbackData,
        sessionId: leadData.sessionId,
        deviceInfo: leadData.deviceInfo,
        conversionEvents: leadData.conversionEvents,
        pageTimings: leadData.pageTimings,
        lastActivityAt: leadData.lastActivityAt,
        createdAt: leadData.createdAt,
        updatedAt: leadData.updatedAt,
      } : undefined,
      userMessage,
    };

    console.log('🔄 [Chatbot API] Generating response with context');
    console.log('📊 [Chatbot API] Context summary:', {
      hasPartnerInfo: !!context.partnerInfo,
      hasServiceCategory: !!context.serviceCategory,
      productsCount: context.products?.length || 0,
      addonsCount: context.addons?.length || 0,
      formQuestionsCount: context.formQuestions?.length || 0,
      hasLeadData: !!context.leadData,
      userMessage: userMessage?.substring(0, 100) + '...'
    });

    // Generate response using the robust service
    const response = await geminiService.generateResponse(context);

    console.log('✅ [Chatbot API] Response generated successfully');
    
    return NextResponse.json({ 
      response,
      context: {
        partnerName: context.partnerInfo?.company_name,
        serviceCategory: context.serviceCategory?.name,
        hasCostData: context.formQuestions?.some(q => 
          q.answerOptions?.some((opt: any) => opt.additionalCost > 0)
        ) || false
      }
    });

  } catch (error) {
    console.error('❌ [Chatbot API] Error processing request:', error);
    
    // Provide different fallback responses based on error type
    let fallbackMessage = "I'm experiencing technical difficulties right now. Please contact us directly for assistance.";
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        fallbackMessage = "I'm having trouble connecting to our AI service. Please contact us directly for assistance.";
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        fallbackMessage = "Our AI service is currently busy. Please try again in a moment or contact us directly.";
      } else if (error.message.includes('safety')) {
        fallbackMessage = "I'm unable to process that request. Please rephrase your question or contact us directly.";
      } else if (error.message.includes('context') || error.message.includes('token')) {
        fallbackMessage = "I'm having trouble processing your request due to the amount of information. Please try a more specific question or contact us directly.";
      }
    }
    
    return NextResponse.json({ 
      response: fallbackMessage,
      error: true,
      errorType: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Debug endpoint to view context data
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    if (action === 'debug') {
      // Return debug information about the chatbot configuration
      return NextResponse.json({
        type: 'chatbot_debug',
        config: {
          hasApiKey: !!process.env.GOOGLE_AI_API_KEY,
          apiKeyLength: process.env.GOOGLE_AI_API_KEY?.length || 0,
          environment: process.env.NODE_ENV,
        },
        features: {
          costExtraction: true,
          formQuestions: true,
          leadData: true,
          localStorage: true,
          databaseStorage: true,
        },
        endpoints: {
          chat: 'POST /api/chatbot',
          debug: 'GET /api/chatbot?action=debug',
        }
      });
    }
    
    if (action === 'test') {
      // Test endpoint to verify the chatbot is working
      return NextResponse.json({
        type: 'chatbot_test',
        status: 'operational',
        timestamp: new Date().toISOString(),
        message: 'Chatbot API is working correctly'
      });
    }
    
    // Default response
    return NextResponse.json({
      type: 'chatbot_info',
      message: 'Chatbot API is running',
      endpoints: {
        chat: 'POST /api/chatbot',
        debug: 'GET /api/chatbot?action=debug',
        test: 'GET /api/chatbot?action=test'
      }
    });
    
  } catch (error) {
    console.error('❌ [Chatbot API] GET endpoint error:', error);
    return NextResponse.json({
      type: 'error',
      error: 'Failed to process GET request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}