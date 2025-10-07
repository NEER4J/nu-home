import { GoogleGenerativeAI, GenerativeModel, GenerationConfig, SafetySetting, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ChatContext {
  partnerInfo?: {
    company_name?: string;
    business_description?: string;
    contact_person?: string;
    phone?: string;
  };
  serviceCategory?: {
    name?: string;
    slug?: string;
    description?: string;
  };
  products?: Array<{
    name: string;
    description: string;
    price?: number;
    slug: string;
  }>;
  addons?: Array<{
    title: string;
    description: string;
    price?: number;
  }>;
  leadData?: {
    currentPage?: string;
    pagesCompleted?: string[];
    quoteData?: any;
    productsData?: any;
    addonsData?: any;
  };
  userMessage: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = {
      model: 'gemini-2.5-flash-lite',
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2024,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: this.config.model!,
      generationConfig: this.getGenerationConfig(),
      safetySettings: this.getSafetySettings()
    });
  }

  private getGenerationConfig(): GenerationConfig {
    return {
      temperature: this.config.temperature,
      topK: this.config.topK,
      topP: this.config.topP,
      maxOutputTokens: this.config.maxOutputTokens,
    };
  }

  private getSafetySettings(): SafetySetting[] {
    return [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
  }

  private buildContextPrompt(context: ChatContext): string {
    let prompt = `You are a helpful assistant for ${context.partnerInfo?.company_name || 'our service company'}. `;
    
    // Add service category context
    if (context.serviceCategory) {
      prompt += `We specialize in ${context.serviceCategory.name} services. `;
      if (context.serviceCategory.description) {
        prompt += `${context.serviceCategory.description}. `;
      }
    }
    
    // Add business context
    if (context.partnerInfo?.business_description) {
      prompt += `Our business: ${context.partnerInfo.business_description}. `;
    }

    if (context.partnerInfo?.contact_person) {
      prompt += `Contact person: ${context.partnerInfo.contact_person}. `;
    }

    if (context.partnerInfo?.phone) {
      prompt += `Phone: ${context.partnerInfo.phone}. `;
    }

    // Add products context
    if (context.products && context.products.length > 0) {
      prompt += `\n\nAvailable products:\n`;
      context.products.forEach((product) => {
        prompt += `- ${product.name}: ${product.description}`;
        if (product.price) {
          prompt += ` (Price: £${product.price})`;
        }
        prompt += `\n`;
      });
    }

    // Add addons context
    if (context.addons && context.addons.length > 0) {
      prompt += `\n\nAvailable addons:\n`;
      context.addons.forEach((addon) => {
        prompt += `- ${addon.title}: ${addon.description}`;
        if (addon.price) {
          prompt += ` (Price: £${addon.price})`;
        }
        prompt += `\n`;
      });
    }

    // Add lead data context if available
    if (context.leadData) {
      prompt += `\n\nCustomer context:\n`;
      prompt += `- Current page: ${context.leadData.currentPage || 'Unknown'}\n`;
      prompt += `- Pages completed: ${context.leadData.pagesCompleted?.join(', ') || 'None'}\n`;
      
      if (context.leadData.quoteData?.form_answers) {
        prompt += `- Form answers provided: ${Object.keys(context.leadData.quoteData.form_answers).length} questions answered\n`;
      }
      
      if (context.leadData.productsData && Object.keys(context.leadData.productsData).length > 0) {
        prompt += `- Products selected: ${Object.keys(context.leadData.productsData).length} items\n`;
      }
      
      if (context.leadData.addonsData && Object.keys(context.leadData.addonsData).length > 0) {
        prompt += `- Addons selected: ${Object.keys(context.leadData.addonsData).length} items\n`;
      }
    }

    // Add guidelines
    prompt += `\n\nPlease respond to the customer's question: "${context.userMessage}"\n\n`;
    prompt += `Guidelines:\n`;
    prompt += `- Be helpful and friendly\n`;
    prompt += `- Use the product and addon information to provide accurate details\n`;
    prompt += `- If the customer is asking about their quote progress, use the lead data context\n`;
    prompt += `- If you don't know something specific, suggest they contact us directly\n`;
    prompt += `- Keep responses concise but informative\n`;
    prompt += `- Always be professional and represent ${context.partnerInfo?.company_name || 'our company'} well\n`;
    prompt += `- If asked about pricing, provide general guidance but suggest they get a personalized quote\n`;
    prompt += `- If asked about installation, mention that we provide professional installation services\n`;

    return prompt;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateResponse(context: ChatContext): Promise<string> {
    const prompt = this.buildContextPrompt(context);
    
    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        console.log(`Gemini API attempt ${attempt}/${this.config.retryAttempts}`);
        
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini API');
        }

        console.log(`Gemini API success on attempt ${attempt}`);
        return text.trim();

      } catch (error) {
        console.error(`Gemini API attempt ${attempt} failed:`, error);
        
        if (attempt === this.config.retryAttempts) {
          // Last attempt failed, throw the error
          throw error;
        }
        
        // Wait before retrying
        await this.sleep(this.config.retryDelay! * attempt);
      }
    }

    throw new Error('All retry attempts failed');
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const testContext: ChatContext = {
        userMessage: "Hello, this is a test message. Please respond with 'API connection successful'."
      };

      const response = await this.generateResponse(testContext);
      
      return {
        success: true,
        message: 'Gemini API connection successful!',
        details: { response }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Gemini API connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Method to update configuration
  updateConfig(newConfig: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate the model with new config
    this.model = this.genAI.getGenerativeModel({ 
      model: this.config.model!,
      generationConfig: this.getGenerationConfig(),
      safetySettings: this.getSafetySettings()
    });
  }

  // Method to get current configuration
  getConfig(): GeminiConfig {
    return { ...this.config };
  }
}

// Factory function to create a Gemini service instance
export function createGeminiService(apiKey: string, overrides?: Partial<GeminiConfig>): GeminiService {
  return new GeminiService({
    apiKey,
    ...overrides
  });
}
