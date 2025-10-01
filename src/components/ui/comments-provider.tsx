'use client';

import * as React from 'react';

interface CommentsProviderProps {
  children: React.ReactNode;
}

export function CommentsProvider({ children }: CommentsProviderProps) {
  // Simple implementation - can be enhanced later with actual comment functionality
  return <>{children}</>;
}