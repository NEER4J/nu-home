'use client';

import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SubField {
  key: string;
  label: string;
  type: string;
  options?: string[];
  subfields?: SubField[];
}

interface WordPressField {
  path: string;
  label: string;
  type: string;
  options?: string[];
  subfields?: SubField[];
  isRepeaterItem?: boolean;
  repeaterIndex?: number;
  repeaterField?: string;
  uniqueKey?: string;
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

// Helper function to get the maximum number of items in a repeater field and extract subfields from sample data
function getMaxRepeaterItems(fields: WordPressField[], sampleData: any): Record<string, number> {
  return fields.reduce((acc: Record<string, number>, field) => {
    if (field.type === 'repeater') {
      // Get the actual data from the sample response
      const pathParts = field.path.split('.');
      let data = sampleData;
      
      // Navigate through the path to get the data
      for (const part of pathParts) {
        if (data && typeof data === 'object') {
          data = data[part];
        } else {
          data = null;
          break;
        }
      }

      // For boiler_description field
      if (field.path === 'acf.boiler_description') {
        field.subfields = [{
          key: 'description_item',
          label: 'Description Item',
          type: 'string'
        }];
        acc[field.path] = Array.isArray(data) ? data.length : 0;
      }
      // For boiler_power_price field
      else if (field.path === 'acf.boiler_power_price') {
        field.subfields = [
          { key: 'price', label: 'Price', type: 'number' },
          { key: 'power', label: 'Power', type: 'string' },
          { key: 'flow_rate', label: 'Flow Rate', type: 'string' }
        ];
        acc[field.path] = Array.isArray(data) ? data.length : 0;
      }
      // For boiler_details field
      else if (field.path === 'acf.boiler_details') {
        field.subfields = [
          { key: 'icon', label: 'Icon', type: 'number' },
          { key: 'text', label: 'Text', type: 'string' }
        ];
        acc[field.path] = Array.isArray(data) ? data.length : 0;
      }
      
      console.log(`Repeater field ${field.path}:`, {
        data,
        subfields: field.subfields,
        count: acc[field.path]
      });
    }
    return acc;
  }, {});
}

// Helper function to flatten nested fields
function flattenFields(fields: WordPressField[], sampleData: any): WordPressField[] {
  const maxRepeaterItems = getMaxRepeaterItems(fields, sampleData);
  console.log('Max repeater items:', maxRepeaterItems);
  
  return fields.reduce((acc: WordPressField[], field) => {
    // Add the main field for non-repeater types
    if (field.type !== 'repeater') {
      acc.push(field);
    }

    // Handle repeater fields
    if (field.type === 'repeater' && field.subfields && field.subfields.length > 0) {
      const maxItems = maxRepeaterItems[field.path] || 0;
      console.log(`Processing repeater field ${field.path} with ${maxItems} items`);
      
      // Create fields for each repeater item
      for (let i = 0; i < maxItems; i++) {
        field.subfields.forEach(subfield => {
          const newField = {
            path: `${field.path}[${i}].${subfield.key}`,
            label: `${field.label} #${i + 1} - ${subfield.label}`,
            type: subfield.type,
            options: subfield.options,
            isRepeaterItem: true,
            repeaterIndex: i,
            repeaterField: field.path
          };
          console.log(`Created repeater item field:`, newField);
          acc.push(newField);
        });
      }
    }
    // Handle object fields
    else if (field.type === 'object' && field.subfields) {
      field.subfields.forEach(subfield => {
        acc.push({
          path: `${field.path}.${subfield.key}`,
          label: `${field.label} - ${subfield.label}`,
          type: subfield.type,
          options: subfield.options
        });
      });
    }

    return acc;
  }, []);
}

export function FieldMapper({ wordpressFields, databaseFields, mapping, onMappingChange }: FieldMapperProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [sampleData, setSampleData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch sample data when component mounts
  useEffect(() => {
    const fetchSampleData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('https://boiler-sure.co.uk/wp-json/wp/v2/boiler?per_page=1');
        const data = await response.json();
        if (data && data.length > 0) {
          console.log('Fetched sample data:', data[0]);
          setSampleData(data[0]);
        }
      } catch (error) {
        console.error('Error fetching sample data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSampleData();
  }, []);

  // Only proceed with field flattening once we have sample data
  const flattenedFields = useMemo(() => {
    if (!sampleData) return [];
    console.log('WordPress fields:', wordpressFields);
    const fields = flattenFields(wordpressFields, sampleData);
    console.log('Flattened fields:', fields);
    return fields;
  }, [wordpressFields, sampleData]);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const wpField = flattenedFields[result.source.index];
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

  const toggleGroup = (groupPath: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupPath]: !prev[groupPath]
    }));
  };

  const renderFieldTypeInfo = (field: WordPressField) => {
    if (field.type === 'repeater') {
      return (
        <div className="mt-1 text-xs text-gray-500">
          <div>Type: Repeater</div>
          <div className="ml-2">
            Contains {field.subfields?.length || 0} subfields
          </div>
        </div>
      );
    }

    if (field.isRepeaterItem) {
      return (
        <div className="mt-1 text-xs text-gray-500">
          <div>Type: {field.type}</div>
          <div className="ml-2">
            Repeater Item {field.repeaterIndex! + 1}
          </div>
        </div>
      );
    }

    if (field.type === 'object') {
      return (
        <div className="mt-1 text-xs text-gray-500">
          <div>Type: Object</div>
          <div className="ml-2">
            Contains {field.subfields?.length || 0} properties
          </div>
        </div>
      );
    }

    if (field.type === 'select' || field.type === 'checkbox') {
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
    }

    return (
      <div className="text-sm text-gray-500">
        Type: {field.type} | Path: {field.path}
      </div>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WordPress Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium mb-2">WordPress Fields</h3>
          <div className="bg-blue-50 p-3 rounded-md mb-4">
            <p className="text-sm text-blue-800">
              Drag fields from here to map them to your database fields. All fields are shown below.
            </p>
          </div>
          <Droppable droppableId="wordpress-fields" isDropDisabled={true}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {flattenedFields.map((field, index) => (
                  <Draggable
                    key={field.uniqueKey || field.path}
                    draggableId={field.uniqueKey || field.path}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-3 bg-white border border-gray-200 rounded-md cursor-move hover:bg-gray-50"
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
                            Mapped to: {flattenedFields.find(f => f.path === mapping[field.key])?.label}
                          </div>
                          {flattenedFields.find(f => f.path === mapping[field.key])?.type !== 'string' && (
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
                            Mapped to: {flattenedFields.find(f => f.path === mapping[field.key])?.label}
                          </div>
                          {flattenedFields.find(f => f.path === mapping[field.key])?.type !== 'string' && (
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