import { headers } from 'next/headers';
import { getPartnerSettings } from '@/lib/partner-settings';
import { PartnerCodeInjection } from './PartnerCodeInjection';

export async function PartnerCodeWrapper() {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    
    const partnerSettings = await getPartnerSettings(host);
    
    if (!partnerSettings) {
      return null;
    }

    return (
      <PartnerCodeInjection
        headerCode={partnerSettings.header_code}
        bodyCode={partnerSettings.body_code}
        footerCode={partnerSettings.footer_code}
      />
    );
  } catch (error) {
    console.error('Error loading partner code injection:', error);
    return null;
  }
}
