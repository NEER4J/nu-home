'use client';

import { useEffect } from 'react';

interface PartnerCodeInjectionProps {
  headerCode?: string;
  bodyCode?: string;
  footerCode?: string;
}

export function HeaderCodeInjection({ headerCode }: { headerCode?: string }) {
  useEffect(() => {
    if (!headerCode) return;

    // Parse the header code to handle different types of content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = headerCode;
    
    // Handle script tags
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach((script, index) => {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.innerHTML = script.innerHTML;
      }
      newScript.setAttribute('data-partner-code', `header-${index}`);
      document.head.appendChild(newScript);
    });
    
    // Handle style tags
    const styles = tempDiv.querySelectorAll('style');
    styles.forEach((style, index) => {
      const newStyle = document.createElement('style');
      newStyle.innerHTML = style.innerHTML;
      newStyle.setAttribute('data-partner-code', `header-style-${index}`);
      document.head.appendChild(newStyle);
    });
    
    // Handle link tags (for external CSS)
    const links = tempDiv.querySelectorAll('link');
    links.forEach((link, index) => {
      const newLink = document.createElement('link');
      newLink.rel = link.rel;
      newLink.href = link.href;
      newLink.type = link.type;
      newLink.setAttribute('data-partner-code', `header-link-${index}`);
      document.head.appendChild(newLink);
    });
    
    // Handle meta tags
    const metas = tempDiv.querySelectorAll('meta');
    metas.forEach((meta, index) => {
      const newMeta = document.createElement('meta');
      newMeta.name = meta.name;
      newMeta.content = meta.content;
      if (meta.getAttribute('property')) {
        newMeta.setAttribute('property', meta.getAttribute('property')!);
      }
      newMeta.setAttribute('data-partner-code', `header-meta-${index}`);
      document.head.appendChild(newMeta);
    });

    return () => {
      // Cleanup on unmount
      document.querySelectorAll('[data-partner-code^="header"]').forEach(el => el.remove());
    };
  }, [headerCode]);

  return null;
}

export function BodyCodeInjection({ bodyCode }: { bodyCode?: string }) {
  useEffect(() => {
    if (!bodyCode) return;

    // Parse the body code to handle different types of content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = bodyCode;
    
    // Handle script tags
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach((script, index) => {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.innerHTML = script.innerHTML;
      }
      newScript.setAttribute('data-partner-code', `body-${index}`);
      document.body.appendChild(newScript);
    });
    
    // Handle other HTML elements
    const otherElements = Array.from(tempDiv.children).filter(child => child.tagName !== 'SCRIPT');
    otherElements.forEach((element, index) => {
      const newElement = element.cloneNode(true) as HTMLElement;
      newElement.setAttribute('data-partner-code', `body-element-${index}`);
      document.body.appendChild(newElement);
    });

    return () => {
      // Cleanup on unmount
      document.querySelectorAll('[data-partner-code^="body"]').forEach(el => el.remove());
    };
  }, [bodyCode]);

  return null;
}

export function FooterCodeInjection({ footerCode }: { footerCode?: string }) {
  useEffect(() => {
    if (!footerCode) return;

    // Parse the footer code to handle different types of content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = footerCode;
    
    // Handle script tags
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach((script, index) => {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.innerHTML = script.innerHTML;
      }
      newScript.setAttribute('data-partner-code', `footer-${index}`);
      document.body.appendChild(newScript);
    });
    
    // Handle other HTML elements
    const otherElements = Array.from(tempDiv.children).filter(child => child.tagName !== 'SCRIPT');
    otherElements.forEach((element, index) => {
      const newElement = element.cloneNode(true) as HTMLElement;
      newElement.setAttribute('data-partner-code', `footer-element-${index}`);
      document.body.appendChild(newElement);
    });

    return () => {
      // Cleanup on unmount
      document.querySelectorAll('[data-partner-code^="footer"]').forEach(el => el.remove());
    };
  }, [footerCode]);

  return null;
}

export function PartnerCodeInjection({ headerCode, bodyCode, footerCode }: PartnerCodeInjectionProps) {
  return (
    <>
      <HeaderCodeInjection headerCode={headerCode} />
      <BodyCodeInjection bodyCode={bodyCode} />
      <FooterCodeInjection footerCode={footerCode} />
    </>
  );
}
