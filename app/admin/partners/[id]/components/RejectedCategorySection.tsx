'use client';

import { Package, XCircle } from 'lucide-react';
import { updateCategoryAccess } from '../../../actions';

// Category status style
const categoryStyle = {
  icon: <XCircle className="h-5 w-5 text-red-500" />,
  badge: <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Rejected</span>,
  bgColor: "bg-red-50",
  borderColor: "border-red-200",
  textColor: "text-red-800"
};

interface RejectedCategorySectionProps {
  categories: any[];
  partnerId: string;
}

export default function RejectedCategorySection({ categories, partnerId }: RejectedCategorySectionProps) {
  return (
    <div className="mb-8">
      <h3 className="text-md font-medium text-gray-700 mb-3">Rejected Categories</h3>
      <div className="space-y-3">
        {categories.map(category => (
          <div 
            key={category.access_id} 
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
                      Rejected: {category.rejected_at ? new Date(category.rejected_at).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                  {category.admin_notes && (
                    <div className="text-sm mt-1 text-red-700">
                      <span className="font-medium">Reason:</span> {category.admin_notes}
                    </div>
                  )}
                </div>
              </div>
              
              <form action={updateCategoryAccess}>
                <input type="hidden" name="access_id" value={category.access_id} />
                <input type="hidden" name="partner_id" value={partnerId} />
                <input type="hidden" name="category_id" value={category.service_category_id} />
                <input type="hidden" name="status" value="approved" />
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Approve Now
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 