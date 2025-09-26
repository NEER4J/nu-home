/**
 * Utility functions for CSV export functionality
 */

export interface LeadData {
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
    device_info?: any;
    conversion_events?: any[];
    page_timings?: any;
  };
}

/**
 * Escape CSV field value to handle commas, quotes, and newlines
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Convert leads data to CSV format
 */
export function convertLeadsToCSV(leads: LeadData[]): string {
  if (!leads || leads.length === 0) {
    return '';
  }

  // Define CSV headers
  const headers = [
    'Submission ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'City',
    'Postcode',
    'Submission Date',
    'Status',
    'Progress Step',
    'Payment Status',
    'Payment Method',
    'Service Category',
    'Address Line 1',
    'Formatted Address',
    'Last Activity',
    'Current Page',
    'Pages Completed',
    'Product Name',
    'Product Power',
    'Product Price',
    'Monthly Payment',
    'Selected Addons',
    'Total Addon Price',
    'Selected Bundles',
    'Total Bundle Price',
    'Device Info',
    'Form Submissions Count',
    'Time on Quote (seconds)',
    'Products Viewed',
    'Time on Products (seconds)',
    'Total Amount',
    'Deposit Amount',
    'Installation Date',
    'APR',
    'Finance Term (months)',
    'Notes'
  ];

  // Convert leads to CSV rows
  const rows = leads.map(lead => {
    // Extract product information
    const productName = lead.lead_submission_data?.products_data?.selected_product?.name || 
                       lead.product_info?.name || '';
    const productPower = lead.lead_submission_data?.products_data?.selected_product?.power || 
                         lead.product_info?.selected_power?.power || '';
    const productPrice = lead.lead_submission_data?.products_data?.selected_product?.price || 
                        lead.product_info?.selected_power?.price || 
                        lead.product_info?.price || '';
    const monthlyPayment = lead.lead_submission_data?.products_data?.selected_product?.monthly_price || 
                           lead.lead_submission_data?.checkout_data?.booking_data?.monthly_payment || '';

    // Extract addon information
    const selectedAddons = lead.lead_submission_data?.addons_data?.selected_addons || lead.addon_info || [];
    const addonNames = selectedAddons.map((addon: any) => addon.name || addon.addon_name || 'Unknown').join('; ');
    const totalAddonPrice = selectedAddons.reduce((sum: number, addon: any) => {
      const price = addon.price || addon.total_price || 0;
      const quantity = addon.quantity || 1;
      return sum + (price * quantity);
    }, 0);

    // Extract bundle information
    const selectedBundles = lead.lead_submission_data?.addons_data?.selected_bundles || lead.bundle_info || [];
    const bundleNames = selectedBundles.map((bundle: any) => bundle.name || 'Unknown').join('; ');
    const totalBundlePrice = selectedBundles.reduce((sum: number, bundle: any) => {
      const price = bundle.price || 0;
      const quantity = bundle.quantity || 1;
      return sum + (price * quantity);
    }, 0);

    // Extract device information
    const deviceInfo = lead.lead_submission_data?.device_info ? 
      Object.entries(lead.lead_submission_data.device_info)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ') : '';

    // Extract analytics data
    const formSubmissionsCount = lead.lead_submission_data?.quote_data?.form_submission_count || '';
    const timeOnQuote = lead.lead_submission_data?.quote_data?.total_time_on_page_ms ? 
      Math.round(lead.lead_submission_data.quote_data.total_time_on_page_ms / 1000) : '';
    const productsViewed = lead.lead_submission_data?.products_data?.total_products_viewed || '';
    const timeOnProducts = lead.lead_submission_data?.products_data?.total_time_on_page_ms ? 
      Math.round(lead.lead_submission_data.products_data.total_time_on_page_ms / 1000) : '';

    // Extract payment information
    const totalAmount = lead.lead_submission_data?.checkout_data?.booking_data?.payment_details?.amount ? 
      (lead.lead_submission_data.checkout_data.booking_data.payment_details.amount / 100).toFixed(2) : '';
    const depositAmount = lead.lead_submission_data?.checkout_data?.booking_data?.deposit_amount || '';
    const installationDate = lead.lead_submission_data?.checkout_data?.booking_data?.preferred_installation_date ? 
      new Date(lead.lead_submission_data.checkout_data.booking_data.preferred_installation_date).toLocaleDateString() : '';

    // Extract finance information
    const apr = lead.lead_submission_data?.checkout_data?.calculator_settings?.selected_plan?.apr || 
                lead.lead_submission_data?.products_data?.selected_product?.calculator_settings?.selected_plan?.apr || '';
    const financeTerm = lead.lead_submission_data?.checkout_data?.calculator_settings?.selected_plan?.months || 
                       lead.lead_submission_data?.products_data?.selected_product?.calculator_settings?.selected_plan?.months || '';

    return [
      lead.submission_id,
      lead.first_name,
      lead.last_name,
      lead.email,
      lead.phone || '',
      lead.city || '',
      lead.postcode,
      new Date(lead.submission_date).toLocaleString(),
      lead.status,
      lead.progress_step,
      lead.payment_status,
      lead.payment_method || '',
      lead.ServiceCategories?.name || '',
      lead.address_line_1 || '',
      lead.formatted_address || '',
      lead.lead_submission_data?.last_activity_at ? 
        new Date(lead.lead_submission_data.last_activity_at).toLocaleString() : '',
      lead.lead_submission_data?.current_page || '',
      lead.lead_submission_data?.pages_completed?.join('; ') || '',
      productName,
      productPower,
      productPrice,
      monthlyPayment,
      addonNames,
      totalAddonPrice,
      bundleNames,
      totalBundlePrice,
      deviceInfo,
      formSubmissionsCount,
      timeOnQuote,
      productsViewed,
      timeOnProducts,
      totalAmount,
      depositAmount,
      installationDate,
      apr,
      financeTerm,
      lead.notes || ''
    ].map(escapeCSVField);
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  
  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = 'leads-export.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
