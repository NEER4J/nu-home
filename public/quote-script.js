// Enhanced iframe functionality for quote forms
(function() {
  // Get the iframe element - this will be set by the parent page
  const iframe = window.currentIframe || document.querySelector('iframe[id*="quote-form-iframe"]');
  const categorySlug = window.currentCategorySlug || 'boiler';
  const storageKey = `iframe-url-${categorySlug}`;
  
  // Function to save current iframe URL to localStorage
  function saveIframeUrl(url) {
    try {
      localStorage.setItem(storageKey, url);
      console.log('Saved iframe URL to localStorage:', url);
    } catch (e) {
      console.warn('Could not save iframe URL to localStorage:', e);
    }
  }
  
  // Function to get saved iframe URL from localStorage
  function getSavedIframeUrl() {
    try {
      return localStorage.getItem(storageKey);
    } catch (e) {
      console.warn('Could not get iframe URL from localStorage:', e);
      return null;
    }
  }
  
  // Function to restore iframe to saved URL
  function restoreIframeUrl() {
    const savedUrl = getSavedIframeUrl();
    if (savedUrl && iframe) {
      iframe.src = savedUrl;
      console.log('Restored iframe to saved URL:', savedUrl);
    }
  }
  
  // Check for submission ID in URL parameters first
  const urlParams = new URLSearchParams(window.location.search);
  const submissionId = urlParams.get('submission');
  
  if (submissionId && iframe) {
    // Redirect iframe to products page with submission ID
    const iframeSrc = iframe.src;
    const url = new URL(iframeSrc);
    const pathParts = url.pathname.split('/');
    
    // Find the service category slug and replace 'quote' with 'products'
    const categoryIndex = pathParts.findIndex(part => part === categorySlug);
    if (categoryIndex !== -1 && pathParts[categoryIndex + 1] === 'quote') {
      pathParts[categoryIndex + 1] = 'products';
    }
    
    const productsPath = pathParts.join('/');
    const productsUrl = url.origin + productsPath + '?submission=' + encodeURIComponent(submissionId);
    iframe.src = productsUrl;
    saveIframeUrl(productsUrl);
  } else {
    // No submission ID, try to restore from saved URL
    restoreIframeUrl();
  }
  
  // Listen for messages from iframe
  window.addEventListener('message', function(event) {
    // Allow all origins for testing (remove this in production)
    // const allowedOrigins = window.allowedIframeOrigins || [
    //   'http://origin.localhost:3000',
    //   'https://quote.itsneeraj.com',
    //   'https://origin.Quote AI.com'
    // ];
    
    // if (!allowedOrigins.includes(event.origin)) {
    //   return; // Security check
    // }
    
    if (event.data.type === 'iframe-navigation') {
      // Save the new URL when iframe navigates
      if (event.data.url) {
        saveIframeUrl(event.data.url);
        console.log('Saved iframe navigation URL:', event.data.url);
      }
    } else if (event.data.type === 'gtm-event') {
      // Handle direct GTM event from iframe
      if (event.data.event_name && window.dataLayer) {
        window.dataLayer.push({
          event: event.data.event_name,
          ...event.data.event_data
        });
        console.log('GTM Event triggered from iframe:', event.data.event_name);
      }
    } else if (event.data.type === 'quote-submitted') {
      // Handle form submission completion
      console.log('Quote submitted:', event.data);
      
      // Trigger GTM event if event data is provided
      if (event.data.gtm_event_name && window.dataLayer) {
        window.dataLayer.push({
          event: event.data.gtm_event_name,
          event_category: 'Quote Submission',
          event_label: event.data.service_category_name || 'Unknown Service',
          service_category_id: event.data.service_category_id,
          service_category_name: event.data.service_category_name,
          customer_name: event.data.customer_name,
          customer_email: event.data.customer_email,
          customer_phone: event.data.customer_phone,
          customer_postcode: event.data.customer_postcode,
          submission_id: event.data.submission_id,
          partner_id: event.data.partner_id,
          timestamp: new Date().toISOString()
        });
        console.log('GTM Event triggered:', event.data.gtm_event_name);
      }
      
      // Optional: Redirect to a thank you page or show success message
      // window.location.href = '/thank-you';
    }
  });
  
  // Save initial URL when iframe loads
  if (iframe) {
    iframe.addEventListener('load', function() {
      if (iframe.src) {
        saveIframeUrl(iframe.src);
      }
    });
  }
})();
