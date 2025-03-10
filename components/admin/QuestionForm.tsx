"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ServiceCategory, FormQuestion } from '@/types/database.types';
import ConditionalLogic from './ConditionalLogic';

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
}

export default function QuestionForm({ 
  question, 
  categories, 
  categoryStepMap = {}, 
  conditionalQuestions = []
}: QuestionFormProps) {
  const isEditMode = !!question;
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize answer options as an array of objects with text and image properties
// Replace the problematic section with this code:
// Replace the problematic section with this code:
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
    formState: { errors }
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
      
      if (isEditMode && question) {
        // Update existing question
        const { error } = await supabase
          .from('FormQuestions')
          .update(formData)
          .eq('question_id', question.question_id);
        
        if (error) throw new Error(error.message);
      } else {
        // Create new question
        const { error } = await supabase
          .from('FormQuestions')
          .insert(formData);
        
        if (error) throw new Error(error.message);
      }
      
      // Redirect back to questions list
      router.push('/admin/form-questions');
      router.refresh(); // Refresh the page to show the new/updated question
      
    } catch (err: any) {
      setError(err.message || `An error occurred while ${isEditMode ? 'updating' : 'saving'} the question`);
      console.error(`Error ${isEditMode ? 'updating' : 'saving'} question:`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !question) return;
    
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const supabase = await createClient();
      
      // We're using a soft delete by setting is_deleted to true
      const { error } = await supabase
        .from('FormQuestions')
        .update({ is_deleted: true })
        .eq('question_id', question.question_id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Redirect back to questions list
      router.push('/admin/form-questions');
      router.refresh();
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the question');
      console.error('Error deleting question:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-8 divide-y divide-gray-200">
        <div className="space-y-6 pt-4">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Basic Information</h3>
            <p className="mt-1 text-sm text-gray-500">
              {isEditMode ? 'Update' : 'Define'} the basic properties of the question.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="service_category_id" className="block text-sm font-medium text-gray-700">
                Service Category *
              </label>
              <div className="mt-1">
                <select
                  id="service_category_id"
                  {...register('service_category_id')}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Select a service category</option>
                  {categories.map((category) => (
                    <option key={category.service_category_id} value={category.service_category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.service_category_id && (
                <p className="mt-2 text-sm text-red-600">{errors.service_category_id.message}</p>
              )}
            </div>
            
            <div className="sm:col-span-6">
              <label htmlFor="question_text" className="block text-sm font-medium text-gray-700">
                Question Text *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="question_text"
                  {...register('question_text')}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="e.g., Which fuel powers your boiler?"
                />
              </div>
              {errors.question_text && (
                <p className="mt-2 text-sm text-red-600">{errors.question_text.message}</p>
              )}
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="step_number" className="block text-sm font-medium text-gray-700">
                Step Number *
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  id="step_number"
                  min="1"
                  {...register('step_number', { valueAsNumber: true })}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              {errors.step_number && (
                <p className="mt-2 text-sm text-red-600">{errors.step_number.message}</p>
              )}
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="display_order_in_step" className="block text-sm font-medium text-gray-700">
                Display Order in Step *
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  id="display_order_in_step"
                  min="1"
                  {...register('display_order_in_step', { valueAsNumber: true })}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              {errors.display_order_in_step && (
                <p className="mt-2 text-sm text-red-600">{errors.display_order_in_step.message}</p>
              )}
            </div>
            
            <div className="sm:col-span-3">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="is_multiple_choice"
                    type="checkbox"
                    {...register('is_multiple_choice')}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="is_multiple_choice" className="font-medium text-gray-700">
                    Multiple Choice Question
                  </label>
                  <p className="text-gray-500">If enabled, user will select from a list of options</p>
                </div>
              </div>
            </div>
            
            {isMultipleChoice && (
              <div className="sm:col-span-3">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="allow_multiple_selections"
                      type="checkbox"
                      {...register('allow_multiple_selections')}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="allow_multiple_selections" className="font-medium text-gray-700">
                      Allow Multiple Selections
                    </label>
                    <p className="text-gray-500">If enabled, user can select multiple options</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="sm:col-span-3">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="is_required"
                    type="checkbox"
                    {...register('is_required')}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="is_required" className="font-medium text-gray-700">
                    Required Question
                  </label>
                  <p className="text-gray-500">If enabled, user must answer this question</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Answer Options - Updated to use combined text/image object */}
        {isMultipleChoice && (
          <div className="space-y-6 pt-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Answer Options</h3>
              <p className="mt-1 text-sm text-gray-500">
                Define the options users can select from. Optionally include images for each option.
              </p>
            </div>
            
            <div className="space-y-4">
              {answerOptions.map((option, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Option {index + 1} Text
                    </label>
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="mb-1 p-2 text-red-600 hover:text-red-800 rounded-md hover:bg-red-50"
                      aria-label="Remove option"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Add Option
              </button>
            </div>
          </div>
        )}
        
        {/* Helper Video */}
        <div className="space-y-6 pt-6">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Helper Video</h3>
            <p className="mt-1 text-sm text-gray-500">
              Optionally add a helper video to assist users.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="has_helper_video"
                    type="checkbox"
                    {...register('has_helper_video')}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="has_helper_video" className="font-medium text-gray-700">
                    Include Helper Video
                  </label>
                  <p className="text-gray-500">If enabled, users will see a link to a helper video</p>
                </div>
              </div>
            </div>
            
            {hasHelperVideo && (
              <div className="sm:col-span-6">
                <label htmlFor="helper_video_url" className="block text-sm font-medium text-gray-700">
                  Video URL
                </label>
                <div className="mt-1">
                  <input
                    type="url"
                    id="helper_video_url"
                    {...register('helper_video_url')}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="https://example.com/video"
                  />
                </div>
                {errors.helper_video_url && (
                  <p className="mt-2 text-sm text-red-600">{errors.helper_video_url.message}</p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Conditional Logic Component */}
        <ConditionalLogic
          showConditionalLogic={showConditionalLogic}
          setShowConditionalLogic={setShowConditionalLogic}
          availableQuestions={availableConditionalQuestions}
          selectedQuestion={selectedQuestion}
          conditionalValues={conditionalValues}
          setConditionalValues={setConditionalValues}
          register={register}
          errors={errors}
          stepNumber={stepNumber}
          selectedCategoryId={selectedCategoryId}
        />
        
        {/* Status */}
        <div className="space-y-6 pt-6">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Status</h3>
            <p className="mt-1 text-sm text-gray-500">
              Set the status of this question.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <div className="mt-1">
                <select
                  id="status"
                  {...register('status')}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-5">
        <div className="flex justify-between">
          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Question
            </button>
          )}
          
          <div className={isEditMode ? '' : 'ml-auto'}>
            <button
              type="button"
              onClick={() => router.push('/admin/form-questions')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Question' : 'Save Question'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export { default as QuestionForm } from './QuestionForm';