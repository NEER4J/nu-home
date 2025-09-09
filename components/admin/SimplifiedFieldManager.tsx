'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, GripVertical, Edit, Trash2 } from 'lucide-react';
import { CategoryField, FieldChild } from '@/types/product.types';
import SimplifiedFieldForm from './SimplifiedFieldForm';
import SimplifiedFieldRenderer from './SimplifiedFieldRenderer';

type SimplifiedFieldManagerProps = {
  categoryId: string;
};

export default function SimplifiedFieldManager({ categoryId }: SimplifiedFieldManagerProps) {
  const router = useRouter();
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState<CategoryField | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Fetch existing category fields
  useEffect(() => {
    async function fetchFields() {
      try {
        const response = await fetch(`/api/category-fields/simplified?categoryId=${categoryId}`);
        if (!response.ok) throw new Error('Failed to fetch fields');
        
        const fieldsData = await response.json();
        setFields(fieldsData);
      } catch (error) {
        console.error('Error fetching fields:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchFields();
  }, [categoryId]);
  
  // Start editing a field
  const handleEditField = (field: CategoryField) => {
    setEditingField(field);
    setShowAddForm(false);
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingField(null);
    setShowAddForm(false);
  };
  
  // Save a new field
  const handleSaveNewField = async (fieldData: Partial<CategoryField>) => {
    try {
      const response = await fetch('/api/category-fields/simplified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...fieldData,
          service_category_id: categoryId,
          display_order: fields.length + 1,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add field');
      }
      
      const newField = await response.json();
      setFields([...fields, newField]);
      setShowAddForm(false);
      router.refresh();
    } catch (error) {
      console.error('Error adding field:', error);
      alert(`Failed to add field: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Save field edits
  const handleSaveFieldEdit = async (fieldData: Partial<CategoryField>) => {
    if (!editingField) return;
    
    try {
      const response = await fetch('/api/category-fields/simplified', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...fieldData,
          fieldId: editingField.field_id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update field');
      }
      
      const updatedField = await response.json();
      setFields(fields.map(field => 
        field.field_id === editingField.field_id ? updatedField : field
      ));
      
      setEditingField(null);
      router.refresh();
    } catch (error) {
      console.error('Error updating field:', error);
      alert(`Failed to update field: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Delete a field
  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;
    
    try {
      const response = await fetch(`/api/category-fields/simplified?fieldId=${fieldId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete field');
      
      setFields(fields.filter(field => field.field_id !== fieldId));
      router.refresh();
    } catch (error) {
      console.error('Error deleting field:', error);
      alert('Failed to delete field');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-gray-400">Loading field manager...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Custom Fields</h3>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage custom fields with groups and repeaters. Drag to reorder.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingField(null);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus size={16} />
          <span>Add New Field</span>
        </button>
      </div>

      {/* Fields List */}
      {fields.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Plus size={32} className="text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No custom fields created yet</p>
          <p className="text-sm text-gray-500 mt-1">Click "Add New Field" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4 flex items-center space-x-2">
            <GripVertical size={16} />
            <span>Fields are stored as JSON with nested structure</span>
          </div>
          
          {fields
            .sort((a, b) => a.display_order - b.display_order)
            .map((field) => (
              <SimplifiedFieldRenderer
                key={field.field_id}
                field={field}
                onEdit={handleEditField}
                onDelete={handleDeleteField}
              />
            ))}
        </div>
      )}
      
      {/* Edit/Add Form */}
      {(editingField || showAddForm) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <SimplifiedFieldForm 
            field={editingField}
            isEditing={!!editingField}
            onCancel={handleCancelEdit}
            onSave={editingField ? handleSaveFieldEdit : handleSaveNewField}
          />
        </div>
      )}
      
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Simplified JSON Structure</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>One database entry per field</strong> - much cleaner than multiple entries</li>
                <li><strong>Nested children stored as JSON</strong> - unlimited nesting levels supported</li>
                <li><strong>Better performance</strong> - fewer database queries and relationships</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}