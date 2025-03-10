// types/database.types.ts

export interface ServiceCategory {
    service_category_id: string;
    name: string;
    slug: string;
    description: string | null;
    icon_url: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface ConditionalDisplay {
    dependent_on_question_id: string;
    show_when_answer_equals: string[];
    logical_operator: 'AND' | 'OR';
  }
  
  export interface FormQuestion {
    question_id: string;
    service_category_id: string;
    question_text: string;
    step_number: number;
    display_order_in_step: number;
    is_multiple_choice: boolean;
    has_helper_video: boolean;
    helper_video_url: string | null;
    is_required: boolean;
    status: 'active' | 'inactive';
    created_by: string | null;
    created_at: string;
    updated_at: string;
    allow_multiple_selections?: boolean; // Add this property
    answer_options?: any[];
    answer_images?: string[];
    conditional_display?: {
      dependent_on_question_id: string;
      show_when_answer_equals: any[];
      logical_operator: 'AND' | 'OR';
    };
    is_deleted?: boolean;
    ServiceCategories?: {
      name: string;
    };
  }
  
  export interface FormAnswer {
    question_id: string;
    question_text: string;
    answer: string | string[];
  }
  
  export interface QuoteSubmission {
    submission_id: string;
    service_category_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    city: string | null;
    postcode: string;
    submission_date: string;
    ip_address: string | null;
    user_agent: string | null;
    referral_source: string | null;
    status: 'new' | 'processed' | 'qualified' | 'disqualified';
    form_answers: FormAnswer[];
    notes: string | null;
    created_at: string;
    updated_at: string;
  }
  
  // Add type for form input data
  export interface QuoteFormData {
    serviceCategory: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    city?: string;
    postcode: string;
    answers: Record<string, string | string[]>;
  }