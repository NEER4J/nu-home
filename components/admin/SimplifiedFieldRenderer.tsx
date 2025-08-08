'use client';

import { useState } from 'react';
import { 
  Type, 
  Hash, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  CheckSquare, 
  Calendar, 
  Image as ImageIcon, 
  Folder, 
  RotateCcw,
  Edit,
  Trash2
} from 'lucide-react';
import { CategoryField, FieldChild } from '@/types/product.types';

type SimplifiedFieldRendererProps = {
  field: CategoryField;
  onEdit: (field: CategoryField) => void;
  onDelete: (fieldId: string) => void;
};

export default function SimplifiedFieldRenderer({ 
  field, 
  onEdit, 
  onDelete 
}: SimplifiedFieldRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  const renderChildField = (child: FieldChild, level: number = 1) => {
    const IconComponent = getFieldTypeIcon(child.field_type);
    const marginClass = level === 1 ? 'ml-4' : 'ml-8';
    
    return (
      <div key={child.key} className={`${marginClass} mb-1`}>
        <div className="bg-white border border-gray-200 rounded p-2">
          <div className="flex items-center space-x-2">
            <IconComponent size={12} className="text-gray-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 text-xs truncate">{child.name}</span>
                {child.is_required && (
                  <span className="text-red-500 text-xs">*</span>
                )}
                <span className="text-xs text-gray-500 font-mono">({child.key})</span>
              </div>
            </div>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getFieldTypeColor(child.field_type)}`}>
              {child.field_type}
            </span>
          </div>
          
          {/* Render nested children */}
          {child.children && child.children.length > 0 && (
            <div className="mt-2 space-y-1">
              {child.children.map((nestedChild) => renderChildField(nestedChild, level + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const isContainer = field.field_type === 'group' || field.field_type === 'repeater';
  const children = field.field_structure?.children || [];
  const IconComponent = getFieldTypeIcon(field.field_type);

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Main Field - Compact */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Expand/Collapse Button for containers with children */}
            {children.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-gray-600" />
                ) : (
                  <ChevronRight size={14} className="text-gray-600" />
                )}
              </button>
            )}
            
            <IconComponent size={14} className="text-gray-600 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-900 text-sm truncate">{field.name}</h4>
                {field.is_required && (
                  <span className="text-red-500 text-sm">*</span>
                )}
                <span className="text-sm text-gray-500 font-mono">({field.key})</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getFieldTypeColor(field.field_type)}`}>
                {field.field_type}
                {field.field_type === 'select' && field.is_multi && ' (Multi)'}
              </span>
              
              {children.length > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {children.length} child{children.length !== 1 ? 'ren' : ''}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-3 flex-shrink-0">
            <button
              onClick={() => onEdit(field)}
              className="inline-flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            >
              <Edit size={12} />
              <span>Edit</span>
            </button>
            <button
              onClick={() => onDelete(field.field_id)}
              className="inline-flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 size={12} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Collapsible Child Fields */}
      {children.length > 0 && isExpanded && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="space-y-1">
            {children.map((child) => renderChildField(child))}
          </div>
        </div>
      )}
      
      {/* JSON Preview - Only show when expanded and has structure */}
      {field.field_structure && isExpanded && (
        <div className="border-t border-gray-200 p-3 bg-gray-100">
          <details className="cursor-pointer">
            <summary className="text-xs font-medium text-gray-700 hover:text-gray-900">
              View JSON Structure
            </summary>
            <pre className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border overflow-x-auto">
              {JSON.stringify(field.field_structure, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}