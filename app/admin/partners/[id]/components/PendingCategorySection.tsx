'use client';

import { useState } from 'react';
import { Package, Clock } from 'lucide-react';
import { updateCategoryAccess } from '../../../actions';

// Category status style
const categoryStyle = {
  icon: <Clock className="h-5 w-5 text-yellow-500" />,
  badge: <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>,
  bgColor: "bg-yellow-50",
  borderColor: "border-yellow-200",
  textColor: "text-yellow-800"
};

interface PendingCategorySectionProps {
  categories: any[];
  partnerId: string;
}

export default function PendingCategorySection({ categories, partnerId }: PendingCategorySectionProps) {
  return (
    <div className="mb-8">
      <h3 className="text-md font-medium text-gray-700 mb-3">Pending Services</h3>
      <div className="space-y-4">
        {categories.map(category => (
          <CategoryItem 
            key={category.access_id} 
            category={category} 
            partnerId={partnerId} 
          />
        ))}
      </div>
    </div>
  );
}

function CategoryItem({ category, partnerId }: { category: any; partnerId: string }) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  
  return (
    <div 
      className={`p-4 rounded-lg border ${categoryStyle.borderColor} ${categoryStyle.bgColor}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-white rounded-md flex items-center justify-center">
            {category.ServiceCategories?.icon_url ? (
              <img 
                src={category.ServiceCategories.icon_url}
                alt={category.ServiceCategories?.name}
                className="h-6 w-6" 
              />
            ) : (
              <Package className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <div className="ml-4">
            <h4 className="text-base font-medium text-gray-900">{category.ServiceCategories?.name}</h4>
            <div className="flex items-center mt-1">
              {categoryStyle.badge}
              <span className="ml-2 text-xs text-gray-500">
                Requested: {new Date(category.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Approval/Rejection Form */}
      <div className="mt-4 pt-4 border-t border-yellow-200">
        <form action={updateCategoryAccess} className="space-y-4">
          <input type="hidden" name="access_id" value={category.access_id} />
          <input type="hidden" name="partner_id" value={partnerId} />
          <input type="hidden" name="category_id" value={category.service_category_id} />
          
          <div className="flex space-x-4">
            <button
              type="submit"
              name="status"
              value="approved"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Activate
            </button>
            
            <button
              type="button"
              onClick={() => setShowRejectForm(!showRejectForm)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              Disable
            </button>
          </div>
          
          {showRejectForm && (
            <div className="mt-3">
              <label htmlFor={`notes-${category.access_id}`} className="block text-sm font-medium text-gray-700 mb-1">
                Disable Reason:
              </label>
              <textarea
                id={`notes-${category.access_id}`}
                name="notes"
                rows={2}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Provide a reason for disabling"
              ></textarea>
              <button
                type="submit"
                name="status"
                value="rejected"
                className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Confirm Disable
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 