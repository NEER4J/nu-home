'use client';

import Image from 'next/image';
import { CategoryField } from '@/types/product.types';

type DynamicFieldRendererProps = {
  field: CategoryField;
  value: any;
};

export default function DynamicFieldRenderer({ field, value }: DynamicFieldRendererProps) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  
  switch (field.field_type) {
    case 'text':
    case 'textarea':
    case 'number':
    case 'select':
      // Handle multi-select values
      if (Array.isArray(value) && field.field_type === 'select' && field.is_multi) {
        return (
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">{field.name}</h3>
            <ul className="mt-1 text-gray-600 list-disc pl-5">
              {value.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      // Handle plain text values
      return (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">{field.name}</h3>
          <p className="mt-1 text-gray-600">{value}</p>
        </div>
      );
    
    case 'image':
      // Helper function to validate URL
      const isValidUrl = (urlString: string) => {
        try {
          const url = new URL(urlString);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      };

      if (!isValidUrl(value)) {
        return (
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">{field.name}</h3>
            <p className="mt-1 text-gray-600 text-red-500">Invalid image URL</p>
          </div>
        );
      }

      return (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">{field.name}</h3>
          <div className="mt-2 relative h-60 w-full md:w-96 rounded-lg overflow-hidden">
            <Image
              src={value}
              alt={field.name}
              fill
              className="object-contain"
              onError={() => {
                // Handle broken images gracefully
                console.log('Image failed to load:', value);
              }}
            />
          </div>
        </div>
      );
    
    case 'checkbox':
      return (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">{field.name}</h3>
          <p className="mt-1 text-gray-600">{value ? 'Yes' : 'No'}</p>
        </div>
      );
    
    case 'date':
      return (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">{field.name}</h3>
          <p className="mt-1 text-gray-600">
            {new Date(value).toLocaleDateString()}
          </p>
        </div>
      );
    
    case 'repeater':
      if (!Array.isArray(value) || value.length === 0) {
        return null;
      }
      
      return (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">{field.name}</h3>
          <ul className="mt-2 space-y-1 list-disc pl-5">
            {value.map((item, index) => (
              <li key={index} className="text-gray-600">
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
    
    default:
      return (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">{field.name}</h3>
          <p className="mt-1 text-gray-600">{value.toString()}</p>
        </div>
      );
  }
}