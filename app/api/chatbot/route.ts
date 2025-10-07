import { NextRequest, NextResponse } from 'next/server';
import { createGeminiService, type ChatContext } from '@/lib/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const { partnerInfo, serviceCategory, products, addons, leadData, userMessage } = await request.json();

    // Check if Gemini API key is configured
    const geminiApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Create Gemini service with robust configuration
    const geminiService = createGeminiService(geminiApiKey, {
      temperature: 0.7,
      maxOutputTokens: 1024,
      retryAttempts: 3,
      retryDelay: 1000,
    });

    // Prepare context for the AI
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
      leadData: leadData ? {
        currentPage: leadData.currentPage,
        pagesCompleted: leadData.pagesCompleted,
        quoteData: leadData.quoteData,
        productsData: leadData.productsData,
        addonsData: leadData.addonsData,
      } : undefined,
      userMessage,
    };

    // Generate response using the robust service
    const response = await geminiService.generateResponse(context);

    return NextResponse.json({ response });

  } catch (error) {
    console.error('Chatbot API error:', error);
    
    // Provide different fallback responses based on error type
    let fallbackMessage = "I'm experiencing technical difficulties right now. Please contact us directly for assistance.";
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        fallbackMessage = "I'm having trouble connecting to our AI service. Please contact us directly for assistance.";
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        fallbackMessage = "Our AI service is currently busy. Please try again in a moment or contact us directly.";
      } else if (error.message.includes('safety')) {
        fallbackMessage = "I'm unable to process that request. Please rephrase your question or contact us directly.";
      }
    }
    
    return NextResponse.json({ 
      response: fallbackMessage 
    });
  }
}