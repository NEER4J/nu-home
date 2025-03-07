"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ServiceCategory, FormQuestion } from '@/types/database.types';

// Define form validation schema
const formSchema = z.object({
  service_category_id: z.string().uuid('Please select a service category'),
  question_text: z.string().min(5, 'Question text must be at least 5 characters'),
  step_number: z.number().min(1, 'Step number must be at least 1'),
  display_order_in_step: z.number().min(1, 'Display order must be at least 1'),
  is_multiple_choice: z.boolean().optional(),
  has_helper_video: z.boolean().optional(),
  helper_video_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  is_required: z.boolean().optional(),
  status: z.enum(['active', 'inactive']),
});

type FormValues = z.infer<typeof formSchema> & {
  answer_options: string[];
  conditional_question: string;
  conditional_values: string[];
  conditional_operator: 'AND' | 'OR';
};

interface EditQuestionFormProps {
  question: FormQuestion;
  categories: ServiceCategory[];
  conditionalQuestions: any[];
}

export default function EditQuestionForm({ 
  question, 
  categories, 
  conditionalQuestions 
}: EditQuestionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answerOptions, setAnswerOptions] = useState<string[]>(
    question.answer_options || ['']
  );
  const [showConditionalLogic, setShowConditionalLogic] = useState(
    !!question.conditional_display
  );
  
  // Extract conditional logic values if they exist
  const conditionalLogic = question.conditional_display || null;
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      service_category_id: question.service_category_id,
      question_text: question.question_text,
      step_number: question.step_number,
      display_order_in_step: question.display_order_in_step,
      is_multiple_choice: question.is_multiple_choice,
      has_helper_video: question.has_helper_video,
      helper_video_url: question.helper_video_url || '',
      is_required: question.is_required,
      status: question.status as 'active' | 'inactive',
      conditional_question: conditionalLogic?.dependent_on_question_id || '',
      conditional_values: conditionalLogic?.show_when_answer_equals || [],
      conditional_operator: conditionalLogic?.logical_operator || 'OR',
    }
  });
  
  const isMultipleChoice = watch('is_multiple_choice');
  const hasHelperVideo = watch('has_helper_video');
  
  const handleAddOption = () => {
    setAnswerOptions([...answerOptions, '']);
  };
  
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...answerOptions];
    newOptions[index] = value;
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
      
      // Prepare the data
      const formData: any = {
        service_category_id: data.service_category_id,
        question_text: data.question_text,
        step_number: data.step_number,
        display_order_in_step: data.display_order_in_step,
        is_multiple_choice: data.is_multiple_choice || false,
        answer_options: data.is_multiple_choice ? answerOptions.filter(opt => opt.trim() !== '') : null,
        has_helper_video: data.has_helper_video || false,
        helper_video_url: data.has_helper_video ? data.helper_video_url : null,
        is_required: data.is_required || false,
        status: data.status,
      };
      
      // Add conditional logic if enabled
      if (showConditionalLogic && data.conditional_question) {
        formData.conditional_display = {
          dependent_on_question_id: data.conditional_question,
          show_when_answer_equals: data.conditional_values || [],
          logical_operator: data.conditional_operator || 'OR'
        };
      } else {
        formData.conditional_display = null;
      }
      
      // Submit to Supabase
      const supabase = createClient();
      const { error } = await supabase
        .from('FormQuestions')
        .update(formData)
        .eq('question_id', question.question_id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Redirect back to questions list
      router.push('/admin/form-questions');
      router.refresh(); // Refresh the page to show the updated question
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the question');
      console.error('Error updating question:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const supabase = createClient();
      
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
              Update the basic properties of the question.
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
        
        {/* Answer Options */}
        {isMultipleChoice && (
          <div className="space-y-6 pt-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Answer Options</h3>
              <p className="mt-1 text-sm text-gray-500">
                Define the options users can select from.
              </p>
            </div>
            
            <div className="space-y-4">
              {answerOptions.map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="ml-2 p-1 text-red-600 hover:text-red-800"
                  >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
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
        
        {/* Conditional Logic */}
        <div className="space-y-6 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Conditional Logic</h3>
              <p className="mt-1 text-sm text-gray-500">
                Optionally make this question only appear based on previous answers.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowConditionalLogic(!showConditionalLogic)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {showConditionalLogic ? 'Hide Conditional Logic' : 'Add Conditional Logic'}
              </button>
            </div>
          </div>
          
          {showConditionalLogic && (
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="conditional_question" className="block text-sm font-medium text-gray-700">
                  Show this question when:
                </label>
                <div className="mt-1">
                  <select
                    id="conditional_question"
                    {...register('conditional_question')}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Select a question</option>
                    {conditionalQuestions.map((question) => (
                      <option key={question.question_id} value={question.question_id}>
                        {question.question_text} (Step {question.step_number})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="conditional_operator" className="block text-sm font-medium text-gray-700">
                  Condition Type
                </label>
                <div className="mt-1">
                  <select
                    id="conditional_operator"
                    {...register('conditional_operator')}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="OR">Any selected (OR)</option>
                    <option value="AND">All selected (AND)</option>
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">
                  Answer Values (What the user selected)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    {...register('conditional_values')}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Comma-separated values, e.g.: Mains Gas,LPG"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Enter comma-separated values that the selected question must have for this question to appear.
                </p>
              </div>
            </div>
          )}
        </div>
        
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
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete Question
          </button>
          
          <div>
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
              {isSubmitting ? 'Saving...' : 'Update Question'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export { default as EditQuestionForm } from './EditQuestionForm';
