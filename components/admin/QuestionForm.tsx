// components/admin/QuestionForm.tsx
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ServiceCategory, FormQuestion } from '@/types/database.types';
import ConditionalLogic from './ConditionalLogic';
import { AlertCircle, PlusCircle, Trash2, CheckCircle, Video, HelpCircle, ChevronDown, X, Save } from 'lucide-react';

// Define form validation schema with conditional logic fields
const formSchema = z.object({
  service_category_id: z.string().uuid('Please select a service category'),
  question_text: z.string().min(5, 'Question text must be at least 5 characters'),
  step_number: z.number().min(1, 'Step number must be at least 1'),
  display_order_in_step: z.number().min(1, 'Display order must be at least 1'),
  is_multiple_choice: z.boolean().optional(),
  allow_multiple_selections: z.boolean().optional(),
  has_helper_video: z.boolean().optional(),
  helper_video_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  is_required: z.boolean().optional(),
  status: z.enum(['active', 'inactive']),
  // Add conditional fields to the schema
  conditional_question: z.string().optional(),
  conditional_values: z.union([z.string().optional(), z.array(z.string()).optional()]),
  conditional_operator: z.enum(['AND', 'OR']).optional()
});

type FormValues = z.infer<typeof formSchema> & {
  answer_options: Array<{ text: string, image: string }>;
};

interface QuestionFormProps {
  question?: FormQuestion; // Optional for new questions
  categories: ServiceCategory[];
  categoryStepMap?: Record<string, number>; // For suggesting next step number
  conditionalQuestions?: any[]; // For edit mode
  onSave?: (updatedQuestion?: FormQuestion) => void; // New callback prop
  onCancel?: () => void; // New callback prop
}

