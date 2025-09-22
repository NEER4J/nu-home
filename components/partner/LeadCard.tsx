import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Phone, Mail, MapPin, Calendar, Package, CreditCard } from 'lucide-react';

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
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="px-6 pt-6 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {lead.first_name} {lead.last_name}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              ID: {lead.submission_id.substring(0, 8)}...
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Badge 
              variant={
                lead.status === 'new' ? 'default' :
                lead.status === 'contacted' ? 'secondary' :
                lead.status === 'qualified' ? 'outline' :
                lead.status === 'converted' ? 'destructive' :
                'secondary'
              }
              className="text-xs"
            >
              {lead.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {lead.progress_step}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 px-6 pb-6">
        {/* Contact Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <a href={`mailto:${lead.email}`} className="text-blue-600 hover:text-blue-800">
              {lead.email}
            </a>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <a href={`tel:${lead.phone}`} className="text-blue-600 hover:text-blue-800">
                {lead.phone}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>{lead.city ? `${lead.city}, ` : ''}{lead.postcode}</span>
          </div>
        </div>

        {/* Service Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{lead.ServiceCategories?.name || 'Unknown Service'}</span>
          </div>
          
          {/* Product/Quote Information */}
          {lead.product_info && Object.keys(lead.product_info).length > 0 && (
            <div className="text-xs text-gray-500">
              Products: {Object.keys(lead.product_info).length} selected
            </div>
          )}
          
          {lead.addon_info && lead.addon_info.length > 0 && (
            <div className="text-xs text-gray-500">
              Add-ons: {lead.addon_info.length} selected
            </div>
          )}
        </div>

        {/* Payment Information */}
        {lead.payment_status && lead.payment_status !== 'pending' && (
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {lead.payment_method} - {lead.payment_status}
            </span>
          </div>
        )}

        {/* Progress Information */}
        {lead.lead_submission_data && (
          <div className="space-y-1">
            <div className="text-xs text-gray-500">
              Last Activity: {lead.lead_submission_data.last_activity_at ? 
                new Date(lead.lead_submission_data.last_activity_at).toLocaleDateString() : 
                'Unknown'
              }
            </div>
            {lead.lead_submission_data.pages_completed && lead.lead_submission_data.pages_completed.length > 0 && (
              <div className="text-xs text-gray-500">
                Pages Completed: {lead.lead_submission_data.pages_completed.length}
              </div>
            )}
          </div>
        )}

        {/* Submission Date */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>
            Submitted: {new Date(lead.submission_date).toLocaleDateString()} at {new Date(lead.submission_date).toLocaleTimeString()}
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Link href={`/partner/leads/${lead.submission_id}`} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
