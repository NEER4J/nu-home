'use client';

import { useState } from 'react';
import { CategoryField } from '@/types/product.types';
import DynamicFieldRenderer from './DynamicFieldRenderer';

type FieldsLayout = 'default' | 'tabbed' | 'grid' | 'gallery';

type ProductFieldsSectionProps = {
  fields: CategoryField[];
  values: Record<string, any>;
  layoutType?: FieldsLayout;
};

export default function ProductFieldsSection({ 
  fields, 
  values, 
  layoutType = 'default' 
}: ProductFieldsSectionProps) {
  const [activeTab, setActiveTab] = useState<string>(fields[0]?.field_id || '');
  
  if (fields.length === 0) return null;
  
  // Group fields by type (useful for gallery layout)
  const imageFields = fields.filter(field => 
    field.field_type === 'image' && values[field.key]
  );
  
  const textFields = fields.filter(field => 
    field.field_type !== 'image' && values[field.key]
  );
  
  // Render different layouts based on type
  switch (layoutType) {
    case 'tabbed':
      return (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Product Details</h2>
          
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="flex -mb-px space-x-4 overflow-x-auto">
              {fields.map(field => (
                <button
                  key={field.field_id}
                  onClick={() => setActiveTab(field.field_id)}
                  className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
                    activeTab === field.field_id
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {field.name}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Content */}
          <div>
            {fields.map(field => (
              <div
                key={field.field_id}
                className={activeTab === field.field_id ? 'block' : 'hidden'}
              >
                <DynamicFieldRenderer field={field} value={values[field.key]} />
              </div>
            ))}
          </div>
        </div>
      );
    
    case 'grid':
      return (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Product Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map(field => (
              <div key={field.field_id} className="border p-4 rounded-lg bg-gray-50">
                <DynamicFieldRenderer field={field} value={values[field.key]} />
              </div>
            ))}
          </div>
        </div>
      );
    
    case 'gallery':
      return (
        <div className="mb-8">
          {/* Image Fields in Gallery */}
          {imageFields.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Gallery</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {imageFields.map(field => (
                  <div key={field.field_id} className="border rounded-lg overflow-hidden">
                    <DynamicFieldRenderer field={field} value={values[field.key]} />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Text Fields in Regular Format */}
          {textFields.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Product Details</h2>
              <div className="space-y-4">
                {textFields.map(field => (
                  <div key={field.field_id}>
                    <DynamicFieldRenderer field={field} value={values[field.key]} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    
    default:
      // Simple list layout
      return (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Product Details</h2>
          <div className="space-y-4">
            {fields.map(field => (
              <div key={field.field_id}>
                <DynamicFieldRenderer field={field} value={values[field.key]} />
              </div>
            ))}
          </div>
        </div>
      );
  }
}