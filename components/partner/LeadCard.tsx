import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Phone, Mail, MapPin, Calendar, Package } from 'lucide-react';

interface LeadCardProps {
  lead: {
    submission_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    city?: string;
    postcode: string;
    submission_date: string;
    status: string;
    progress_step: string;
    payment_status: string;
    payment_method?: string;
    service_category_id: string;
    ServiceCategories?: {
      name: string;
      slug: string;
    };
    product_info?: any;
    addon_info?: any[];
    bundle_info?: any[];
    address_line_1?: string;
    formatted_address?: string;
    lead_submission_data?: {
      quote_data?: any;
      products_data?: any;
      addons_data?: any;
      survey_data?: any;
      checkout_data?: any;
      enquiry_data?: any;
      success_data?: any;
      last_activity_at?: string;
      current_page?: string;
      pages_completed?: string[];
    };
  };
}

export default function LeadCard({ lead }: LeadCardProps) {
  return (
    <Card className="">
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {lead.first_name} {lead.last_name}
            </CardTitle>
            <p className="text-sm text-gray-500">
              ID: {lead.submission_id.substring(0, 8)}...
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-4">
        {/* Grid Layout for Lead Information */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Email */}
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <a href={`mailto:${lead.email}`} className="text-blue-600 hover:text-blue-800 truncate">
              {lead.email}
            </a>
          </div>

          {/* Phone */}
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <a href={`tel:${lead.phone}`} className="text-blue-600 hover:text-blue-800 truncate">
                {lead.phone}
              </a>
            </div>
          )}

          {/* Postcode */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{lead.postcode}</span>
          </div>

          {/* Service Category */}
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium truncate">{lead.ServiceCategories?.name || 'Unknown Service'}</span>
          </div>
        </div>

        {/* Submission Date - Full Width */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <Calendar className="h-4 w-4" />
          <span>
            Submitted: {new Date(lead.submission_date).toLocaleDateString()} at {new Date(lead.submission_date).toLocaleTimeString()}
          </span>
        </div>

        {/* Action Button */}
        <Button asChild className="bg-gray-200 hover:bg-gray-300 text-gray-900 py-1.5 text-sm px-4 rounded-full">
          <Link href={`/partner/leads/${lead.submission_id}`} className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View Details
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
