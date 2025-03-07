"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ServiceCategory } from '@/types/database.types';

// Define form validation schema
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
});

type FormValues = z.infer<typeof formSchema> & {
  answer_options: string[];
  answer_images: string[];
  conditional_question: string;
  conditional_values: string | string[];
  conditional_operator: 'AND' | 'OR';
};

interface NewQuestionFormProps {
  categories: ServiceCategory[];
  categoryStepMap: Record<string, number>;
}

export default function NewQuestionForm({ categories, categoryStepMap }: NewQuestionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answerOptions, setAnswerOptions] = useState<string[]>(['']);
  const [answerImages, setAnswerImages] = useState<string[]>(['']);
  const [conditionalQuestions, setConditionalQuestions] = useState<any[]>([]);
  const [showConditionalLogic, setShowConditionalLogic] = useState(false);
  const [conditionalValues, setConditionalValues] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  
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
      step_number: 1,
      display_order_in_step: 1,
      is_multiple_choice: false,
      allow_multiple_selections: false,
      has_helper_video: false,
      is_required: true,
      status: 'active',
      answer_options: [''],
      answer_images: [''],
      conditional_operator: 'OR',
    }
  });
  
  const selectedCategoryId = watch('service_category_id');
  const isMultipleChoice = watch('is_multiple_choice');
  const allowMultipleSelections = watch('allow_multiple_selections');
  const hasHelperVideo = watch('has_helper_video');
  const stepNumber = watch('step_number');
  const conditionalQuestionId = watch('conditional_question');
  
  // Update step number suggestion when category changes
  useEffect(() => {
    if (selectedCategoryId && categoryStepMap[selectedCategoryId]) {
      setValue('step_number', categoryStepMap[selectedCategoryId] + 1);
    } else {
      setValue('step_number', 1);
    }
  }, [selectedCategoryId, categoryStepMap, setValue]);
  
  // Fetch existing questions for conditional logic when category changes
  useEffect(() => {
    async function fetchQuestions() {
      if (!selectedCategoryId) return;
      
      const supabase = createClient();
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
      setConditionalQuestions(data?.filter(q => q.step_number < stepNumber) || []);
    }
    
    fetchQuestions();
  }, [selectedCategoryId, stepNumber]);
  
  // Update selected question when conditional question changes
  useEffect(() => {
    if (conditionalQuestionId) {
      const question = conditionalQuestions.find(q => q.question_id === conditionalQuestionId);
      setSelectedQuestion(question);
      // Reset conditional values when question changes
      setConditionalValues([]);
    } else {
      setSelectedQuestion(null);
    }
  }, [conditionalQuestionId, conditionalQuestions]);
  
  const handleAddOption = () => {
    setAnswerOptions([...answerOptions, '']);
    setAnswerImages([...answerImages, '']);
  };
  
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...answerOptions];
    newOptions[index] = value;
    setAnswerOptions(newOptions);
  };
  
  const handleImageUrlChange = (index: number, value: string) => {
    const newImages = [...answerImages];
    newImages[index] = value;
    setAnswerImages(newImages);
  };
  
  const handleRemoveOption = (index: number) => {
    if (answerOptions.length <= 1) return;
    const newOptions = answerOptions.filter((_, i) => i !== index);
    const newImages = answerImages.filter((_, i) => i !== index);
    setAnswerOptions(newOptions);
    setAnswerImages(newImages);
  };
  
  const handleConditionalValueChange = (value: string, checked: boolean) => {
    if (checked) {
      setConditionalValues(prev => [...prev, value]);
    } else {
      setConditionalValues(prev => prev.filter(v => v !== value));
    }
  };
  
 // Replace the onSubmit function with this more explicit version:

 const onSubmit = async (data: FormValues) => {
  try {
    setIsSubmitting(true);
    setError(null);
    
    // Log all form values for debugging
    console.log("Form values from hook:", data);
    console.log("Conditional values state:", conditionalValues);
    console.log("Selected question:", selectedQuestion);
    console.log("Show conditional logic:", showConditionalLogic);
    
    // Prepare the base data
    const formData: any = {
      service_category_id: data.service_category_id,
      question_text: data.question_text,
      step_number: data.step_number,
      display_order_in_step: data.display_order_in_step,
      is_multiple_choice: data.is_multiple_choice || false,
      allow_multiple_selections: data.is_multiple_choice ? data.allow_multiple_selections || false : false,
      answer_options: data.is_multiple_choice ? 
        answerOptions.filter(opt => opt.trim() !== '') : 
        null,
      answer_images: data.is_multiple_choice ?
        answerOptions.map((opt, index) => answerImages[index]?.trim() || null)
          .filter((_, index) => answerOptions[index].trim() !== '') :
        null,
      has_helper_video: data.has_helper_video || false,
      helper_video_url: data.has_helper_video ? data.helper_video_url : null,
      is_required: data.is_required || false,
      status: data.status,
      is_deleted: false,
    };
    
    // Add conditional logic if enabled and a question is selected
    if (showConditionalLogic && data.conditional_question) {
      console.log("Conditional question selected:", data.conditional_question);
      
      // Extract conditional values
      let valuesArray: string[] = [];
      
      if (conditionalValues.length > 0) {
        // Use values from checkbox selection
        valuesArray = conditionalValues;
        console.log("Using values from checkboxes:", valuesArray);
      } else if (typeof data.conditional_values === 'string' && data.conditional_values.trim()) {
        // Use values from text input (comma-separated)
        valuesArray = data.conditional_values.split(',').map(v => v.trim()).filter(v => v);
        console.log("Using values from text input:", valuesArray);
      } else if (Array.isArray(data.conditional_values)) {
        // Handle case where it's already an array
        valuesArray = data.conditional_values.filter(v => v);
        console.log("Using values from array:", valuesArray);
      }
      
      // Only set conditional_display if a question is selected and values are provided
      if (data.conditional_question && valuesArray.length > 0) {
        formData.conditional_display = {
          dependent_on_question_id: data.conditional_question,
          show_when_answer_equals: valuesArray,
          logical_operator: data.conditional_operator || 'OR'
        };
        console.log("Created conditional display:", JSON.stringify(formData.conditional_display));
      }
    }
    
    // Debug output before submission
    console.log("Full form data being submitted:", JSON.stringify(formData, null, 2));
    
    // Submit to Supabase
    const supabase = createClient();
    const { data: savedData, error } = await supabase
      .from('FormQuestions')
      .insert(formData)
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    console.log('Successfully saved question with data:', savedData);
    
    // Redirect back to questions list
    router.push('/admin/form-questions');
    router.refresh(); // Refresh the page to show the new question
    
  } catch (err: any) {
    setError(err.message || 'An error occurred while saving the question');
    console.error('Error saving question:', err);
  } finally {
    setIsSubmitting(false);
  }
}  
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
              Define the basic properties of the question.
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
        
        {/* Answer Options */}
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
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
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
                      value={answerImages[index] || ''}
                      onChange={(e) => handleImageUrlChange(index, e.target.value)}
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
            <div>
              <div className="rounded-md bg-blue-50 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">
                      Conditional logic allows this question to be shown or hidden based on answers to previous questions.
                      Only questions from earlier steps in the same category can be used as dependencies.
                    </p>
                  </div>
                </div>
              </div>
              
              {conditionalQuestions.length === 0 && selectedCategoryId && (
                <div className="rounded-md bg-yellow-50 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">No available questions</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          There are no questions from earlier steps in this category that can be used for conditional logic.
                          Either add questions to earlier steps first, or increase the step number of this question.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
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
                      disabled={conditionalQuestions.length === 0}
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
                
                {selectedQuestion && (
                  <>
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
                      <fieldset>
                        <legend className="block text-sm font-medium text-gray-700">
                          When answer is: (select one or more)
                        </legend>
                        <div className="mt-2 space-y-2">
                          {selectedQuestion.is_multiple_choice && selectedQuestion.answer_options ? (
                            selectedQuestion.answer_options.map((option: any, idx: number) => (
                              <div key={idx} className="flex items-start">
                                <div className="flex items-center h-5">
                                  <input
                                    id={`condition-value-${idx}`}
                                    type="checkbox"
                                    value={option}
                                    checked={conditionalValues.includes(option)}
                                    onChange={(e) => handleConditionalValueChange(option, e.target.checked)}
                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                  />
                                </div>
                                <div className="ml-3 text-sm">
                                  <label htmlFor={`condition-value-${idx}`} className="font-medium text-gray-700">
                                    {option}
                                  </label>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="mt-2">
                              <input
                                type="text"
                                {...register('conditional_values')}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                placeholder="Comma-separated values, e.g.: Mains Gas,LPG"
                                onChange={(e) => setConditionalValues(e.target.value.split(',').map(v => v.trim()).filter(v => v))}
                              />
                              <p className="mt-2 text-sm text-gray-500">
                                Enter comma-separated values that the selected question must have for this question to appear.
                              </p>
                            </div>
                          )}
                        </div>
                      </fieldset>
                    </div>
                  </>
                )}
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
        <div className="flex justify-end">
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
            {isSubmitting ? 'Saving...' : 'Save Question'}
          </button>
        </div>
      </div>
    </form>
  );
}

export { default as NewQuestionForm } from './NewQuestionForm';