'use client';

import { useEffect, useState } from 'react';
import { getPartnerSettingsClient } from '@/lib/partner-settings-client';
import { PartnerCodeInjection } from './PartnerCodeInjection';

export function PartnerCodeWrapper() {
  const [partnerSettings, setPartnerSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPartnerSettings() {
      try {
        setLoading(true);
        const host = window.location.hostname;
        const settings = await getPartnerSettingsClient(host);
        setPartnerSettings(settings);
      } catch (error) {
        console.error('Error loading partner code injection:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPartnerSettings();
  }, []);

  if (loading || !partnerSettings) {
    return null;
  }

  return (
    <PartnerCodeInjection
      headerCode={partnerSettings.header_code}
      bodyCode={partnerSettings.body_code}
      footerCode={partnerSettings.footer_code}
    />
  );
}
