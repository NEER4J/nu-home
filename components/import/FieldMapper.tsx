'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface SubField {
  key: string;
  label: string;
  type: string;
}

interface WordPressField {
  path: string;
  label: string;
  type: string;
  options?: string[];
  subfields?: SubField[];
}

interface DatabaseField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface FieldMapping {
  [key: string]: string;
}

interface FieldMapperProps {
  wordpressFields: WordPressField[];
  databaseFields: DatabaseField[];
  mapping: FieldMapping;
  onMappingChange: (mapping: FieldMapping) => void;
}

// Define global fields that are always present in PartnerProducts table
const globalFields: DatabaseField[] = [
  { key: 'name', label: 'Product Name', type: 'string', required: true },
  { key: 'slug', label: 'URL Slug', type: 'string', required: true },
  { key: 'description', label: 'Description', type: 'text', required: true },
  { key: 'price', label: 'Price', type: 'number', required: true },
  { key: 'image_url', label: 'Image URL', type: 'string', required: true },
  { key: 'specifications', label: 'Specifications', type: 'jsonb', required: true },
  { key: 'is_active', label: 'Active Status', type: 'boolean', required: true },
];

export function FieldMapper({ wordpressFields, databaseFields, mapping, onMappingChange }: FieldMapperProps) {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const wpField = wordpressFields[result.source.index];
    const dbFieldKey = result.destination.droppableId;
    
    if (wpField) {
      const newMapping = { ...mapping, [dbFieldKey]: wpField.path };
      onMappingChange(newMapping);
    }
  };

  const removeMapping = (dbFieldKey: string) => {
    const newMapping = { ...mapping };
    delete newMapping[dbFieldKey];
    onMappingChange(newMapping);
  };

  const renderFieldTypeInfo = (field: WordPressField) => {
    switch (field.type) {
      case 'repeater':
        return (
          <div className="mt-1 text-xs text-gray-500">
            <div>Type: Repeater</div>
            <div className="ml-2">
              Subfields:
              <ul className="list-disc list-inside">
                {field.subfields?.map(subfield => (
                  <li key={subfield.key}>{subfield.label} ({subfield.type})</li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'object':
        return (
          <div className="mt-1 text-xs text-gray-500">
            <div>Type: Object</div>
            <div className="ml-2">
              Properties:
              <ul className="list-disc list-inside">
                {field.subfields?.map(subfield => (
                  <li key={subfield.key}>{subfield.label} ({subfield.type})</li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'select':
      case 'checkbox':
        return (
          <div className="mt-1 text-xs text-gray-500">
            <div>Type: {field.type}</div>
            {field.options && (
              <div className="ml-2">
                Options: {field.options.join(', ')}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            Type: {field.type} | Path: {field.path}
          </div>
        );
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WordPress Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium mb-2">WordPress Fields</h3>
          <div className="bg-blue-50 p-3 rounded-md mb-4">
            <p className="text-sm text-blue-800">
              Drag fields from here to map them to your database fields. Special fields like repeaters and objects will be automatically transformed.
            </p>
          </div>
          <Droppable droppableId="wordpress-fields" isDropDisabled={true}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {wordpressFields.map((field, index) => (
                  <Draggable
                    key={field.path}
                    draggableId={field.path}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-3 bg-gray-50 rounded-md cursor-move hover:bg-gray-100"
                      >
                        <div className="font-medium">{field.label}</div>
                        {renderFieldTypeInfo(field)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Database Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium mb-2">Database Fields</h3>
          <div className="space-y-6">
            {/* Global Fields */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-600">Global Fields</h4>
              <div className="bg-yellow-50 p-3 rounded-md mb-4">
                <p className="text-sm text-yellow-800">
                  These fields are required for all products and must be mapped.
                </p>
              </div>
              {globalFields.map((field) => (
                <Droppable key={field.key} droppableId={field.key}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 rounded-md ${
                        mapping[field.key] 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">
                            {field.label}
                            <span className="text-red-500 ml-1">*</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Type: {field.type} | Key: {field.key}
                          </div>
                        </div>
                        {mapping[field.key] && (
                          <button
                            onClick={() => removeMapping(field.key)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {mapping[field.key] && (
                        <div className="mt-2 p-2 bg-green-100 rounded">
                          <div>
                            Mapped to: {wordpressFields.find(f => f.path === mapping[field.key])?.label}
                          </div>
                          {wordpressFields.find(f => f.path === mapping[field.key])?.type !== 'string' && (
                            <div className="text-xs text-gray-600 mt-1">
                              Field will be automatically transformed to match the required format
                            </div>
                          )}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>

            {/* Category-specific Fields */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-600">Category Fields</h4>
              {databaseFields.map((field) => (
                <Droppable key={field.key} droppableId={field.key}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 rounded-md ${
                        mapping[field.key] 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </div>
                          <div className="text-sm text-gray-500">
                            Type: {field.type} | Key: {field.key}
                          </div>
                        </div>
                        {mapping[field.key] && (
                          <button
                            onClick={() => removeMapping(field.key)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {mapping[field.key] && (
                        <div className="mt-2 p-2 bg-blue-100 rounded">
                          <div>
                            Mapped to: {wordpressFields.find(f => f.path === mapping[field.key])?.label}
                          </div>
                          {wordpressFields.find(f => f.path === mapping[field.key])?.type !== 'string' && (
                            <div className="text-xs text-gray-600 mt-1">
                              Field will be automatically transformed to match the required format
                            </div>
                          )}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
} 