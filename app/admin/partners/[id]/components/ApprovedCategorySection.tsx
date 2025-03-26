'use client';

import { Package, CheckCircle } from 'lucide-react';
import { updateCategoryAccess } from '../../../actions';

// Category status style
const categoryStyle = {
  icon: <CheckCircle className="h-5 w-5 text-green-500" />,
  badge: <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Approved</span>,
  bgColor: "bg-green-50", 
  borderColor: "border-green-200",
  textColor: "text-green-800"
};

interface ApprovedCategorySectionProps {
  categories: any[];
  partnerId: string;
}

export default function ApprovedCategorySection({ categories, partnerId }: ApprovedCategorySectionProps) {
  return (
    <div className="mb-8">
      <h3 className="text-md font-medium text-gray-700 mb-3">Approved Categories</h3>
      <div className="space-y-3">
        {categories.map(category => (
          <div 
            key={category.access_id} 
            className={`p-4 rounded-lg border ${categoryStyle.borderColor} ${categoryStyle.bgColor}`}
          >
            <div className="flex items-center justify-between">
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
                    {category.is_primary && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Primary Category
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <form action={updateCategoryAccess}>
                <input type="hidden" name="access_id" value={category.access_id} />
                <input type="hidden" name="partner_id" value={partnerId} />
                <input type="hidden" name="category_id" value={category.service_category_id} />
                <input type="hidden" name="status" value="rejected" />
                <input type="hidden" name="notes" value="Access revoked by admin" />
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Revoke Access
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 