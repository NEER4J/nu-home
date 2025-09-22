import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import LeadStatusBadge from '@/components/partner/LeadStatusBadge';
import LeadProgressBadge from '@/components/partner/LeadProgressBadge';
import LeadActions from '@/components/partner/LeadActions';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  User, 
  Package, 
  CreditCard, 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Building,
  Home
} from 'lucide-react';

interface LeadDetailData {
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
  address_line_2?: string;
  street_name?: string;
  street_number?: string;
  building_name?: string;
  sub_building?: string;
  county?: string;
  country?: string;
  address_type?: string;
  formatted_address?: string;
  form_answers?: any[];
  notes?: string;
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
    device_info?: any;
    conversion_events?: any[];
    page_timings?: any;
  };
}

export const metadata = {
  title: 'Lead Details | Nu-Home Partner',
  description: 'View detailed lead information'
};

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({
  params
}: {
  params: { id: string }
}) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return <div>Please sign in to view lead details.</div>;
    }

    // Fetch lead data with all related information
    const { data: lead, error } = await supabase
      .from('partner_leads')
      .select(`
        *,
        ServiceCategories (
          name,
          slug
        ),
        lead_submission_data (
          quote_data,
          products_data,
          addons_data,
          survey_data,
          checkout_data,
          enquiry_data,
          success_data,
          last_activity_at,
          current_page,
          pages_completed,
          device_info,
          conversion_events,
          page_timings
        )
      `)
      .eq('submission_id', params.id)
      .eq('assigned_partner_id', user.id) // Ensure this lead belongs to the current partner
      .single();

    if (error || !lead) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead Not Found</h2>
          <p className="text-gray-600 mb-4">This lead doesn't exist or you don't have permission to view it.</p>
          <Button asChild>
            <Link href="/partner/leads">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Link>
          </Button>
        </div>
      );
    }

    // Process product data from product_info JSONB column
    let productData = null;
    if (lead.product_info && Object.keys(lead.product_info).length > 0) {
      // Convert the product_info object to an array format for display
      productData = [lead.product_info];
    }

    // Process addon data from addon_info JSONB column
    let addonData = null;
    if (lead.addon_info && lead.addon_info.length > 0) {
      addonData = lead.addon_info;
    }

    // Process bundle data from bundle_info JSONB column
    let bundleData = null;
    if (lead.bundle_info && lead.bundle_info.length > 0) {
      bundleData = lead.bundle_info;
    }

    // Fetch form questions to display proper question text
    let formQuestions = null;
    if (lead.form_answers && lead.form_answers.length > 0) {
      const { data: questions } = await supabase
        .from('FormQuestions')
        .select('question_id, question_text')
        .eq('service_category_id', lead.service_category_id)
        .eq('status', 'active');
      formQuestions = questions;
    }

    const leadData: LeadDetailData = lead;

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className='border-b bg-white'>
          <div className="flex justify-between items-center px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/partner/leads">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Leads
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {leadData.first_name} {leadData.last_name}
                </h1>
                <p className="text-sm text-gray-500">
                  Lead ID: {leadData.submission_id}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <LeadStatusBadge status={leadData.status} size="lg" />
              <LeadProgressBadge progressStep={leadData.progress_step} size="lg" />
            </div>
          </div>
        </div>

        <div className='flex-grow overflow-auto bg-gray-50 p-4'>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Contact Information */}
                <Card>
                  <CardHeader className="px-4 py-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-4 w-4 text-blue-600" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${leadData.email}`} className="text-blue-600 hover:text-blue-800">
                            {leadData.email}
                          </a>
                        </div>
                        {leadData.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <a href={`tel:${leadData.phone}`} className="text-blue-600 hover:text-blue-800">
                              {leadData.phone}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {leadData.city ? `${leadData.city}, ` : ''}{leadData.postcode}
                          </span>
                        </div>
                        {leadData.formatted_address && (
                          <div className="text-sm text-gray-600">
                            {leadData.formatted_address}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Service & Products */}
                <Card>
                  <CardHeader className="px-4 py-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-4 w-4 text-blue-600" />
                      Service & Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Service Category</h4>
                      <p className="text-gray-600">{leadData.ServiceCategories?.name || 'Unknown Service'}</p>
                    </div>
                    
                    {/* Display product from lead_submission_data if available, otherwise fallback to product_info */}
                    {(leadData.lead_submission_data?.products_data?.selected_product || (productData && productData.length > 0)) && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-4">Selected Product</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {leadData.lead_submission_data?.products_data?.selected_product ? (
                            // Display from lead_submission_data (more detailed)
                            <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                              <div className="flex items-start gap-3">
                                {leadData.lead_submission_data.products_data.selected_product.image_url && (
                                  <img 
                                    src={leadData.lead_submission_data.products_data.selected_product.image_url} 
                                    alt={leadData.lead_submission_data.products_data.selected_product.name}
                                    className="w-20 h-20 object-contain rounded-md flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-gray-900 text-base mb-2">{leadData.lead_submission_data.products_data.selected_product.name}</h5>
                                  <p className="text-sm text-gray-600 mb-3">{leadData.lead_submission_data.products_data.selected_product.description}</p>
                                  
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-600">Power:</span>
                                        <span className="ml-2 font-medium">{leadData.lead_submission_data.products_data.selected_product.power}kW</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Price:</span>
                                        <span className="ml-2 font-medium text-blue-600">£{leadData.lead_submission_data.products_data.selected_product.price}</span>
                                      </div>
                                    <div>
                                      <span className="text-gray-600">Monthly Payment:</span>
                                      {leadData.lead_submission_data.products_data.selected_product.monthly_price ? (
                                        <span className="ml-2 font-medium text-blue-600">£{leadData.lead_submission_data.products_data.selected_product.monthly_price.toFixed(2)}</span>
                                      ) : (
                                        <span className="ml-2 text-gray-500 italic">No payment info</span>
                                      )}
                                    </div>
                                      <div>
                                        <span className="text-gray-600">Warranty:</span>
                                        <span className="ml-2 font-medium">{leadData.lead_submission_data.products_data.selected_product.warranty}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-blue-50 p-3 rounded-md">
                                      <h6 className="text-sm font-medium text-blue-900 mb-2">Finance Details</h6>
                                      {leadData.lead_submission_data.products_data.selected_product.calculator_settings ? (
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                          <div>
                                            <span className="text-gray-600">APR:</span>
                                            <span className="ml-2 font-medium">{leadData.lead_submission_data.products_data.selected_product.calculator_settings.selected_plan.apr}%</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Months:</span>
                                            <span className="ml-2 font-medium">{leadData.lead_submission_data.products_data.selected_product.calculator_settings.selected_plan.months}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Deposit:</span>
                                            <span className="ml-2 font-medium">£{leadData.lead_submission_data.products_data.selected_product.calculator_settings.selected_deposit}</span>
                                          </div>
                                          {leadData.lead_submission_data.products_data.selected_product.monthly_price && (
                                            <div>
                                              <span className="text-gray-600">Monthly Payment:</span>
                                              <span className="ml-2 font-medium text-blue-600">£{leadData.lead_submission_data.products_data.selected_product.monthly_price.toFixed(2)}</span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-500 italic">No finance information available</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Fallback to product_info from partner_leads
                            productData?.map((product: any, index: number) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                <div className="flex items-start gap-3">
                                  {product.image_url && (
                                    <img 
                                      src={product.image_url} 
                                      alt={product.name}
                                      className="w-20 h-20 object-contain rounded-md flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-gray-900 text-base mb-2">{product.name}</h5>
                                    <div className="space-y-2">
                                      {product.selected_power && (
                                        <div className="bg-blue-50 p-3 rounded-md">
                                          <h6 className="text-sm font-medium text-blue-900 mb-1">Selected Power</h6>
                                          <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                              <span className="text-gray-600">Power:</span>
                                              <span className="ml-2 font-medium">{product.selected_power.power}kW</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-600">Price:</span>
                                              <span className="ml-2 font-medium text-green-600">£{product.selected_power.price}</span>
                                            </div>
                                            {product.selected_power.additional_cost > 0 && (
                                              <div className="col-span-2">
                                                <span className="text-gray-600">Additional Cost:</span>
                                                <span className="ml-2 font-medium">£{product.selected_power.additional_cost}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Display addons from lead_submission_data if available, otherwise fallback to addon_info */}
                    {(leadData.lead_submission_data?.addons_data?.selected_addons?.length > 0 || (addonData && addonData.length > 0)) && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Selected Add-ons</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {leadData.lead_submission_data?.addons_data?.selected_addons ? (
                            leadData.lead_submission_data.addons_data.selected_addons.map((addon: any, index: number) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                                <div className="flex items-start gap-3">
                                  {addon.addon_image && (
                                    <img 
                                      src={addon.addon_image} 
                                      alt={addon.name}
                                      className="w-12 h-12 object-contain rounded-md flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-gray-900 text-sm mb-1">{addon.name}</h5>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <div><span className="font-medium">Price:</span> £{addon.price || 0}</div>
                                      <div><span className="font-medium">Qty:</span> {addon.quantity || 1}</div>
                                      {addon.total_price && (
                                        <div><span className="font-medium">Total:</span> £{addon.total_price}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            addonData.map((addon: any, index: number) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                <div className="flex items-start gap-3">
                                  {addon.image_url && (
                                    <img 
                                      src={addon.image_url} 
                                      alt={addon.name || `Add-on ${index + 1}`}
                                      className="w-16 h-16 object-contain rounded-md flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-gray-900 text-sm mb-1">{addon.name || `Add-on ${index + 1}`}</h5>
                                    <div className="text-sm text-gray-600 mb-2">
                                      <span className="font-medium">Price:</span> £{addon.price || 0}
                                    </div>
                                    {addon.quantity && (
                                      <div className="text-sm text-gray-600">
                                        <span className="font-medium">Quantity:</span> {addon.quantity}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Display bundles from lead_submission_data if available, otherwise fallback to bundle_info */}
                    {(leadData.lead_submission_data?.addons_data?.selected_bundles?.length > 0 || (bundleData && bundleData.length > 0)) && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Selected Bundles</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {leadData.lead_submission_data?.addons_data?.selected_bundles ? (
                            leadData.lead_submission_data.addons_data.selected_bundles.map((bundle: any, index: number) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-gray-900 text-sm mb-1">{bundle.name}</h5>
                                    <p className="text-xs text-gray-600 mb-2">{bundle.description}</p>
                                    
                                    <div className="space-y-1 text-xs text-gray-600">
                                      <div><span className="font-medium">Qty:</span> {bundle.quantity || 1}</div>
                                      <div><span className="font-medium">Discount:</span> {bundle.discount_type} - £{bundle.discount_value}</div>
                                      
                                      {bundle.included_items && bundle.included_items.length > 0 && (
                                        <div className="mt-2">
                                          <h6 className="font-medium text-gray-900 mb-1 text-xs">Included Items:</h6>
                                          <div className="space-y-1">
                                            {bundle.included_items.map((item: any, itemIndex: number) => (
                                              <div key={itemIndex} className="bg-blue-50 p-2 rounded text-xs">
                                                <div className="flex items-start gap-2">
                                                  {item.addon_image && (
                                                    <img 
                                                      src={item.addon_image} 
                                                      alt={item.addon_name}
                                                      className="w-8 h-8 object-contain rounded flex-shrink-0"
                                                    />
                                                  )}
                                                  <div className="flex-1 min-w-0">
                                                    <div className="font-medium">{item.addon_name}</div>
                                                    <div className="text-gray-600">
                                                      £{item.total_value} (Qty: {item.quantity_included})
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            bundleData.map((bundle: any, index: number) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                <div className="flex items-start gap-3">
                                  {bundle.image_url && (
                                    <img 
                                      src={bundle.image_url} 
                                      alt={bundle.name}
                                      className="w-20 h-20 object-contain rounded-md flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-gray-900 text-base mb-2">{bundle.name}</h5>
                                    <div className="space-y-1 text-sm text-gray-600">
                                      <div>
                                        <span className="font-medium">Price:</span> £{bundle.price || 0}
                                      </div>
                                      <div>
                                        <span className="font-medium">Quantity:</span> {bundle.quantity || 1}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Journey & Analytics */}
                {leadData.lead_submission_data && (
                  <Card>
                    <CardHeader className="px-4 py-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-4 w-4 text-blue-600" />
                        Customer Journey & Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
                          <p className="text-gray-600">{leadData.progress_step}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Last Activity</h4>
                          <p className="text-gray-600">
                            {leadData.lead_submission_data.last_activity_at ? 
                              new Date(leadData.lead_submission_data.last_activity_at).toLocaleString() : 
                              'Unknown'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {leadData.lead_submission_data.pages_completed && leadData.lead_submission_data.pages_completed.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Pages Completed</h4>
                          <div className="flex flex-wrap gap-2">
                            {leadData.lead_submission_data.pages_completed.map((page: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {page}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quote Data Analytics */}
                      {leadData.lead_submission_data.quote_data && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2 text-sm">Quote Analytics</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            {leadData.lead_submission_data.quote_data.form_submission_count && (
                              <div>
                                <span className="text-blue-700 font-medium">Form Submissions:</span>
                                <span className="ml-2 text-blue-900">{leadData.lead_submission_data.quote_data.form_submission_count}</span>
                              </div>
                            )}
                            {leadData.lead_submission_data.quote_data.total_time_on_page_ms && (
                              <div>
                                <span className="text-blue-700 font-medium">Time on Quote:</span>
                                <span className="ml-2 text-blue-900">{Math.round(leadData.lead_submission_data.quote_data.total_time_on_page_ms / 1000)}s</span>
                              </div>
                            )}
                            {leadData.lead_submission_data.quote_data.verification_stage && (
                              <div>
                                <span className="text-blue-700 font-medium">Verification:</span>
                                <span className="ml-2 text-blue-900 capitalize">{leadData.lead_submission_data.quote_data.verification_stage.replace('_', ' ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Products Analytics */}
                      {leadData.lead_submission_data.products_data && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2 text-sm">Product Selection Analytics</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            {leadData.lead_submission_data.products_data.total_products_viewed && (
                              <div>
                                <span className="text-blue-700 font-medium">Products Viewed:</span>
                                <span className="ml-2 text-blue-900">{leadData.lead_submission_data.products_data.total_products_viewed}</span>
                              </div>
                            )}
                            {leadData.lead_submission_data.products_data.total_time_on_page_ms && (
                              <div>
                                <span className="text-blue-700 font-medium">Time on Products:</span>
                                <span className="ml-2 text-blue-900">{Math.round(leadData.lead_submission_data.products_data.total_time_on_page_ms / 1000)}s</span>
                              </div>
                            )}
                            {leadData.lead_submission_data.products_data.selection_timestamp && (
                              <div>
                                <span className="text-blue-700 font-medium">Selected At:</span>
                                <span className="ml-2 text-blue-900">{new Date(leadData.lead_submission_data.products_data.selection_timestamp).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                       {/* Payment Analytics */}
                       {leadData.lead_submission_data.checkout_data && (
                         <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                           <h4 className="font-medium text-blue-900 mb-2 text-sm">Payment Analytics</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                             {/* Use payment_details.amount as the primary total amount */}
                             {leadData.lead_submission_data.checkout_data.booking_data?.payment_details?.amount && (
                               <div>
                                 <span className="text-blue-700 font-medium">Total Amount:</span>
                                 <span className="ml-2 text-blue-900">£{(leadData.lead_submission_data.checkout_data.booking_data.payment_details.amount / 100).toFixed(2)}</span>
                               </div>
                             )}
                             {leadData.lead_submission_data.checkout_data.booking_data?.payment_details?.payment_method && (
                               <div>
                                 <span className="text-blue-700 font-medium">Payment Method:</span>
                                 <span className="ml-2 text-blue-900 capitalize">{leadData.lead_submission_data.checkout_data.booking_data.payment_details.payment_method}</span>
                               </div>
                             )}
                             {leadData.lead_submission_data.checkout_data.booking_data?.preferred_installation_date && (
                               <div>
                                 <span className="text-blue-700 font-medium">Installation Date:</span>
                                 <span className="ml-2 text-blue-900">{new Date(leadData.lead_submission_data.checkout_data.booking_data.preferred_installation_date).toLocaleDateString()}</span>
                               </div>
                             )}
                             {leadData.lead_submission_data.checkout_data.booking_data?.stripe_metadata?.payment_status && (
                               <div>
                                 <span className="text-blue-700 font-medium">Payment Status:</span>
                                 <span className="ml-2 text-blue-900 capitalize">{leadData.lead_submission_data.checkout_data.booking_data.stripe_metadata.payment_status}</span>
                               </div>
                             )}
                             {/* Use monthly payment from products_data if available, otherwise show from checkout */}
                             {(leadData.lead_submission_data.products_data?.selected_product?.monthly_price || leadData.lead_submission_data.checkout_data.booking_data?.monthly_payment) && (
                               <div>
                                 <span className="text-blue-700 font-medium">Monthly Payment:</span>
                                 <span className="ml-2 text-blue-900">
                                   £{(leadData.lead_submission_data.products_data?.selected_product?.monthly_price || leadData.lead_submission_data.checkout_data.booking_data.monthly_payment).toFixed(2)}
                                 </span>
                               </div>
                             )}
                             {leadData.lead_submission_data.checkout_data.booking_data?.deposit_amount && leadData.lead_submission_data.checkout_data.booking_data.deposit_amount > 0 && (
                               <div>
                                 <span className="text-blue-700 font-medium">Deposit Amount:</span>
                                 <span className="ml-2 text-blue-900">£{leadData.lead_submission_data.checkout_data.booking_data.deposit_amount.toFixed(2)}</span>
                               </div>
                             )}
                             {/* Show APR and months from calculator settings */}
                             {leadData.lead_submission_data.checkout_data.calculator_settings && (
                               <>
                                 <div>
                                   <span className="text-blue-700 font-medium">APR:</span>
                                   <span className="ml-2 text-blue-900">{leadData.lead_submission_data.checkout_data.calculator_settings.selected_plan.apr}%</span>
                                 </div>
                                 <div>
                                   <span className="text-blue-700 font-medium">Finance Term:</span>
                                   <span className="ml-2 text-blue-900">{leadData.lead_submission_data.checkout_data.calculator_settings.selected_plan.months} months</span>
                                 </div>
                               </>
                             )}
                           </div>
                         </div>
                       )}
                    </CardContent>
                  </Card>
                )}

                {/* Form Answers */}
                {leadData.form_answers && leadData.form_answers.length > 0 && (
                  <Card>
                    <CardHeader className="px-4 py-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-4 w-4 text-blue-600" />
                        Form Responses
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {leadData.form_answers.map((answer: any, index: number) => {
                          // Find the corresponding question text
                          const questionText = formQuestions?.find((q: any) => q.question_id === answer.question_id)?.question_text || answer.question || `Question ${index + 1}`;
                          
                          return (
                            <div key={index} className="border-l-4 border-blue-200 pl-4">
                              <h4 className="font-medium text-gray-900">{questionText}</h4>
                              <div className="text-gray-600 mt-1">
                                {typeof answer.answer === 'object' && answer.answer !== null ? (
                                  <div className="space-y-1">
                                    {Object.entries(answer.answer).map(([key, value]: [string, any]) => (
                                      <div key={key} className="flex justify-between text-sm">
                                        <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                        <span className="text-gray-900">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p>{answer.answer || 'No answer provided'}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {leadData.notes && (
                  <Card>
                    <CardHeader className="px-4 py-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-4 w-4 text-blue-600" />
                        Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-gray-600 whitespace-pre-wrap">{leadData.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <LeadActions 
                  leadId={leadData.submission_id}
                />

                {/* Lead Details */}
                <Card>
                  <CardHeader className="px-4 py-3">
                    <CardTitle className="text-lg">Lead Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Submission Date</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(leadData.submission_date).toLocaleDateString()} at {new Date(leadData.submission_date).toLocaleTimeString()}
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Payment Status</h4>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            leadData.payment_status === 'completed' ? 'default' :
                            leadData.payment_status === 'processing' ? 'secondary' :
                            leadData.payment_status === 'failed' ? 'destructive' :
                            'outline'
                          }
                        >
                          {leadData.payment_status}
                        </Badge>
                        {leadData.payment_method && (
                          <span className="text-sm text-gray-600">({leadData.payment_method})</span>
                        )}
                      </div>
                    </div>
                    
                  </CardContent>
                </Card>

                {/* Device Information */}
                {leadData.lead_submission_data?.device_info && (
                  <Card>
                    <CardHeader className="px-4 py-3">
                      <CardTitle className="text-lg">Device Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-4 pb-4">
                      {Object.entries(leadData.lead_submission_data.device_info).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="text-gray-900">{String(value)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Lead</h2>
        <p className="text-gray-600 mb-4">There was an error loading the lead details.</p>
        <Button asChild>
          <Link href="/partner/leads">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Link>
        </Button>
      </div>
    );
  }
}
