// app/admin/form-questions/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { QuestionForm } from '@/components/admin/QuestionForm';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Edit Question | Nu-Home Admin',
  description: 'Edit an existing form question'
};

// Remove the interface entirely
// interface PageProps {
//   params: {
//     id: string;
//   };
// }

// Use the standard Next.js page props pattern for App Router
export default async function EditQuestionPage({
  params,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const questionId = params.id;
  const supabase = await createClient();
  
  // Fetch the question
  const { data: question, error } = await supabase
    .from('FormQuestions')
    .select('*')
    .eq('question_id', questionId)
    .eq('is_deleted', false)
    .single();
  
  // If question not found, show 404
  if (!question || error) {
    notFound();
  }
  
  // Fetch categories
  const { data: categories } = await supabase
    .from('ServiceCategories')
    .select('*')
    .order('name');
  
  // Fetch potential conditional questions (from earlier steps in the same category)
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>
        <p className="mt-2 text-sm text-gray-500">
          Update question details or conditions.
        </p>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        <QuestionForm 
          question={question}
          categories={categories || []}
          conditionalQuestions={conditionalQuestions || []}
        />
      </div>
    </div>
  );
}