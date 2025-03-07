// utils/supabase/client-functions.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'; 
import { 
  ServiceCategory, 
  FormQuestion, 
  QuoteSubmission,
  QuoteFormData
} from '@/types/database.types';

// Create a Supabase client
const supabase = createClientComponentClient();

// Service Category Functions
export async function getServiceCategories() {
  const { data, error } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (error) {
    console.error('Error fetching service categories:', error);
    return [];
  }
  
  return data as ServiceCategory[];
}

export async function getServiceCategoryBySlug(slug: string) {
  const { data, error } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  
  if (error) {
    console.error(`Error fetching service category with slug ${slug}:`, error);
    return null;
  }
  
  return data as ServiceCategory;
}

// Form Questions Functions
export async function getFormQuestions(serviceCategoryId: string) {
  const { data, error } = await supabase
    .from('FormQuestions')
    .select('*')
    .eq('service_category_id', serviceCategoryId)
    .eq('status', 'active')
    .eq('is_deleted', false)
    .order('step_number')
    .order('display_order_in_step');
  
  if (error) {
    console.error('Error fetching form questions:', error);
    return [];
  }
  
  return data as FormQuestion[];
}

// Quote Submission Functions
export async function submitQuoteRequest(formData: QuoteFormData) {
  // Convert answers to the required format
  const formAnswers = Object.entries(formData.answers).map(([questionId, answer]) => {
    return {
      question_id: questionId,
      question_text: '', // This will be populated from API side
      answer: answer
    };
  });
  
  const { data, error } = await supabase
    .from('QuoteSubmissions')
    .insert({
      service_category_id: formData.serviceCategory,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone || null,
      city: formData.city || null,
      postcode: formData.postcode,
      ip_address: null, // Will be captured on server
      user_agent: navigator.userAgent,
      referral_source: document.referrer || null,
      status: 'new',
      form_answers: formAnswers
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error submitting quote request:', error);
    throw error;
  }
  
  return data as QuoteSubmission;
}