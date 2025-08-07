import { useEffect } from 'react';

// Hook to automatically create dynamic styles and provide company classes
export function useDynamicStyles(companyColor: string | null) {
  useEffect(() => {
    if (!companyColor) {
      // Remove any existing dynamic styles if no company color
      const existingStyle = document.getElementById('dynamic-company-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
      return;
    }

    // Remove existing dynamic styles first
    const existingStyle = document.getElementById('dynamic-company-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    const style = document.createElement('style');
    style.id = 'dynamic-company-styles';
    
    // Generate CSS with company color
    style.textContent = `
      .company-bg {
        background-color: ${companyColor} !important;
      }
      
      .company-bg-hover:hover {
        background-color: ${companyColor}dd !important;
      }
      
      .company-text {
        color: ${companyColor} !important;
      }
      
      .company-text-hover:hover {
        color: ${companyColor}dd !important;
      }
      
      .company-border {
        border-color: ${companyColor} !important;
      }
      
      .company-border-focus:focus {
        border-color: ${companyColor} !important;
        box-shadow: 0 0 0 2px ${companyColor}40 !important;
      }
      
      .company-ring-focus:focus {
        --tw-ring-color: ${companyColor} !important;
        box-shadow: 0 0 0 2px ${companyColor}40 !important;
      }
      
      .company-bg-light {
        background-color: ${companyColor}10 !important;
      }
      
      .company-bg-light-20 {
        background-color: ${companyColor}20 !important;
      }
      
      .company-progress {
        background-color: ${companyColor} !important;
      }
      
      .company-spinner {
        border-color: ${companyColor} transparent transparent transparent !important;
      }
      
      .company-button {
        background-color: ${companyColor} !important;
        transition: background-color 0.2s ease !important;
      }
      
      .company-button:hover:not(:disabled) {
        background-color: ${companyColor}dd !important;
      }
      
      .company-button:disabled {
        opacity: 0.5 !important;
      }
      
      .company-input-focus:focus {
        border-color: ${companyColor} !important;
        box-shadow: 0 0 0 2px ${companyColor}40 !important;
        outline: none !important;
      }
      
      .company-link {
        color: ${companyColor} !important;
      }
      
      .company-link:hover {
        color: ${companyColor}dd !important;
      }
      
      .company-badge {
        background-color: ${companyColor}20 !important;
        color: ${companyColor} !important;
      }
      
      .company-border-accent {
        border-color: ${companyColor}40 !important;
      }
      
      .company-highlight {
        background-color: ${companyColor}10 !important;
      }
      
      .company-highlight-border {
        border-left-color: ${companyColor} !important;
      }
    `;
    
    // Append to head
    document.head.appendChild(style);
  }, [companyColor]);

  // Return class names based on whether company color is available
  return {
    button: companyColor ? 'company-button' : 'bg-blue-600 hover:bg-blue-700',
    buttonText: 'text-white',
    text: companyColor ? 'company-text company-text-hover' : 'text-blue-600 hover:text-blue-700',
    link: companyColor ? 'company-link' : 'text-blue-600 hover:text-blue-700',
    inputFocus: companyColor ? 'company-input-focus' : 'focus:ring-blue-500 focus:border-blue-500',
    border: companyColor ? 'company-border' : 'border-blue-500',
    bgLight: companyColor ? 'company-bg-light' : 'bg-blue-50',
    bgLight20: companyColor ? 'company-bg-light-20' : 'bg-blue-50',
    textColored: companyColor ? 'company-text' : 'text-blue-700',
    progress: companyColor ? 'company-progress' : 'bg-blue-500',
    spinner: companyColor ? 'company-spinner' : 'border-blue-500',
    badge: companyColor ? 'company-badge' : 'bg-blue-50 text-blue-700',
    borderAccent: companyColor ? 'company-border-accent' : 'border-blue-200',
    highlight: companyColor ? 'company-highlight' : 'bg-blue-50',
    highlightBorder: companyColor ? 'company-highlight-border' : 'border-l-blue-500'
  };
}
