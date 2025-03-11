"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function TestConditionalLogic() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  
  const testInsert = async () => {
    setLoading(true);
    try {
      const supabase = await createClient();
      
      // Create a test object with conditional_display
      const testData = {
        service_category_id: "d8e76f23-baeb-45ad-a3e8-959d562f884d", // Make sure this exists in your DB
        question_text: "Test Conditional Question",
        step_number: 2,
        display_order_in_step: 1,
        is_multiple_choice: true,
        answer_options: ["Option 1", "Option 2"],
        is_required: true,
        status: "active",
        // The important part - explicitly define conditional_display
        conditional_display: {
          dependent_on_question_id: "some-uuid-here", // This doesn't need to exist for the test
          show_when_answer_equals: ["Test Value"],
          logical_operator: "OR"
        }
      };
      
      console.log("Inserting test data:", JSON.stringify(testData));
      
      // Try to insert with the conditional_display
      const { data, error } = await supabase
        .from('FormQuestions')
        .insert(testData)
        .select();
      
      if (error) {
        throw error;
      }
      
      setResult(JSON.stringify(data, null, 2));
      
    } catch (error) {
      console.error("Error in test:", error);
      setResult(`Error: ${JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-4 bg-white rounded -md">
      <h2 className="text-lg font-bold mb-4">Test Conditional Logic</h2>
      
      <button
        onClick={testInsert}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Test Insert'}
      </button>
      
      {result && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-96">{result}</pre>
        </div>
      )}
    </div>
  );
}