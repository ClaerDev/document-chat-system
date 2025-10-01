/**
 * useCSRF Hook
 * 
 * React hook for handling CSRF protection in client-side components
 * Provides token management and automatic injection into requests
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseCSRFReturn {
  token: string | null;
  loading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
  addToHeaders: (headers?: HeadersInit) => HeadersInit;
  addToFormData: (formData: FormData) => FormData;
}

/**
 * Custom hook for CSRF protection
 */
export function useCSRF(): UseCSRFReturn {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch CSRF token from server
   */
  const fetchToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/csrf', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn(`CSRF token fetch failed: ${response.statusText}`);
        // For now, continue without CSRF token instead of throwing
        setToken(null);
        setError(`CSRF unavailable: ${response.statusText}`);
        return;
      }

      const data = await response.json();
      
      if (!data.token) {
        console.warn('No CSRF token received from server');
        setToken(null);
        setError('No CSRF token received');
        return;
      }

      setToken(data.token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.warn('Failed to fetch CSRF token:', errorMessage);
      // Continue without token instead of failing
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh token manually
   */
  const refreshToken = useCallback(async () => {
    await fetchToken();
  }, [fetchToken]);

  /**
   * Add CSRF token to request headers
   */
  const addToHeaders = useCallback((headers: HeadersInit = {}): HeadersInit => {
    if (!token) {
      // Don't warn - CSRF may be temporarily disabled
      return headers;
    }

    const newHeaders = new Headers(headers);
    newHeaders.set('x-csrf-token', token);
    
    return newHeaders;
  }, [token]);

  /**
   * Add CSRF token to FormData
   */
  const addToFormData = useCallback((formData: FormData): FormData => {
    if (!token) {
      // Don't warn - CSRF may be temporarily disabled
      return formData;
    }

    formData.append('_csrf', token);
    return formData;
  }, [token]);

  // Fetch token on mount
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Auto-refresh token before expiration (55 minutes)
  useEffect(() => {
    if (!token) return;

    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 55 * 60 * 1000); // 55 minutes

    return () => clearInterval(refreshInterval);
  }, [token, refreshToken]);

  return {
    token,
    loading,
    error,
    refreshToken,
    addToHeaders,
    addToFormData
  };
}

/**
 * Higher-order function to wrap fetch with CSRF protection
 */
export function createCSRFProtectedFetch(csrfToken: string) {
  return async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('x-csrf-token', csrfToken);

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  };
}

/**
 * Utility hook for form submissions with CSRF protection
 */
export function useCSRFForm() {
  const { token, loading, error, addToHeaders, addToFormData } = useCSRF();

  const submitForm = useCallback(async (
    url: string,
    formData: FormData,
    options: Omit<RequestInit, 'body' | 'method'> = {}
  ) => {
    if (!token) {
      throw new Error('CSRF token not available');
    }

    const protectedFormData = addToFormData(formData);
    const protectedHeaders = addToHeaders(options.headers);

    return fetch(url, {
      ...options,
      method: 'POST',
      body: protectedFormData,
      headers: protectedHeaders,
      credentials: 'include'
    });
  }, [token, addToHeaders, addToFormData]);

  const submitJSON = useCallback(async (
    url: string,
    data: any,
    options: Omit<RequestInit, 'body' | 'method'> = {}
  ) => {
    if (!token) {
      throw new Error('CSRF token not available');
    }

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    const protectedHeaders = addToHeaders(headers);

    return fetch(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
      headers: protectedHeaders,
      credentials: 'include'
    });
  }, [token, addToHeaders]);

  return {
    token,
    loading,
    error,
    submitForm,
    submitJSON
  };
}