'use client';

import React from 'react';
import { useImageErrorHandler } from '@/lib/utils/image-error-handler';
import { cn } from '@/lib/utils';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  placeholder?: string;
  hideOnError?: boolean;
}

/**
 * SafeImage component with built-in error handling
 * Automatically handles broken images and shows fallbacks
 */
export function SafeImage({ 
  fallbackSrc, 
  placeholder, 
  hideOnError,
  className,
  alt,
  ...props 
}: SafeImageProps) {
  const imageErrorHandler = useImageErrorHandler({
    fallbackSrc,
    placeholder,
    hideOnError
  });

  return (
    <img
      {...props}
      {...imageErrorHandler}
      alt={alt || placeholder || 'Image'}
      className={cn(className)}
    />
  );
}