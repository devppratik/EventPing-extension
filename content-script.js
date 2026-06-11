// Content Script - Detects registration forms on loaded pages

(function() {
  'use strict';

  // Track highlighted forms to avoid re-processing
  const highlightedForms = new Set();
  let formCheckTimeout;

  // Wait for page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectForms);
  } else {
    detectForms();
  }

  function detectForms() {
    // Only run on pages that might have registration forms
    if (!isLikelyRegistrationPage()) {
      return;
    }

    const forms = document.querySelectorAll('form');

    if (forms.length === 0) {
      return;
    }

    // Check if any form looks like a registration form
    const registrationForms = Array.from(forms).filter(isRegistrationForm);

    if (registrationForms.length > 0) {
      console.log('Registration form detected:', registrationForms.length);

      // Notify background script
      try {
        chrome.runtime.sendMessage({
          action: 'formDetected',
          formCount: registrationForms.length
        });
      } catch (error) {
        console.warn('Could not send message to background:', error);
      }

      // Highlight forms for user visibility (optional)
      highlightForms(registrationForms);
    }
  }

  function isLikelyRegistrationPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();

    const keywords = [
      'register', 'signup', 'sign up', 'enroll', 'rsvp',
      'event', 'join', 'apply', 'form'
    ];

    return keywords.some(kw => url.includes(kw) || title.includes(kw));
  }

  function isRegistrationForm(form) {
    const formHTML = form.outerHTML.toLowerCase();
    const formText = form.innerText?.toLowerCase() || '';

    // Check for registration-related fields (modern patterns)
    const hasEmailField = form.querySelector(
      'input[type="email"], input[inputmode="email"], input[autocomplete="email"], input[name*="email"]'
    ) !== null;
    const hasNameField = form.querySelector(
      'input[name*="name"], input[name*="first"], input[name*="last"], input[placeholder*="name"]'
    ) !== null;
    const hasSubmitButton = form.querySelector(
      'button, input[type="submit"], input[type="button"]'
    ) !== null;

    // Check for registration keywords in form
    const registrationKeywords = ['register', 'sign up', 'signup', 'enroll', 'rsvp', 'join'];
    const hasRegistrationKeyword = registrationKeywords.some(kw =>
      formHTML.includes(kw) || formText.includes(kw)
    );

    // Form is likely a registration form if it has common fields and keywords
    return hasSubmitButton && (hasEmailField || hasNameField) && hasRegistrationKeyword;
  }

  function highlightForms(forms) {
    forms.forEach(form => {
      // Check if already highlighted
      const formId = form.id || form.getAttribute('name') || form.outerHTML.substring(0, 100);
      if (highlightedForms.has(formId)) return;
      highlightedForms.add(formId);

      // Add subtle border to indicate detection
      form.style.outline = '3px solid #4285f4';
      form.style.outlineOffset = '4px';

      // Add a small badge
      const badge = document.createElement('div');
      badge.textContent = '📝 Registration Form Detected';
      badge.className = 'reg-reminder-badge';
      badge.style.cssText = `
        position: absolute;
        top: -30px;
        left: 0;
        background: #4285f4;
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // Make form container relative if needed
      const formPosition = window.getComputedStyle(form).position;
      if (formPosition === 'static') {
        form.style.position = 'relative';
      }

      form.insertBefore(badge, form.firstChild);
    });
  }

  // Listen for dynamically loaded forms
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // Debounce to avoid excessive checks
        clearTimeout(formCheckTimeout);
        formCheckTimeout = setTimeout(() => {
          detectForms();
          // Stop observing after finding forms to prevent infinite loop
          if (highlightedForms.size > 0) {
            observer.disconnect();
          }
        }, 500);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    observer.disconnect();
    highlightedForms.clear();
  });
})();
