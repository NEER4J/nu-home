// components/admin/FormFlowEditor.jsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import QuestionNode from './flow-nodes/QuestionNode';
import AddButtonNode from './flow-nodes/AddButtonNode';
import ConditionalNode from './flow-nodes/ConditionalNode';
import { QuestionDialog } from './QuestionDialog';
import { ConditionalDialog } from './ConditionalDialog';
import dynamic from 'next/dynamic';

// Dynamically import ReactFlow to avoid SSR issues
const ReactFlow = dynamic(
  () => import('reactflow').then((mod) => mod.ReactFlow),
  { ssr: false }
);

const Background = dynamic(() => import('reactflow').then(mod => mod.Background), { ssr: false });
const Controls = dynamic(() => import('reactflow').then(mod => mod.Controls), { ssr: false });
const Panel = dynamic(() => import('reactflow').then(mod => mod.Panel), { ssr: false });
const MiniMap = dynamic(() => import('reactflow').then(mod => mod.MiniMap), { ssr: false });

// Define nodeTypes outside of the component to prevent recreation on each render
const nodeTypes = {
  questionNode: QuestionNode,
  addButtonNode: AddButtonNode,
  conditionalNode: ConditionalNode
};

// Define default viewport outside the component
const defaultViewport = { x: 0, y: 0, zoom: 0.8 };

