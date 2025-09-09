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
      <div className="flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded-lg p-8">
        <p className="text-gray-500 text-sm">No custom fields defined for this category. Add fields below.</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">Current Custom Fields</h4>
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Name</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Key</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fields.map((field) => (
              <tr key={field.field_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{field.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">{field.key}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {field.field_type}
                    {field.field_type === 'select' && field.is_multi && ' (Multi)'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {field.is_required ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Required
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Optional
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-right">
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => onEdit(field.field_id)}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(field.field_id)}
                      className="text-sm text-gray-600 hover:text-red-600 transition-colors"
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
    </div>
  );
}