'use client';

import { useState } from 'react';
import { 
  Type, 
  Hash, 
  FileText, 
  ChevronDown, 
  CheckSquare, 
  Calendar, 
  Image as ImageIcon, 
  Folder, 
  RotateCcw,
  GripVertical,
  Wrench
} from 'lucide-react';
import { CategoryField, NestedFieldStructure } from '@/types/product.types';

type AdvancedFieldListProps = {
  nestedStructure: NestedFieldStructure;
  onEdit: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
  onReorder: (newOrder: CategoryField[]) => void;
};

export default function AdvancedFieldList({ 
  nestedStructure, 
  onEdit, 
  onDelete, 
  onReorder 
}: AdvancedFieldListProps) {
  const [draggedField, setDraggedField] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    setDraggedField(fieldId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedField) return;

    const newOrder = [...nestedStructure.topLevel];
    const draggedIndex = newOrder.findIndex(f => f.field_id === draggedField);
    
    if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
      const [draggedItem] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedItem);
      onReorder(newOrder);
    }
    
    setDraggedField(null);
  };

  const getFieldTypeIcon = (fieldType: string) => {
    const icons: { [key: string]: any } = {
      text: Type,
      number: Hash,
      textarea: FileText,
      select: ChevronDown,
      checkbox: CheckSquare,
      date: Calendar,
      image: ImageIcon,
      group: Folder,
      repeater: RotateCcw,
    };
    return icons[fieldType] || Type;
  };

  const getFieldTypeColor = (fieldType: string) => {
    const colors: { [key: string]: string } = {
      text: 'bg-blue-100 text-blue-800',
      number: 'bg-green-100 text-green-800',
      textarea: 'bg-purple-100 text-purple-800',
      select: 'bg-yellow-100 text-yellow-800',
      checkbox: 'bg-pink-100 text-pink-800',
      date: 'bg-indigo-100 text-indigo-800',
      image: 'bg-orange-100 text-orange-800',
      group: 'bg-gray-100 text-gray-800 border-2 border-gray-300',
      repeater: 'bg-teal-100 text-teal-800 border-2 border-teal-300',
    };
    return colors[fieldType] || 'bg-gray-100 text-gray-800';
  };

  const renderField = (field: CategoryField, level: number = 0, index: number) => {
    const isContainer = field.field_type === 'group' || field.field_type === 'repeater';
    const children = nestedStructure.grouped[field.field_id] || [];
    
    // Use fixed margin classes instead of dynamic ones
    const getIndentClass = (level: number) => {
      switch (level) {
        case 1: return 'ml-8';
        case 2: return 'ml-16';
        case 3: return 'ml-24';
        default: return '';
      }
    };

    return (
      <div key={field.field_id} className={getIndentClass(level)}>
        {/* Field Row */}
        <div
          draggable={level === 0}
          onDragStart={(e) => level === 0 && handleDragStart(e, field.field_id)}
          onDragOver={handleDragOver}
          onDrop={(e) => level === 0 && handleDrop(e, index)}
          className={`
            group border rounded-lg p-4 mb-3 transition-all duration-200 cursor-move
            ${isContainer ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'}
            ${draggedField === field.field_id ? 'opacity-50' : ''}
            hover:border-gray-400 hover:shadow-sm
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Drag Handle */}
              {level === 0 && (
                <GripVertical size={16} className="text-gray-400 group-hover:text-gray-600 cursor-move" />
              )}
              
              {/* Field Info */}
              <div className="flex items-center space-x-2">
                {(() => {
                  const IconComponent = getFieldTypeIcon(field.field_type);
                  return <IconComponent size={16} className="text-gray-600" />;
                })()}
                <div>
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <span>{field.name}</span>
                    {field.is_required && (
                      <span className="text-red-500 text-sm">*</span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-500 font-mono">{field.key}</p>
                </div>
              </div>
              
              {/* Field Type Badge */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFieldTypeColor(field.field_type)}`}>
                {field.field_type}
                {field.field_type === 'select' && field.is_multi && ' (Multi)'}
              </span>
              
              {/* Children Count */}
              {isContainer && children.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                  {children.length} child{children.length !== 1 ? 'ren' : ''}
                </span>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(field.field_id)}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(field.field_id)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
          
          {/* Help Text */}
          {field.help_text && (
            <p className="mt-2 text-sm text-gray-600 italic">{field.help_text}</p>
          )}
        </div>
        
        {/* Child Fields */}
        {isContainer && children.length > 0 && (
          <div className="ml-8 space-y-2 border-l-2 border-gray-200 pl-4">
            {children
              .sort((a: CategoryField, b: CategoryField) => a.display_order - b.display_order)
              .map((child: CategoryField, childIndex: number) => renderField(child, level + 1, childIndex))}
          </div>
        )}
      </div>
    );
  };

  if (nestedStructure.topLevel.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Wrench size={32} className="text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No fields created yet</p>
        <p className="text-sm text-gray-500 mt-1">Click "Add New Field" to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4 flex items-center space-x-2">
        <GripVertical size={16} />
        <span>Drag and drop top-level fields to reorder them</span>
      </div>
      
      {nestedStructure.topLevel
        .sort((a: CategoryField, b: CategoryField) => a.display_order - b.display_order)
        .map((field: CategoryField, index: number) => renderField(field, 0, index))}
    </div>
  );
}