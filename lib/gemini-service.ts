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
  formQuestions?: Array<{
    questionId: string;
    serviceCategoryId: string;
    questionText: string;
    stepNumber: number;
    displayOrderInStep: number;
    isMultipleChoice: boolean;
    answerOptions?: any;
    hasHelperVideo: boolean;
    helperVideoUrl?: string;
    isRequired: boolean;
    conditionalDisplay?: any;
    status: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;
    allowMultipleSelections?: boolean;
    answerImages?: string;
    positionX?: number;
    positionY?: number;
    userId?: string;
    rawQuestionData?: any;
  }>;
  leadData?: {
    // Basic info
    id?: string;
    submissionId?: string;
    partnerId?: string;
    serviceCategoryId?: string;
    
    // Form data
    currentPage?: string;
    pagesCompleted?: string[];
    quoteData?: any;
    productsData?: any;
    addonsData?: any;
    surveyData?: any;
    checkoutData?: any;
    enquiryData?: any;
    successData?: any;
    formSubmissions?: any[];
    saveQuoteData?: any[];
    esurveyData?: any;
    callbackData?: any;
    
    // Session & tracking
    sessionId?: string;
    deviceInfo?: any;
    conversionEvents?: any[];
    pageTimings?: any;
    
    // Timestamps
    lastActivityAt?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  userMessage: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = {
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
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

    // CRITICAL: Extract and highlight cost information FIRST
    if (context.formQuestions && context.formQuestions.length > 0) {
      const costInfo: Array<{question: string, option: string, cost: number}> = [];
      
      context.formQuestions.forEach(question => {
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
        prompt += `\n\n💰 IMPORTANT COST INFORMATION:\n`;
        costInfo.forEach(cost => {
          prompt += `- ${cost.option}: +£${cost.cost} (from: ${cost.question})\n`;
        });
        prompt += `\n`;
      }
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

        // Add form questions context (simplified)
        if (context.formQuestions && context.formQuestions.length > 0) {
          prompt += `\n\nFORM QUESTIONS (${context.formQuestions.length} questions):\n`;
      
      // Group questions by step
      const questionsByStep = context.formQuestions.reduce((acc, question) => {
        if (!acc[question.stepNumber]) {
          acc[question.stepNumber] = [];
        }
        acc[question.stepNumber].push(question);
        return acc;
      }, {} as Record<number, typeof context.formQuestions>);

      Object.entries(questionsByStep).forEach(([stepNumber, questions]) => {
        prompt += `STEP ${stepNumber}:\n`;
        questions.forEach((question, index) => {
          prompt += `  ${index + 1}. ${question.questionText}\n`;
          
          if (question.answerOptions) {
            prompt += `     Options:\n`;
            question.answerOptions.forEach((option: any, optionIndex: number) => {
              prompt += `       ${optionIndex + 1}. ${option.text}`;
              if (option.additionalCost !== undefined && option.additionalCost > 0) {
                prompt += ` - COST: +£${option.additionalCost}`;
              }
              prompt += `\n`;
            });
          }
          prompt += `\n`;
        });
      });
    }

    // Add detailed lead data context if available
    if (context.leadData) {
      prompt += `\n\nCUSTOMER CONTEXT - This customer has an active quote submission:\n`;
      prompt += `- Submission ID: ${context.leadData.submissionId}\n`;
      prompt += `- Current page: ${context.leadData.currentPage || 'Unknown'}\n`;
      prompt += `- Pages completed: ${context.leadData.pagesCompleted?.join(', ') || 'None'}\n`;
      prompt += `- Session started: ${context.leadData.createdAt || 'Unknown'}\n`;
      prompt += `- Last activity: ${context.leadData.lastActivityAt || 'Unknown'}\n`;
      
      // Detailed quote data - handle all nested data
      if (context.leadData.quoteData && Object.keys(context.leadData.quoteData).length > 0) {
        prompt += `\nQUOTE FORM DATA:\n`;
        const quoteData = context.leadData.quoteData;
        
        // Recursively process all quote data
        const processNestedData = (obj: any, prefix = '') => {
          Object.entries(obj).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              if (typeof value === 'object' && !Array.isArray(value)) {
                // Nested object - process recursively
                prompt += `${prefix}${key}:\n`;
                processNestedData(value, prefix + '  ');
              } else if (Array.isArray(value)) {
                // Array - show items
                prompt += `${prefix}${key}: [${value.length} items]\n`;
                value.forEach((item, index) => {
                  if (typeof item === 'object') {
                    prompt += `${prefix}  ${index + 1}: ${JSON.stringify(item)}\n`;
                  } else {
                    prompt += `${prefix}  ${index + 1}: ${item}\n`;
                  }
                });
              } else {
                // Simple value
                prompt += `${prefix}${key}: ${value}\n`;
              }
            }
          });
        };
        
        processNestedData(quoteData);
      }
      
      // Helper function to process nested data
      const processDataSection = (data: any, sectionName: string) => {
        if (data && Object.keys(data).length > 0) {
          prompt += `\n${sectionName}:\n`;
          const processNestedData = (obj: any, prefix = '') => {
            Object.entries(obj).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                if (typeof value === 'object' && !Array.isArray(value)) {
                  prompt += `${prefix}${key}:\n`;
                  processNestedData(value, prefix + '  ');
                } else if (Array.isArray(value)) {
                  prompt += `${prefix}${key}: [${value.length} items]\n`;
                  value.forEach((item, index) => {
                    if (typeof item === 'object') {
                      prompt += `${prefix}  ${index + 1}: ${JSON.stringify(item)}\n`;
                    } else {
                      prompt += `${prefix}  ${index + 1}: ${item}\n`;
                    }
                  });
                } else {
                  prompt += `${prefix}${key}: ${value}\n`;
                }
              }
            });
          };
          processNestedData(data);
        }
      };

      // Process all data sections with nested data
      processDataSection(context.leadData.surveyData, 'SURVEY DATA');
      processDataSection(context.leadData.enquiryData, 'ENQUIRY DATA');
      processDataSection(context.leadData.productsData, 'SELECTED PRODUCTS');
      processDataSection(context.leadData.addonsData, 'SELECTED ADDONS');
      processDataSection(context.leadData.checkoutData, 'CHECKOUT DATA');
      processDataSection(context.leadData.successData, 'SUCCESS DATA');
      processDataSection(context.leadData.deviceInfo, 'DEVICE INFO');
      processDataSection(context.leadData.pageTimings, 'PAGE TIMINGS');
      processDataSection(context.leadData.esurveyData, 'E-SURVEY DATA');
      processDataSection(context.leadData.callbackData, 'CALLBACK DATA');
      
      // Form submissions
      if (context.leadData.formSubmissions && Array.isArray(context.leadData.formSubmissions) && context.leadData.formSubmissions.length > 0) {
        prompt += `\nFORM SUBMISSIONS (${context.leadData.formSubmissions.length}):\n`;
        context.leadData.formSubmissions.forEach((submission, index) => {
          prompt += `- Submission ${index + 1}: ${JSON.stringify(submission)}\n`;
        });
      }
      
      // Conversion events
      if (context.leadData.conversionEvents && Array.isArray(context.leadData.conversionEvents) && context.leadData.conversionEvents.length > 0) {
        prompt += `\nCONVERSION EVENTS (${context.leadData.conversionEvents.length}):\n`;
        context.leadData.conversionEvents.forEach((event, index) => {
          prompt += `- Event ${index + 1}: ${JSON.stringify(event)}\n`;
        });
      }
      
      // Device info
      if (context.leadData.deviceInfo && Object.keys(context.leadData.deviceInfo).length > 0) {
        prompt += `\nDEVICE INFO:\n`;
        Object.entries(context.leadData.deviceInfo).forEach(([key, value]) => {
          prompt += `- ${key}: ${value}\n`;
        });
      }
      
      // Page timings
      if (context.leadData.pageTimings && Object.keys(context.leadData.pageTimings).length > 0) {
        prompt += `\nPAGE TIMINGS:\n`;
        Object.entries(context.leadData.pageTimings).forEach(([key, value]) => {
          prompt += `- ${key}: ${value}\n`;
        });
      }
      
      // Saved quote data
      if (context.leadData.saveQuoteData && Array.isArray(context.leadData.saveQuoteData) && context.leadData.saveQuoteData.length > 0) {
        prompt += `\nSAVED QUOTE DATA (${context.leadData.saveQuoteData.length} items):\n`;
        context.leadData.saveQuoteData.forEach((item, index) => {
          prompt += `- Item ${index + 1}: ${JSON.stringify(item)}\n`;
        });
      }
      
      // E-survey data
      if (context.leadData.esurveyData && Object.keys(context.leadData.esurveyData).length > 0) {
        prompt += `\nE-SURVEY DATA:\n`;
        Object.entries(context.leadData.esurveyData).forEach(([key, value]) => {
          prompt += `- ${key}: ${value}\n`;
        });
      }
      
      // Callback data
      if (context.leadData.callbackData && Object.keys(context.leadData.callbackData).length > 0) {
        prompt += `\nCALLBACK DATA:\n`;
        Object.entries(context.leadData.callbackData).forEach(([key, value]) => {
          prompt += `- ${key}: ${value}\n`;
        });
      }
    }

    // Add guidelines
    prompt += `\n\nPlease respond to the customer's question: "${context.userMessage}"\n\n`;
    prompt += `CRITICAL: ALWAYS start your response by addressing the customer by their name if it's available in the quote data (customer_name field). Do NOT use generic greetings like "Hello there!" if you have their name.\n`;
    prompt += `EXAMPLE: If customer_name is "John Smith", start with "Hi John!" or "Hello John!" - NOT "Hello there!"\n\n`;
    
    // CRITICAL: Cost-specific instructions
    if (context.userMessage.toLowerCase().includes('cost') || context.userMessage.toLowerCase().includes('charge') || context.userMessage.toLowerCase().includes('price')) {
      prompt += `\n🚨 COST QUERY DETECTED - You MUST use the exact cost information provided above. Do NOT give generic responses about "varying costs" or "detailed assessment needed". Use the specific £ amounts from the form data.\n`;
    }
    prompt += `IMPORTANT GUIDELINES:\n`;
    prompt += `- Be helpful, friendly, and professional\n`;
    prompt += `- ALWAYS respond in UK English (British spelling and terminology)\n`;
    prompt += `- ALWAYS use the customer's name from quote data if available - this is mandatory\n`;
    prompt += `- Use ALL available data to provide personalized responses\n`;
    prompt += `- If customer has quote data, reference their specific property details, requirements, and progress\n`;
    prompt += `- Reference their current page and progress in the quote process\n`;
    prompt += `- If they've selected products/addons, mention those specifically\n`;
    prompt += `- Use their property details (type, size, bedrooms, etc.) to give relevant advice\n`;
    prompt += `- Reference their heating requirements and budget if available\n`;
    prompt += `- Use their postcode/address for location-specific advice\n`;
    prompt += `- If they have form answers, use those to understand their specific needs\n`;
    prompt += `- ONLY provide contact information (phone, contact person) when specifically asked for it\n`;
    prompt += `- DO NOT automatically include contact details in every response\n`;
    prompt += `- If asked about pricing, reference their budget range if available\n`;
    prompt += `- If asked about installation, mention professional installation services\n`;
    prompt += `- If asked about their quote progress, explain where they are in the process\n`;
    prompt += `- If they're on a specific page, help them understand what's next\n`;
    prompt += `- Use their urgency level to prioritize responses appropriately\n`;
    prompt += `- If they have special requirements, address those specifically\n`;
    prompt += `- Keep responses concise but comprehensive\n`;
    prompt += `- Always represent ${context.partnerInfo?.company_name || 'our company'} professionally\n`;
    prompt += `- CRITICAL: When customers ask about costs, ALWAYS check the form questions data for additional costs in answer options\n`;
    prompt += `- CRITICAL: Look for "additionalCost" and "hasAdditionalCost" fields in answer options to provide accurate pricing information\n`;
    prompt += `- CRITICAL: If a customer asks about specific options (like "roof flue"), check the answer options for that question to find the exact additional cost\n`;
    prompt += `- EXAMPLE: If customer asks "What's the extra charge for roof flue?", look for the "Where does your boiler's flue exit your home?" question and find the "Roof" option with its additionalCost value\n`;

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
