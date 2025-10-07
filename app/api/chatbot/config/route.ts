import { NextRequest, NextResponse } from 'next/server';
import { createGeminiService } from '@/lib/gemini-service';

export async function GET(request: NextRequest) {
  try {
    const geminiApiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!geminiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_AI_API_KEY environment variable not set'
      });
    }

    // Create a service instance to get current config
    const geminiService = createGeminiService(geminiApiKey);
    const config = geminiService.getConfig();

    return NextResponse.json({
      success: true,
      config: {
        model: config.model,
        temperature: config.temperature,
        topK: config.topK,
        topP: config.topP,
        maxOutputTokens: config.maxOutputTokens,
        retryAttempts: config.retryAttempts,
        retryDelay: config.retryDelay,
      },
      message: 'Current Gemini service configuration'
    });

  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { temperature, topK, topP, maxOutputTokens, retryAttempts, retryDelay } = await request.json();
    
    const geminiApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_AI_API_KEY environment variable not set'
      });
    }

    // Create service with updated configuration
    const geminiService = createGeminiService(geminiApiKey, {
      temperature,
      topK,
      topP,
      maxOutputTokens,
      retryAttempts,
      retryDelay,
    });

    const updatedConfig = geminiService.getConfig();

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        model: updatedConfig.model,
        temperature: updatedConfig.temperature,
        topK: updatedConfig.topK,
        topP: updatedConfig.topP,
        maxOutputTokens: updatedConfig.maxOutputTokens,
        retryAttempts: updatedConfig.retryAttempts,
        retryDelay: updatedConfig.retryDelay,
      }
    });

  } catch (error) {
    console.error('Config update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
