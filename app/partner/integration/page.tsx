import { createClient } from '@/utils/supabase/server';
import { Code, Info } from 'lucide-react';
import IntegrationTabs from './IntegrationTabs';
import MainPageUrlManager from './MainPageUrlManager';

interface PartnerProfile {
  subdomain: string | null;
  custom_domain: string | null;
  company_name: string | null;
}

interface ServiceCategory {
  service_category_id: string;
  name: string;
  slug: string;
}

interface EmbedCode {
  category: ServiceCategory;
  subdomainUrl: string | null;
  customDomainUrl: string | null;
  iframeCode: string | null;
  customDomainIframeCode: string | null;
}

function generateEmbedCodes(categories: ServiceCategory[], profile: PartnerProfile): EmbedCode[] {
  const mainDomain = process.env.NEXT_PUBLIC_SITE_URL || 'nu-home.com';
  const protocol = 'https:';

  return categories.map(category => {
    let subdomainUrl = null;
    let customDomainUrl = null;
    let iframeCode = null;
    let customDomainIframeCode = null;

    // Generate subdomain URL and iframe code
    if (profile.subdomain) {
      subdomainUrl = `${protocol}//${profile.subdomain}.${mainDomain}/${category.slug}/quote`;
      iframeCode = `<iframe 
  id="quote-form-iframe-${category.slug}"
  src="${subdomainUrl}" 
  width="100%" 
  height="100vh" 
  frameborder="0" 
  style="border: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999;"
  title="Quote Form - ${category.name}">
</iframe>

<script>
// Enhanced iframe functionality for ${category.name}
(function() {
  const iframe = document.getElementById('quote-form-iframe-${category.slug}');
  
  // Check for submission ID in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const submissionId = urlParams.get('submission');
  
   if (submissionId && iframe) {
     // Redirect iframe to products page with submission ID
     const iframeSrc = iframe.src;
     const url = new URL(iframeSrc);
     const pathParts = url.pathname.split('/');
     
     // Find the service category slug and replace 'quote' with 'products'
     const categoryIndex = pathParts.findIndex(part => part === '${category.slug}');
     if (categoryIndex !== -1 && pathParts[categoryIndex + 1] === 'quote') {
       pathParts[categoryIndex + 1] = 'products';
     }
     
     const productsPath = pathParts.join('/');
     const productsUrl = url.origin + productsPath + '?submission=' + encodeURIComponent(submissionId);
     iframe.src = productsUrl;
   }
  
  // Listen for messages from iframe (for form completion)
  window.addEventListener('message', function(event) {
    if (event.origin !== '${protocol}//${profile.subdomain}.${mainDomain}' && 
        event.origin !== '${protocol}//${profile.custom_domain || 'localhost'}') {
      return; // Security check
    }
    
    if (event.data.type === 'quote-submitted') {
      // Handle form submission completion
      console.log('Quote submitted:', event.data);
      
      // Optional: Redirect to a thank you page or show success message
      // window.location.href = '/thank-you';
    }
  });
})();
</script>`;
    }

    // Generate custom domain URL and iframe code
    if (profile.custom_domain) {
      customDomainUrl = `${protocol}//${profile.custom_domain}/${category.slug}/quote`;
      customDomainIframeCode = `<iframe 
  id="quote-form-iframe-${category.slug}"
  src="${customDomainUrl}" 
  width="100%" 
  height="100vh" 
  frameborder="0" 
  style="border: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999;"
  title="Quote Form - ${category.name}">
</iframe>

<script>
// Enhanced iframe functionality for ${category.name}
(function() {
  const iframe = document.getElementById('quote-form-iframe-${category.slug}');
  
  // Check for submission ID in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const submissionId = urlParams.get('submission');
  
   if (submissionId && iframe) {
     // Redirect iframe to products page with submission ID
     const iframeSrc = iframe.src;
     const url = new URL(iframeSrc);
     const pathParts = url.pathname.split('/');
     
     // Find the service category slug and replace 'quote' with 'products'
     const categoryIndex = pathParts.findIndex(part => part === '${category.slug}');
     if (categoryIndex !== -1 && pathParts[categoryIndex + 1] === 'quote') {
       pathParts[categoryIndex + 1] = 'products';
     }
     
     const productsPath = pathParts.join('/');
     const productsUrl = url.origin + productsPath + '?submission=' + encodeURIComponent(submissionId);
     iframe.src = productsUrl;
   }
  
  // Listen for messages from iframe (for form completion)
  window.addEventListener('message', function(event) {
    if (event.origin !== '${protocol}//${profile.custom_domain}' && 
        event.origin !== '${protocol}//${profile.subdomain}.${mainDomain}') {
      return; // Security check
    }
    
    if (event.data.type === 'quote-submitted') {
      // Handle form submission completion
      console.log('Quote submitted:', event.data);
      
      // Optional: Redirect to a thank you page or show success message
      // window.location.href = '/thank-you';
    }
  });
})();
</script>`;
    }

    return {
      category,
      subdomainUrl,
      customDomainUrl,
      iframeCode,
      customDomainIframeCode
    };
  });
}

export default async function IntegrationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  // Get partner profile
  const { data: profile } = await supabase
    .from('UserProfiles')
    .select('subdomain, custom_domain, company_name')
    .eq('user_id', user.id)
    .single();

  // Get partner's approved categories
  const { data: categoryAccess } = await supabase
    .from('UserCategoryAccess')
    .select(`
      ServiceCategories (
        service_category_id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'approved');

  const categories = categoryAccess?.map(access => access.ServiceCategories).filter(Boolean) || [];
  
  // Generate embed codes for each category
  const embedCodes = profile ? generateEmbedCodes(categories as unknown as ServiceCategory[], profile) : [];

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load partner profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integration</h1>
        <p className="text-gray-600">
          Embed quote forms on your website using the iframe codes below. 
          Choose between your subdomain or custom domain URLs.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How to use these embed codes:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Copy the iframe code for your preferred domain (subdomain or custom domain)</li>
              <li>Paste it into your website's HTML where you want the quote form to appear</li>
              <li>The form will automatically adapt to your website's styling</li>
              <li>All form submissions will be sent to your partner dashboard</li>
            </ul>
          </div>
        </div>
      </div>

      {embedCodes.length === 0 ? (
        <div className="text-center py-12">
          <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories Available</h3>
          <p className="text-gray-500">
            You need to have approved category access to generate embed codes.
          </p>
        </div>
      ) : (
        <IntegrationTabs embedCodes={embedCodes} />
      )}

      {/* Main Page URL Management */}
      <div className="mt-12">
        <MainPageUrlManager categories={categories as unknown as ServiceCategory[]} userId={user.id} />
      </div>

      {/* Additional Information */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Styling</h4>
            <ul className="space-y-1">
              <li>• The iframe includes basic styling with rounded corners and shadow</li>
              <li>• You can adjust the width and height as needed</li>
              <li>• The form will be responsive within the iframe</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Customization</h4>
            <ul className="space-y-1">
              <li>• Use custom domain for branded experience</li>
              <li>• All form submissions go to your partner dashboard</li>
              <li>• Forms automatically include your company branding</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
