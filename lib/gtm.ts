/**
 * Google Tag Manager utility functions
 */

/**
 * Trigger a GTM event with custom data
 * @param eventName - The name of the GTM event to trigger
 * @param eventData - Additional data to send with the event
 */
export function triggerGTMEvent(eventName: string, eventData: Record<string, any> = {}) {
  // Check if GTM is available
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventData
    });
    console.log(`GTM Event triggered: ${eventName}`, eventData);
  } else {
    console.warn('GTM dataLayer not found. Event not triggered:', eventName);
  }
}

/**
 * Trigger GTM event in both iframe and parent window contexts
 * @param eventName - The name of the GTM event to trigger
 * @param eventData - Additional data to send with the event
 */
export function triggerGTMEventCrossFrame(eventName: string, eventData: Record<string, any> = {}) {
  // Trigger in current context (iframe or main window)
  triggerGTMEvent(eventName, eventData);
  
  // If in iframe, also try to trigger in parent window
  if (typeof window !== 'undefined' && window.self !== window.top) {
    try {
      window.parent.postMessage({
        type: 'gtm-event',
        event_name: eventName,
        event_data: eventData
      }, '*');
    } catch (error) {
      console.warn('Failed to send GTM event to parent window:', error);
    }
  }
}

/**
 * Trigger a quote submission GTM event
 * @param eventName - The GTM event name from partner settings
 * @param quoteData - Quote submission data
 */
export function triggerQuoteSubmissionEvent(eventName: string, quoteData: {
  serviceCategoryId: string;
  serviceCategoryName?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  postcode: string;
  submissionId?: string;
  partnerId?: string;
}) {
  if (!eventName) {
    console.warn('No GTM event name provided for quote submission');
    return;
  }

  triggerGTMEvent(eventName, {
    event_category: 'Quote Submission',
    event_label: quoteData.serviceCategoryName || 'Unknown Service',
    service_category_id: quoteData.serviceCategoryId,
    service_category_name: quoteData.serviceCategoryName,
    customer_name: `${quoteData.firstName} ${quoteData.lastName}`,
    customer_email: quoteData.email,
    customer_phone: quoteData.phone,
    customer_postcode: quoteData.postcode,
    submission_id: quoteData.submissionId,
    partner_id: quoteData.partnerId,
    timestamp: new Date().toISOString()
  });
}

// Extend the Window interface to include dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}
