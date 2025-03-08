"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface DeleteQuestionButtonProps {
  questionId: string;
  questionText: string;
}

export function DeleteQuestionButton({ questionId, questionText }: DeleteQuestionButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    // Confirm deletion with the user
    const confirmMessage = `Are you sure you want to delete this question?\n\n"${questionText}"\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setIsDeleting(true);
      console.log(`Attempting to delete question with ID: ${questionId}`);
      
      // Use the client-side Supabase instance
      const supabase = await createClient();
      
      // Perform a soft delete by setting is_deleted = true
      const { data, error } = await supabase
        .from('FormQuestions')
        .update({ is_deleted: true })
        .eq('question_id', questionId)
        .select();
      
      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Failed to delete question: ${error.message}`);
      }
      
      // Log the response data to verify update was successful
      console.log('Delete operation response:', data);
      
      if (!data || data.length === 0) {
        throw new Error('No rows were updated. Question might not exist or you might not have permission.');
      }
      
      // Alert success before refreshing
      alert(`Question "${questionText}" has been successfully deleted.`);
      
      // Refresh the current page to update the list
      router.refresh();
      
    } catch (error) {
      console.error('Error deleting question:', error);
      alert(`Error deleting question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}