export function QuestionForm({
  question,
  categories,
  categoryStepMap = {},
  conditionalQuestions = [],
  onSave,
  onCancel
}: QuestionFormProps) {
  const isEditMode = !!question;
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Initialize answer options as an array of objects with text and image properties
  const [answerOptions, setAnswerOptions] = useState<Array<{ text: string, image: string }>>(() => {
    if (!question?.answer_options) {
      return [{ text: '', image: '' }]; // Default for new questions
    }
    
    if (!Array.isArray(question.answer_options)) {
      return [{ text: '', image: '' }];
    }
    
    if (question.answer_options.length === 0) {
      return [{ text: '', image: '' }];
    }
    
    // Check if the first item is an object with a 'text' property
    const firstItem = question.answer_options[0];
    if (typeof firstItem === 'object' && firstItem !== null && 'text' in firstItem) {
      // It's already the right format, but we need to properly type it
      return question.answer_options.map((opt: any) => ({
        text: opt.text || '',
        image: opt.image || ''
      }));
    }
    
    // Convert from array of strings to array of objects
    return question.answer_options.map((opt: any, index: number) => ({
      text: typeof opt === 'string' ? opt : '',
      image: (question as any).answer_images && 
             Array.isArray((question as any).answer_images) && 
             (question as any).answer_images[index] 
        ? (question as any).answer_images[index] 
        : ''
    }));
  });
  
  // Extract conditional logic values if they exist (for edit mode)
  const conditionalLogic = question?.conditional_display || null;
  const [showConditionalLogic, setShowConditionalLogic] = useState(
    !!conditionalLogic
  );
  
  // For conditional logic component
  const [conditionalValues, setConditionalValues] = useState<string[]>(
    conditionalLogic?.show_when_answer_equals || []
  );
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [availableConditionalQuestions, setAvailableConditionalQuestions] = useState<any[]>(
    conditionalQuestions || []
  );
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, dirtyFields }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      service_category_id: question?.service_category_id || '',
      question_text: question?.question_text || '',
      step_number: question?.step_number || 1,
      display_order_in_step: question?.display_order_in_step || 1,
      is_multiple_choice: question?.is_multiple_choice || false,
      allow_multiple_selections: (question as any)?.allow_multiple_selections || false,
      has_helper_video: question?.has_helper_video || false,
      helper_video_url: question?.helper_video_url || '',
      is_required: question?.is_required !== undefined ? question.is_required : true,
      status: (question?.status as 'active' | 'inactive') || 'active',
      answer_options: answerOptions,
      conditional_question: conditionalLogic?.dependent_on_question_id || '',
      conditional_values: conditionalLogic?.show_when_answer_equals || [],
      conditional_operator: conditionalLogic?.logical_operator || 'OR',
    }
  });
  
  const selectedCategoryId = watch('service_category_id');
  const isMultipleChoice = watch('is_multiple_choice');
  const allowMultipleSelections = watch('allow_multiple_selections');
  const hasHelperVideo = watch('has_helper_video');
  const stepNumber = watch('step_number');
  const conditionalQuestionId = watch('conditional_question');
  
  // Update step number suggestion when category changes (for new questions)
  useEffect(() => {
    if (!isEditMode && selectedCategoryId && categoryStepMap[selectedCategoryId]) {
      setValue('step_number', categoryStepMap[selectedCategoryId] + 1);
    } else if (!isEditMode) {
      setValue('step_number', 1);
    }
  }, [selectedCategoryId, categoryStepMap, setValue, isEditMode]);
  
  // Fetch existing questions for conditional logic when category changes
  useEffect(() => {
    async function fetchQuestions() {
      if (!selectedCategoryId) return;
      
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('FormQuestions')
        .select('question_id, question_text, step_number, is_multiple_choice, answer_options')
        .eq('service_category_id', selectedCategoryId)
        .eq('status', 'active')
        .eq('is_deleted', false)
        .order('step_number');
      
      if (error) {
        console.error('Error fetching questions:', error);
        return;
      }
      
      // Only show questions from earlier steps
      let filteredQuestions = data?.filter(q => q.step_number < stepNumber) || [];
      
      // For edit mode, exclude the current question
      if (isEditMode && question?.question_id) {
        filteredQuestions = filteredQuestions.filter(q => q.question_id !== question.question_id);
      }
      
      setAvailableConditionalQuestions(filteredQuestions);
    }
    
    fetchQuestions();
  }, [selectedCategoryId, stepNumber, isEditMode, question]);
  
  // Update selected question when conditional question changes
  useEffect(() => {
    if (conditionalQuestionId) {
      const question = availableConditionalQuestions.find(q => q.question_id === conditionalQuestionId);
      setSelectedQuestion(question);
    } else {
      setSelectedQuestion(null);
    }
  }, [conditionalQuestionId, availableConditionalQuestions]);
  
  // Register conditional values with the form when they change
  useEffect(() => {
    if (showConditionalLogic && conditionalValues.length > 0) {
      setValue('conditional_values', conditionalValues);
    }
  }, [conditionalValues, setValue, showConditionalLogic]);

  const handleAddOption = () => {
    setAnswerOptions([...answerOptions, { text: '', image: '' }]);
  };
  
  const handleOptionChange = (index: number, field: 'text' | 'image', value: string) => {
    const newOptions = [...answerOptions];
    newOptions[index][field] = value;
    setAnswerOptions(newOptions);
  };
  
  const handleRemoveOption = (index: number) => {
    if (answerOptions.length <= 1) return;
    const newOptions = answerOptions.filter((_, i) => i !== index);
    setAnswerOptions(newOptions);
  };
  
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Prepare the base data
      const formData: any = {
        service_category_id: data.service_category_id,
        question_text: data.question_text,
        step_number: data.step_number,
        display_order_in_step: data.display_order_in_step,
        is_multiple_choice: data.is_multiple_choice || false,
        allow_multiple_selections: data.is_multiple_choice ? data.allow_multiple_selections || false : false,
        // Store the entire objects array as the answer_options
        answer_options: data.is_multiple_choice ? 
          answerOptions.filter(opt => opt.text.trim() !== '') : 
          null,
        // answer_images is no longer needed as we store image URLs in answer_options
        answer_images: null,
        has_helper_video: data.has_helper_video || false,
        helper_video_url: data.has_helper_video ? data.helper_video_url : null,
        is_required: data.is_required || false,
        status: data.status,
        conditional_display: null // Initialize as null by default
      };
      
      // If creating a new question, add is_deleted field
      if (!isEditMode) {
        formData.is_deleted = false;
      }
      
      // Add conditional logic if enabled and a question is selected
      if (showConditionalLogic && data.conditional_question) {
        // Use values from checkbox selection state
        if (conditionalValues.length > 0) {
          formData.conditional_display = {
            dependent_on_question_id: data.conditional_question,
            show_when_answer_equals: conditionalValues,
            logical_operator: data.conditional_operator || 'OR'
          };
        }
      }
      
      const supabase = await createClient();
      
      let updatedQuestion;
      
      if (isEditMode && question) {
        // Update existing question
        const { data: responseData, error } = await supabase
          .from('FormQuestions')
          .update(formData)
          .eq('question_id', question.question_id)
          .select();
        
        if (error) throw new Error(error.message);
        updatedQuestion = responseData?.[0];
        
        setSuccess('Question successfully updated!');
      } else {
        // Create new question
        const { data: responseData, error } = await supabase
          .from('FormQuestions')
          .insert(formData)
          .select();
        
        if (error) throw new Error(error.message);
        updatedQuestion = responseData?.[0];
        
        setSuccess('Question successfully created!');
      }
      
      // Call onSave callback if provided with a slight delay to show success message
      setTimeout(() => {
        if (onSave) {
          onSave(updatedQuestion);
        } else {
          // Otherwise use the router to navigate back
          router.push('/admin/form-questions');
          router.refresh(); // Refresh the page to show the new/updated question
        }
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || `An error occurred while ${isEditMode ? 'updating' : 'saving'} the question`);
      console.error(`Error ${isEditMode ? 'updating' : 'saving'} question:`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/admin/form-questions');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto">
      {/* Notification Messages */}
      {success && (
        <div className="rounded-md bg-green-50 p-4 mb-6 shadow-md transition-all duration-300">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <p className="text-green-700 font-medium">{success}</p>
            <button
              type="button"
              className="ml-auto text-green-500 hover:text-green-700"
              onClick={() => setSuccess(null)}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6 shadow-md transition-all duration-300">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-red-700 font-medium">{error}</p>
            <button
              type="button"
              className="ml-auto text-red-500 hover:text-red-700"
              onClick={() => setError(null)}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg overflow-hidden">
      
        
        <div className="p-4 space-y-10">
          {/* Basic Information Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <HelpCircle size={18} className="mr-2 text-blue-500" />
                Basic Information
              </h3>
              <p className="text-sm text-gray-500">
                {isEditMode ? 'Update' : 'Define'} the basic properties of the question.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="service_category_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="service_category_id"
                  {...register('service_category_id')}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    errors.service_category_id ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } shadow-sm transition duration-150 bg-white`}
                >
                  <option value="">Select a service category</option>
                  {categories.map((category) => (
                    <option key={category.service_category_id} value={category.service_category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.service_category_id && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.service_category_id.message}
                  </p>
                )}
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="question_text" className="block text-sm font-medium text-gray-700 mb-1">
                  Question Text <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="question_text"
                  {...register('question_text')}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    errors.question_text ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } shadow-sm transition duration-150`}
                  placeholder="e.g., Which fuel powers your boiler?"
                />
                {errors.question_text && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.question_text.message}
                  </p>
                )}
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="step_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Step Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="step_number"
                  min="1"
                  {...register('step_number', { valueAsNumber: true })}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    errors.step_number ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } shadow-sm transition duration-150`}
                />
                {errors.step_number && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.step_number.message}
                  </p>
                )}
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="display_order_in_step" className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order in Step <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="display_order_in_step"
                  min="1"
                  {...register('display_order_in_step', { valueAsNumber: true })}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    errors.display_order_in_step ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } shadow-sm transition duration-150`}
                />
                {errors.display_order_in_step && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.display_order_in_step.message}
                  </p>
                )}
              </div>
              
              <div className="sm:col-span-6 space-y-4">
                <div className="flex flex-wrap items-center gap-6">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      id="is_multiple_choice"
                      {...register('is_multiple_choice')}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    />
                    <span className="ml-2 text-gray-700">Multiple Choice Question</span>
                  </label>
                  
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      id="is_required"
                      {...register('is_required')}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    />
                    <span className="ml-2 text-gray-700">Required Question</span>
                  </label>
                  
                  {isMultipleChoice && (
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        id="allow_multiple_selections"
                        {...register('allow_multiple_selections')}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                      />
                      <span className="ml-2 text-gray-700">Allow Multiple Selections</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Answer Options Section */}
          {isMultipleChoice && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-2">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <CheckCircle size={18} className="mr-2 text-blue-500" />
                  Answer Options
                </h3>
                <p className="text-sm text-gray-500">
                  Define the options users can select from. Optionally include images for each option.
                </p>
              </div>
              
              <div className="space-y-4">
                {answerOptions.map((option, index) => (
                  <div 
                    key={index} 
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 relative"
                  >
                    <div className="absolute top-4 right-4 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                      Option {index + 1}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Option Text
                        </label>
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition duration-150"
                          placeholder={`Option ${index + 1}`}
                        />
                      </div>
                      
                      <div className="md:col-span-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Image URL (optional)
                        </label>
                        <input
                          type="url"
                          value={option.image}
                          onChange={(e) => handleOptionChange(index, 'image', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition duration-150"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      
                      <div className="md:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition duration-150"
                          aria-label="Remove option"
                          disabled={answerOptions.length <= 1}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    {option.image && (
                      <div className="mt-3 p-2 border border-gray-200 rounded-md bg-gray-50">
                        <p className="text-xs text-gray-500 mb-1">Image Preview:</p>
                        <div className="h-16 bg-contain bg-center bg-no-repeat rounded" 
                             style={{ backgroundImage: `url(${option.image})` }}>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="mt-4 inline-flex items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Option
                </button>
              </div>
            </div>
          )}
          
          {/* Helper Video Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Video size={18} className="mr-2 text-blue-500" />
                Helper Video
              </h3>
              <p className="text-sm text-gray-500">
                Optionally add a helper video to assist users.
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center mb-4">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    id="has_helper_video"
                    {...register('has_helper_video')}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                  />
                  <span className="ml-2 text-gray-700 font-medium">Include Helper Video</span>
                </label>
                <span className="ml-3 text-sm text-gray-500">
                  If enabled, users will see a link to a helper video
                </span>
              </div>
              
              {hasHelperVideo && (
                <div className="mt-4 transition-all duration-300">
                  <label htmlFor="helper_video_url" className="block text-sm font-medium text-gray-700 mb-1">
                    Video URL
                  </label>
                  <div className="flex">
                    <div className="flex-grow">
                      <input
                        type="url"
                        id="helper_video_url"
                        {...register('helper_video_url')}
                        className={`w-full px-4 py-2.5 rounded-lg border ${
                          errors.helper_video_url ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        } shadow-sm transition duration-150`}
                        placeholder="https://example.com/video"
                      />
                      {errors.helper_video_url && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle size={14} className="mr-1" />
                          {errors.helper_video_url.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="ml-2 flex items-center">
                      <Video className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-500">
                    <p>Provide a URL to a video that helps users understand how to answer this question.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Conditional Logic Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <ChevronDown size={18} className="mr-2 text-blue-500" />
                Conditional Logic
              </h3>
              <p className="text-sm text-gray-500">
                Conditionally display this question based on answers to previous questions.
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-medium text-gray-900">Conditional Display Logic</h3>
                  <p className="text-sm text-gray-500">
                    Only show this question when specific answers are selected for previous questions
                  </p>
                </div>
                <div className="flex items-center">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={showConditionalLogic}
                      onChange={(e) => setShowConditionalLogic(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    />
                    <span className="ml-2 text-gray-700">Enable Conditional Logic</span>
                  </label>
                </div>
              </div>
              
              {showConditionalLogic && (
                <div className="transition-all duration-300">
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <label htmlFor="conditional_question" className="block text-sm font-medium text-gray-700 mb-1">
                        Depends on Question
                      </label>
                      <select
                        id="conditional_question"
                        {...register('conditional_question')}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition duration-150"
                      >
                        <option value="">Select a question</option>
                        {availableConditionalQuestions.map((q) => (
                          <option key={q.question_id} value={q.question_id}>
                            Step {q.step_number}: {q.question_text}
                          </option>
                        ))}
                      </select>
                      {errors.conditional_question && (
                        <p className="mt-1 text-sm text-red-600">{errors.conditional_question.message}</p>
                      )}
                    </div>
                    
                    {selectedQuestion && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Show when answer equals:
                          </label>
                          <div>
                            <label className="inline-flex items-center mr-4">
                              <input
                                type="radio"
                                {...register('conditional_operator')}
                                value="OR"
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700">Any selected (OR)</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                {...register('conditional_operator')}
                                value="AND"
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700">All selected (AND)</span>
                            </label>
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                          {selectedQuestion.is_multiple_choice && Array.isArray(selectedQuestion.answer_options) ? (
                            <div className="space-y-2">
                              {selectedQuestion.answer_options.map((option: any, index: number) => {
                                const optionText = typeof option === 'string' ? option : option.text;
                                const isSelected = conditionalValues.includes(optionText);
                                
                                return (
                                  <label key={index} className="flex items-start">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setConditionalValues([...conditionalValues, optionText]);
                                        } else {
                                          setConditionalValues(conditionalValues.filter(v => v !== optionText));
                                        }
                                      }}
                                      className="mt-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">{optionText}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm italic">
                              This question doesn't have predefined answer options. You can enter free text values:
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Status Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <AlertCircle size={18} className="mr-2 text-blue-500" />
                Status
              </h3>
              <p className="text-sm text-gray-500">
                Set the status of this question.
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-base font-medium text-gray-900">Question Status</h3>
                <p className="text-sm text-gray-500">
                  Control whether this question is active or inactive in the form
                </p>
              </div>
              
              <div className="mt-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="relative">
                  <select
                    id="status"
                    {...register('status')}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition duration-150 appearance-none bg-white pr-10"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 w-3 h-3 rounded-full mr-2 ${
                      getValues('status') === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-sm text-gray-700">
                      {getValues('status') === 'active' 
                        ? 'This question will be visible to users in the form' 
                        : 'This question will be hidden from users'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-6">
        <div className="text-sm text-gray-500">
          <span className="text-red-500">*</span> Required fields
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditMode ? 'Update Question' : 'Save Question'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}