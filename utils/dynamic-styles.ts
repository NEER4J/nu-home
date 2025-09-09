// Dynamic CSS class generator for company branding
export function createDynamicStyles(companyColor: string | null): void {
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
  `;
  
  // Append to head
  document.head.appendChild(style);
}

// Helper function to get class names based on company color availability
export function getCompanyClasses(companyColor: string | null) {
  if (!companyColor) {
    return {
      button: 'bg-blue-600 hover:bg-blue-700',
      buttonText: 'text-white',
      text: 'text-blue-600 hover:text-blue-700',
      focus: 'focus:ring-blue-500',
      border: 'border-blue-500',
      bgLight: 'bg-blue-50',
      textColored: 'text-blue-700',
      progress: 'bg-blue-500',
      spinner: 'border-blue-500'
    };
  }
  
  return {
    button: 'company-button',
    buttonText: 'text-white',
    text: 'company-text company-text-hover',
    focus: 'company-ring-focus',
    border: 'company-border',
    bgLight: 'company-bg-light',
    bgLight20: 'company-bg-light-20',
    textColored: 'company-text',
    progress: 'company-progress',
    spinner: 'company-spinner'
  };
}
