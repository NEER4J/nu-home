'use client';

import { updateCategoryAccess } from '../../../actions';

interface AddCategorySectionProps {
  categories: any[];
  partnerId: string;
}

export default function AddCategorySection({ categories, partnerId }: AddCategorySectionProps) {
  return (
    <div>
      <h3 className="text-md font-medium text-gray-700 mb-3">Add New Services Access</h3>
      <form action={updateCategoryAccess} className="space-y-4">
        <input type="hidden" name="partner_id" value={partnerId} />
        <input type="hidden" name="status" value="approved" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
              Select Category:
            </label>
            <select
              name="category_id"
              id="category_id"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="">Select a service...</option>
              {categories.map(category => (
                <option key={category.service_category_id} value={category.service_category_id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Grant Access
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 