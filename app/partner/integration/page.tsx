import { createClient } from '@/utils/supabase/server';
import { Code, Info } from 'lucide-react';
import IntegrationTabs from './IntegrationTabs';

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
  const mainDomain = process.env.NEXT_PUBLIC_SITE_URL || 'aifortrades.co.uk';
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
// Configure iframe settings
window.currentIframe = document.getElementById('quote-form-iframe-${category.slug}');
window.currentCategorySlug = '${category.slug}';
</script>
<script src="https://www.aifortrades.co.uk/quote-script.js"></script>`;
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
// Configure iframe settings
window.currentIframe = document.getElementById('quote-form-iframe-${category.slug}');
window.currentCategorySlug = '${category.slug}';
</script>
<script src="https://www.aifortrades.co.uk/quote-script.js"></script>`;
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
  
  // Get main page URL settings for each category
  const { data: partnerSettings } = await supabase
    .from('PartnerSettings')
    .select('service_category_id, main_page_url')
    .eq('partner_id', user.id);

  const mainPageUrls: Record<string, string> = {};
  partnerSettings?.forEach(setting => {
    mainPageUrls[setting.service_category_id] = setting.main_page_url || '';
  });
  
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



      {embedCodes.length === 0 ? (
        <div className="text-center py-12">
          <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories Available</h3>
          <p className="text-gray-500">
            You need to have approved category access to generate embed codes.
          </p>
        </div>
      ) : (
        <IntegrationTabs embedCodes={embedCodes} mainPageUrls={mainPageUrls} userId={user.id} />
      )}

    
    </div>
  );
}
