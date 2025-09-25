import { createClient } from '@/utils/supabase/server';
import { QuestionForm } from '@/components/admin/QuestionForm';

export const metadata = {
  title: 'Create New Question | Quote AI Admin',
  description: 'Create a new form question for quote submission forms'
};

export default async function NewQuestionPage() {
  const supabase = await createClient();
  
  // Fetch categories
  const { data: categories } = await supabase
    .from('ServiceCategories')
    .select('*')
    .order('name');
  
  // Fetch the last step for each category to suggest the next step
  const { data: lastStepsData } = await supabase
    .from('FormQuestions')
    .select('service_category_id, step_number')
    .order('step_number', { ascending: false });
  
  // Create a map of category_id to max step number
  const categoryStepMap: Record<string | number, number> = {};
  
  lastStepsData?.forEach(question => {
    const categoryId = question.service_category_id;
    if (!categoryStepMap[categoryId] || question.step_number > categoryStepMap[categoryId]) {
      categoryStepMap[categoryId] = question.step_number;
    }
  });
  
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Create New Question</h1>
        <p className="mt-2 text-sm text-gray-500">
          Add a new question to the form for a service category.
        </p>
      </div>
      
      <div className="bg-white  overflow-hidden sm:rounded-lg p-6">
        <QuestionForm 
          categories={categories || []} 
          categoryStepMap={categoryStepMap} 
        />
      </div>
    </div>
  );
}