export default function FormFlowEditor({ initialCategories }) {
  const router = useRouter();
  const reactFlowWrapper = useRef(null);
  
  // State
  const [categories, setCategories] = useState(initialCategories || []);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [questions, setQuestions] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInactiveQuestions, setShowInactiveQuestions] = useState(false);
  
  // Dialog state
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestionPosition, setNewQuestionPosition] = useState(null);
  const [isConditionalDialogOpen, setIsConditionalDialogOpen] = useState(false);
  const [editingConditional, setEditingConditional] = useState(null);
  const [sourceQuestionId, setSourceQuestionId] = useState(null);
  
  // Memoized handlers to prevent recreation on each render
  const handleEditQuestion = useCallback((questionId) => {
    const question = questions.find(q => q.question_id === questionId);
    if (question) {
      setEditingQuestion(question);
      setNewQuestionPosition(null);
      setIsQuestionDialogOpen(true);
    }
  }, [questions]);
  
  const handleDeleteQuestion = useCallback(async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const supabase = await createClient();
      
      const { error } = await supabase
        .from('FormQuestions')
        .update({ is_deleted: true })
        .eq('question_id', questionId);
      
      if (error) throw error;
      
      // Update the local state
      setQuestions(prevQuestions => prevQuestions.filter(q => q.question_id !== questionId));
      
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleAddConditional = useCallback((questionId) => {
    setSourceQuestionId(null);
    setEditingConditional(questionId);
    setIsConditionalDialogOpen(true);
  }, []);
  
  const handleEditConditional = useCallback((questionId, sourceId) => {
    setSourceQuestionId(sourceId);
    setEditingConditional(questionId);
    setIsConditionalDialogOpen(true);
  }, []);
  
  const handleDeleteConditional = useCallback((conditionalId) => {
    if (!window.confirm('Are you sure you want to remove this condition?')) {
      return;
    }
    
    // Extract the question ID from conditional ID (format: "cond-{questionId}")
    const questionId = conditionalId.replace('cond-', '');
    
    // Find the question
    const question = questions.find(q => q.question_id === questionId);
    if (!question) return;
    
    // Update the question to remove conditional display
    handleUpdateQuestionConditional(questionId, null);
  }, [questions]);
  
  const handleAddQuestion = useCallback((position) => {
    setNewQuestionPosition(position);
    setEditingQuestion(null);
    setIsQuestionDialogOpen(true);
  }, []);
  
  // Event handlers
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };
  
  const handleToggleInactive = () => {
    setShowInactiveQuestions(!showInactiveQuestions);
  };
  
  const handleUpdateQuestionConditional = async (questionId, conditionalDisplay) => {
    try {
      setIsLoading(true);
      
      const supabase = await createClient();
      
      const { error } = await supabase
        .from('FormQuestions')
        .update({ conditional_display: conditionalDisplay })
        .eq('question_id', questionId);
      
      if (error) throw error;
      
      // Update the local state
      setQuestions(questions.map(q => 
        q.question_id === questionId 
          ? { ...q, conditional_display: conditionalDisplay }
          : q
      ));
      
      setIsConditionalDialogOpen(false);
      
    } catch (error) {
      console.error('Error updating conditional logic:', error);
      alert('Failed to update conditional logic: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQuestionSaved = (updatedQuestion) => {
    setIsQuestionDialogOpen(false);
    
    if (!updatedQuestion) return;
    
    if (editingQuestion) {
      // Update existing question
      setQuestions(questions.map(q => 
        q.question_id === updatedQuestion.question_id ? updatedQuestion : q
      ));
    } else {
      // Add new question
      setQuestions([...questions, updatedQuestion]);
    }
  };
  
  const handleSaveConditional = (conditionalData) => {
    if (!editingConditional) return;
    
    const conditionalDisplay = {
      dependent_on_question_id: conditionalData.sourceQuestionId,
      show_when_answer_equals: conditionalData.values,
      logical_operator: conditionalData.operator
    };
    
    handleUpdateQuestionConditional(editingConditional, conditionalDisplay);
  };
  
  // Fetch questions when selected category changes
  useEffect(() => {
    if (!selectedCategory) {
      setQuestions([]);
      setNodes([]);
      setEdges([]);
      return;
    }
    
    const fetchQuestions = async () => {
      setIsLoading(true);
      
      try {
        const supabase = await createClient();
        
        let query = supabase
          .from('FormQuestions')
          .select(`
            *,
            ServiceCategories (
              name
            )
          `)
          .eq('service_category_id', selectedCategory)
          .eq('is_deleted', false);
          
        if (!showInactiveQuestions) {
          query = query.eq('status', 'active');
        }
        
        const { data, error } = await query
          .order('step_number')
          .order('display_order_in_step');
        
        if (error) throw error;
        
        setQuestions(data || []);
      } catch (error) {
        console.error('Error fetching questions:', error);
        alert('Failed to load questions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuestions();
  }, [selectedCategory, showInactiveQuestions]);
  
  // Convert questions to nodes and edges
  useEffect(() => {
    if (questions.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    // Group by step
    const questionsByStep = questions.reduce((acc, question) => {
      if (!acc[question.step_number]) {
        acc[question.step_number] = [];
      }
      acc[question.step_number].push(question);
      return acc;
    }, {});
    
    // Sort steps
    const sortedSteps = Object.keys(questionsByStep).sort((a, b) => Number(a) - Number(b));
    
    let newNodes = [];
    let newEdges = [];
    let yOffset = 50;
    const xCenter = 400;
    const verticalSpacing = 150;
    const addButtonVerticalSpacing = 70;
    
    // Create nodes for each question
    sortedSteps.forEach((step, stepIndex) => {
      const stepQuestions = questionsByStep[step].sort(
        (a, b) => a.display_order_in_step - b.display_order_in_step
      );
      
      stepQuestions.forEach((question, questionIndex) => {
        // Create question node
        newNodes.push({
          id: question.question_id,
          type: 'questionNode',
          position: { x: xCenter, y: yOffset },
          data: {
            ...question,
            id: question.question_id,
            onEdit: handleEditQuestion,
            onDelete: handleDeleteQuestion,
            onAddConditional: handleAddConditional,
            hasConditionalButton: !!question.conditional_display
          }
        });
        
        // If not the last question in the step, connect to next
        if (questionIndex < stepQuestions.length - 1) {
          const nextQuestion = stepQuestions[questionIndex + 1];
          newEdges.push({
            id: `e-${question.question_id}-${nextQuestion.question_id}`,
            source: question.question_id,
            target: nextQuestion.question_id,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#94a3b8', strokeWidth: 2 }
          });
        }
        
        // Add conditional node if this question has conditional display
        if (question.conditional_display) {
          const conditionalId = `cond-${question.question_id}`;
          const sourceId = question.conditional_display.dependent_on_question_id;
          const conditionXPosition = xCenter - 300;
          
          // Create conditional node
          newNodes.push({
            id: conditionalId,
            type: 'conditionalNode',
            position: { x: conditionXPosition, y: yOffset - 20 },
            data: {
              id: conditionalId,
              condition: {
                operator: question.conditional_display.logical_operator,
                values: question.conditional_display.show_when_answer_equals
              },
              onEdit: () => handleEditConditional(question.question_id, sourceId),
              onDelete: handleDeleteConditional
            }
          });
          
          // Add edges from source question to conditional node
          newEdges.push({
            id: `e-${sourceId}-${conditionalId}`,
            source: sourceId,
            target: conditionalId,
            type: 'smoothstep',
            style: { stroke: '#9333ea', strokeWidth: 2 }
          });
          
          // Add edge from conditional to target question
          newEdges.push({
            id: `e-${conditionalId}-${question.question_id}`,
            source: conditionalId,
            target: question.question_id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#9333ea', strokeWidth: 2 }
          });
        }
        
        // Increment Y position for next question
        yOffset += verticalSpacing;
        
        // Add a 'new question' node between questions
        if (questionIndex < stepQuestions.length - 1) {
          const addButtonId = `add-${question.question_id}`;
          newNodes.push({
            id: addButtonId,
            type: 'addButtonNode',
            position: { x: xCenter, y: yOffset - verticalSpacing/2 },
            data: {
              position: { step: Number(step), order: question.display_order_in_step + 1 },
              onClick: handleAddQuestion
            }
          });
        }
      });
      
      // If not the last step, connect last question to first question of next step
      if (stepIndex < sortedSteps.length - 1) {
        const lastQuestionInStep = stepQuestions[stepQuestions.length - 1];
        const nextStep = sortedSteps[stepIndex + 1];
        const firstQuestionInNextStep = questionsByStep[nextStep][0];
        
        newEdges.push({
          id: `e-step-${lastQuestionInStep.question_id}-${firstQuestionInNextStep.question_id}`,
          source: lastQuestionInStep.question_id,
          target: firstQuestionInNextStep.question_id,
          type: 'smoothstep',
          style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5' },
          label: 'Next Step',
          labelStyle: { fill: '#64748b', fontWeight: 600 }
        });
      }
      
      // Add a 'new question' node at the end of each step
      const lastQuestionInStep = stepQuestions[stepQuestions.length - 1];
      const addButtonId = `add-end-${step}`;
      newNodes.push({
        id: addButtonId,
        type: 'addButtonNode',
        position: { x: xCenter, y: yOffset - verticalSpacing/2 + addButtonVerticalSpacing },
        data: {
          position: { step: Number(step), order: lastQuestionInStep.display_order_in_step + 1 },
          onClick: handleAddQuestion
        }
      });
      
      yOffset += addButtonVerticalSpacing;
    });
    
    // Add button for new step at the very end
    newNodes.push({
      id: 'add-new-step',
      type: 'addButtonNode',
      position: { x: xCenter, y: yOffset },
      data: {
        position: { step: sortedSteps.length > 0 ? Number(sortedSteps[sortedSteps.length - 1]) + 1 : 1, order: 1 },
        onClick: handleAddQuestion
      }
    });
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [questions, handleEditQuestion, handleDeleteQuestion, handleAddConditional, handleEditConditional, handleDeleteConditional, handleAddQuestion]);
  
  // Memoize the onConnect callback
  const onConnect = useCallback((params) => {
    // When a new connection is made, open the conditional dialog
    const sourceQuestion = questions.find(q => q.question_id === params.source);
    const targetQuestion = questions.find(q => q.question_id === params.target);
    
    if (sourceQuestion && targetQuestion) {
      setSourceQuestionId(params.source);
      setEditingConditional(params.target);
      setIsConditionalDialogOpen(true);
    }
  }, [questions]);
  
  // Memoize node changes handler
  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const updatedNodes = [...nds];
      changes.forEach(change => {
        if (change.type === 'position' && change.position) {
          const index = updatedNodes.findIndex(n => n.id === change.id);
          if (index !== -1) {
            updatedNodes[index] = {
              ...updatedNodes[index],
              position: change.position
            };
          }
        }
      });
      return updatedNodes;
    });
  }, []);
  
  // Memoize edge changes handler
  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => {
      const updatedEdges = [...eds];
      changes.forEach(change => {
        if (change.type === 'remove') {
          const index = updatedEdges.findIndex(e => e.id === change.id);
          if (index !== -1) {
            updatedEdges.splice(index, 1);
          }
        }
      });
      return updatedEdges;
    });
  }, []);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with Controls */}
      <div className="border-b p-4 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">
                Service Category
              </label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.service_category_id} value={category.service_category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedCategory && (
              <button 
                onClick={handleToggleInactive}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md -sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mt-5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z" clipRule="evenodd" />
                </svg>
                {showInactiveQuestions ? 'Hide Inactive' : 'Show Inactive'}
              </button>
            )}
          </div>
          
          {selectedCategory && (
            <div className="flex gap-2">
              <button 
                onClick={() => handleAddQuestion({ step: 1, order: 1 })}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Add Question
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* How to Use Instructions */}
      <div className="border-b p-4 bg-white">
        <h2 className="font-medium text-gray-800 mb-2">How to Use:</h2>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Click + buttons to add new questions</li>
          <li>• Click Edit on a question to modify it</li>
          <li>• Add conditions to create branching logic</li>
          <li>• Connect questions to create custom flows</li>
        </ul>
      </div>
      
      {/* Flow Editor Area */}
      <div className="flex-grow relative" ref={reactFlowWrapper}>
        {!selectedCategory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="mt-2 text-lg font-medium text-gray-900">Select a category to begin</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a service category to view and edit its questions
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">Loading questions...</p>
            </div>
          </div>
        ) : (
          <>
            {nodes.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No questions found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This category doesn't have any questions yet
                  </p>
                  <button
                    onClick={() => handleAddQuestion({ step: 1, order: 1 })}
                    className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Add First Question
                  </button>
                </div>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.5}
                maxZoom={1.5}
                defaultViewport={defaultViewport}
                attributionPosition="bottom-right"
                connectOnClick={false}
              >
                <Controls />
                <Background color="#f1f5f9" gap={16} />
              </ReactFlow>
            )}
          </>
        )}
      </div>
      
      {/* Question Dialog */}
      {isQuestionDialogOpen && (
        <QuestionDialog
          isOpen={isQuestionDialogOpen}
          onClose={() => setIsQuestionDialogOpen(false)}
          question={editingQuestion}
          categories={categories}
          selectedCategoryId={selectedCategory}
          newQuestionPosition={newQuestionPosition}
          availableQuestions={questions.filter(q => 
            (!editingQuestion || q.question_id !== editingQuestion.question_id) &&
            (!editingQuestion || q.step_number < editingQuestion.step_number)
          )}
          onSave={handleQuestionSaved}
        />
      )}
      
      {/* Conditional Logic Dialog */}
      {isConditionalDialogOpen && (
        <ConditionalDialog
          isOpen={isConditionalDialogOpen}
          onClose={() => setIsConditionalDialogOpen(false)}
          targetQuestionId={editingConditional}
          availableQuestions={questions.filter(q => 
            q.question_id !== editingConditional && 
            (q.step_number < questions.find(tq => tq.question_id === editingConditional)?.step_number ||
             (q.step_number === questions.find(tq => tq.question_id === editingConditional)?.step_number &&
              q.display_order_in_step < questions.find(tq => tq.question_id === editingConditional)?.display_order_in_step))
          )}
          preselectedSourceId={sourceQuestionId}
          initialValues={
            questions.find(q => q.question_id === editingConditional)?.conditional_display || {
              operator: 'OR',
              values: []
            }
          }
          onSave={handleSaveConditional}
        />
      )}
    </div>
  );
}