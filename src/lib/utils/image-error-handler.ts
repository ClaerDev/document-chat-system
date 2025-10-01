/**
 * Image Error Handler Utility
 * Handles broken image URLs and provides fallback solutions
 */

export interface ImageErrorHandlerOptions {
  fallbackSrc?: string;
  placeholder?: string;
  hideOnError?: boolean;
  retryAttempts?: number;
  onError?: (error: Event) => void;
  useReactSafe?: boolean;
}

/**
 * Handle image loading errors with fallback strategies
 */
export function handleImageError(
  img: HTMLImageElement,
  options: ImageErrorHandlerOptions = {}
) {
  const {
    fallbackSrc = '/images/placeholder.svg',
    placeholder = 'Image unavailable',
    hideOnError = false,
    retryAttempts = 1,
    onError,
    useReactSafe = true
  } = options;

  let attempts = 0;

  const errorHandler = (event: Event) => {
    attempts++;
    
    // Call custom error handler if provided
    if (onError) {
      onError(event);
    }

    // Log the error for debugging
    console.warn('Image load failed:', img.src);

    // Try fallback strategies
    if (attempts <= retryAttempts) {
      if (fallbackSrc && img.src !== fallbackSrc) {
        console.log('Trying fallback image:', fallbackSrc);
        img.src = fallbackSrc;
        return;
      }
    }

    // Final fallback: hide image or show placeholder
    if (hideOnError) {
      img.style.display = 'none';
    } else if (useReactSafe) {
      // React-safe approach: modify the existing image element
      img.src = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="150" fill="#f3f4f6"/>
          <rect x="1" y="1" width="198" height="148" stroke="#d1d5db" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
          <circle cx="100" cy="60" r="12" fill="#9ca3af"/>
          <path d="M94 60c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z" fill="#6b7280"/>
          <path d="M87.5 72.5l12.5-12.5 12.5 12.5v15H87.5v-15z" fill="#9ca3af"/>
          <text x="100" y="110" text-anchor="middle" fill="#6b7280" font-family="system-ui, sans-serif" font-size="10">
            ${placeholder}
          </text>
        </svg>
      `);
      img.alt = placeholder;
      img.title = placeholder;
      // Set a class for styling
      img.className = (img.className + ' image-error-placeholder').trim();
    } else {
      // DOM replacement approach (avoid with React)
      try {
        const placeholderDiv = document.createElement('div');
        placeholderDiv.className = 'image-placeholder bg-muted rounded p-4 text-center text-muted-foreground';
        placeholderDiv.textContent = placeholder;
        placeholderDiv.style.width = img.width ? `${img.width}px` : '100%';
        placeholderDiv.style.height = img.height ? `${img.height}px` : 'auto';
        
        if (img.parentNode) {
          img.parentNode.replaceChild(placeholderDiv, img);
        }
      } catch (error) {
        console.warn('Failed to replace image element:', error);
        // Fallback to hiding the image
        img.style.display = 'none';
      }
    }
  };

  img.addEventListener('error', errorHandler);
  
  // Return cleanup function
  return () => {
    img.removeEventListener('error', errorHandler);
  };
}

/**
 * React hook for handling image errors
 */
export function useImageErrorHandler(options: ImageErrorHandlerOptions = {}) {
  const {
    fallbackSrc = '/images/placeholder.svg',
    placeholder = 'Image unavailable',
    onError: customOnError
  } = options;

  return {
    onError: (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const img = event.currentTarget;
      
      // Call custom error handler if provided
      if (customOnError) {
        customOnError(event.nativeEvent);
      }

      // Log the error for debugging
      console.warn('Image load failed:', img.src);

      // Try fallback image first
      if (fallbackSrc && img.src !== fallbackSrc) {
        img.src = fallbackSrc;
        return;
      }

      // Final fallback: inline SVG placeholder
      img.src = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="150" fill="#f3f4f6"/>
          <rect x="1" y="1" width="198" height="148" stroke="#d1d5db" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
          <circle cx="100" cy="60" r="12" fill="#9ca3af"/>
          <path d="M94 60c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z" fill="#6b7280"/>
          <path d="M87.5 72.5l12.5-12.5 12.5 12.5v15H87.5v-15z" fill="#9ca3af"/>
          <text x="100" y="110" text-anchor="middle" fill="#6b7280" font-family="system-ui, sans-serif" font-size="10">
            ${placeholder}
          </text>
        </svg>
      `);
      img.alt = placeholder;
      img.title = placeholder;
      img.className = (img.className + ' image-error-placeholder').trim();
    }
  };
}

/**
 * Global image error handler - sets up automatic error handling for all images
 */
export function setupGlobalImageErrorHandler() {
  // Handle existing images
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('data-error-handled')) {
      handleImageError(img);
      img.setAttribute('data-error-handled', 'true');
    }
  });

  // Handle dynamically added images
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // Handle img elements
          if (element.tagName === 'IMG' && !element.hasAttribute('data-error-handled')) {
            handleImageError(element as HTMLImageElement);
            element.setAttribute('data-error-handled', 'true');
          }
          
          // Handle img elements within added nodes
          element.querySelectorAll?.('img').forEach(img => {
            if (!img.hasAttribute('data-error-handled')) {
              handleImageError(img);
              img.setAttribute('data-error-handled', 'true');
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return () => observer.disconnect();
}

/**
 * Check if an image URL is likely to cause CORS/auth issues
 */
export function isProblematicImageUrl(url: string): boolean {
  const problematicDomains = [
    'gettyimages.com',
    'shutterstock.com',
    'istockphoto.com',
    'alamy.com'
  ];

  return problematicDomains.some(domain => url.includes(domain));
}

/**
 * Clean or proxy problematic image URLs
 */
export function cleanImageUrl(url: string): string {
  // Remove auth parameters that might cause issues
  try {
    const urlObj = new URL(url);
    
    // Remove common auth/tracking parameters
    const paramsToRemove = ['k', 'c', 's', 'w', 'token', 'sig'];
    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });

    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}