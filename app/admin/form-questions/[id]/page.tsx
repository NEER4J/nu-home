// app/admin/form-questions/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { QuestionForm } from '@/components/admin/QuestionForm';
import { notFound } from 'next/navigation';

// Define PageProps with params as a Promise
interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EditQuestionPage({
  params,
}: PageProps) {
  // Resolve the params Promise
  const resolvedParams = await params;
  const questionId = resolvedParams.id;
  
  const supabase = await createClient();
  
  // Fetch the question
  const { data: question, error } = await supabase
    .from('FormQuestions')
    .select('*')
    .eq('question_id', questionId)
    .eq('is_deleted', false)
    .single();
  
  if (!question || error) {
    notFound();
  }
  
  // Fetch categories
  const { data: categories } = await supabase
    .from('ServiceCategories')
    .select('*')
    .order('name');
  
  // Fetch conditional questions
  const { data: conditionalQuestions } = await supabase
    .from('FormQuestions')
    .select('question_id, question_text, step_number, is_multiple_choice, answer_options')
    .eq('service_category_id', question.service_category_id)
    .eq('status', 'active')
    .eq('is_deleted', false)
    .lt('step_number', question.step_number)
    .neq('question_id', questionId)
    .order('step_number');
  
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>
        <p className="mt-2 text-sm text-gray-500">
          Update question details or conditions.
        </p>
      </div>
      
      <div className="bg-white  overflow-hidden sm:rounded-lg p-6">
        <QuestionForm 
          question={question}
          categories={categories || []}
          conditionalQuestions={conditionalQuestions || []}
        />
      </div>
    </div>
  );
}