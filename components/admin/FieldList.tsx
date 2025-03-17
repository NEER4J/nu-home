'use client';

import { CategoryField } from '@/types/product.types';

type FieldListProps = {
  fields: CategoryField[];
  onEdit: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
};

export default function FieldList({ fields, onEdit, onDelete }: FieldListProps) {
  if (fields.length === 0) {
    return (
      <div className="bg-gray-50 p-4 mb-6 rounded-md">
        <p className="text-gray-600 text-sm">No custom fields defined for this category. Add fields below.</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Current Custom Fields</h4>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Key</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {fields.map((field) => (
            <tr key={field.field_id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{field.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.key}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {field.field_type}
                {field.field_type === 'select' && field.is_multi && ' (Multi)'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.is_required ? 'Yes' : 'No'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-3">
                  <button
                    onClick={() => onEdit(field.field_id)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(field.field_id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}