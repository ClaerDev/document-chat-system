'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FileImage, AlertTriangle } from 'lucide-react';

interface AuthenticatedImageProps {
  document: {
    id: string;
    name: string;
    originalFile?: File;
  };
  alt: string;
  className?: string;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  style?: React.CSSProperties;
}

function isValidFile(file: File): boolean {
  return file instanceof File && file.size > 0;
}

export function AuthenticatedImage({ 
  document, 
  alt, 
  className = "", 
  onLoad, 
  onError,
  style
}: AuthenticatedImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorType, setErrorType] = useState<'network' | 'missing' | 'auth' | 'unknown'>('unknown');

  const fetchAuthenticatedImage = useCallback(async () => {
    if (!document?.id) {
      setError(true);
      setLoading(false);
      return;
    }

    // For newly uploaded files, use the original file object
    if (document.originalFile && isValidFile(document.originalFile)) {
      const url = URL.createObjectURL(document.originalFile);
      setImageUrl(url);
      setLoading(false);
      return;
    }

    // For persisted files, fetch with authentication
    try {
      const response = await fetch(`/api/v1/documents/${document.id}/download`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        
        if (blob.type.startsWith('image/')) {
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
          setError(false);
        } else {
          setError(true);
          setErrorType('missing'); // Server returned non-image content (likely error)
        }
      } else {
        setError(true);
        // Determine error type based on status code
        if (response.status === 401 || response.status === 403) {
          setErrorType('auth');
        } else if (response.status === 404) {
          setErrorType('missing');
        } else if (response.status >= 500) {
          setErrorType('network');
        } else {
          setErrorType('unknown');
        }
      }
    } catch (err) {
      setError(true);
      setErrorType('network'); // Network/connection issues
    } finally {
      setLoading(false);
    }
  }, [document]);

  useEffect(() => {
    fetchAuthenticatedImage();

    // Cleanup blob URL on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [fetchAuthenticatedImage]);

  // Cleanup old URLs when new ones are created
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100`} style={style}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  if (error || !imageUrl) {
    // Create different placeholders based on error type
    const isSmall = (style?.width as string)?.includes('12') || (style?.height as string)?.includes('12');
    const iconSize = isSmall ? 16 : 24;
    
    // Different styling based on error type
    const getPlaceholderStyle = () => {
      switch (errorType) {
        case 'missing':
          return 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 border border-amber-200';
        case 'auth':
          return 'bg-gradient-to-br from-red-50 to-red-100 text-red-600 border border-red-200';
        case 'network':
          return 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 border border-blue-200';
        default:
          return 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400';
      }
    };

    const getIcon = () => {
      if (errorType === 'missing' || errorType === 'network') {
        return <AlertTriangle size={iconSize} className="opacity-70" />;
      }
      return <FileImage size={iconSize} className="opacity-60" />;
    };

    const getMessage = () => {
      if (isSmall) return null;
      switch (errorType) {
        case 'missing':
          return <span className="text-xs mt-1 opacity-80">File missing</span>;
        case 'auth':
          return <span className="text-xs mt-1 opacity-80">Access denied</span>;
        case 'network':
          return <span className="text-xs mt-1 opacity-80">Load failed</span>;
        default:
          return <span className="text-xs mt-1 opacity-70">Preview</span>;
      }
    };
    
    return (
      <div className={`${className} flex flex-col items-center justify-center ${getPlaceholderStyle()}`} style={style} title={errorType === 'missing' ? 'File not found in storage' : undefined}>
        {getIcon()}
        {getMessage()}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      style={style}
      onLoad={onLoad}
      onError={(e) => {
        setError(true);
        onError?.(e);
      }}
    />
  );
}