import { useState, useCallback } from 'react';

export interface UploadState {
  uploading: boolean;
  progress: number;
  error?: string;
  success?: boolean;
}

export interface UseUploadFileOptions {
  maxSize?: number;
  allowedTypes?: string[];
  onSuccess?: (file: File, url?: string) => void;
  onError?: (error: string) => void;
}

export function useUploadFile(options: UseUploadFileOptions = {}) {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
  });

  const { 
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/*', 'video/*', 'audio/*'],
    onSuccess,
    onError 
  } = options;

  const uploadFile = useCallback(async (file: File) => {
    // Validate file size
    if (file.size > maxSize) {
      const error = `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`;
      setUploadState({ uploading: false, progress: 0, error });
      onError?.(error);
      return;
    }

    // Validate file type
    if (allowedTypes.length > 0) {
      const isValidType = allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type;
      });

      if (!isValidType) {
        const error = `File type ${file.type} is not allowed`;
        setUploadState({ uploading: false, progress: 0, error });
        onError?.(error);
        return;
      }
    }

    setUploadState({ uploading: true, progress: 0 });

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Simulate upload with progress
      const xhr = new XMLHttpRequest();
      
      return new Promise<string>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadState(prev => ({ ...prev, progress }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              const url = response.url || response.data?.url;
              
              setUploadState({
                uploading: false,
                progress: 100,
                success: true,
              });
              
              onSuccess?.(file, url);
              resolve(url);
            } catch (error) {
              const errorMsg = 'Failed to parse upload response';
              setUploadState({
                uploading: false,
                progress: 0,
                error: errorMsg,
              });
              onError?.(errorMsg);
              reject(new Error(errorMsg));
            }
          } else {
            const errorMsg = `Upload failed with status ${xhr.status}`;
            setUploadState({
              uploading: false,
              progress: 0,
              error: errorMsg,
            });
            onError?.(errorMsg);
            reject(new Error(errorMsg));
          }
        });

        xhr.addEventListener('error', () => {
          const errorMsg = 'Upload failed due to network error';
          setUploadState({
            uploading: false,
            progress: 0,
            error: errorMsg,
          });
          onError?.(errorMsg);
          reject(new Error(errorMsg));
        });

        // Replace with actual upload endpoint
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      setUploadState({
        uploading: false,
        progress: 0,
        error: errorMsg,
      });
      onError?.(errorMsg);
      throw error;
    }
  }, [maxSize, allowedTypes, onSuccess, onError]);

  const resetUpload = useCallback(() => {
    setUploadState({
      uploading: false,
      progress: 0,
    });
  }, []);

  return {
    uploadFile,
    uploadState,
    resetUpload,
    isUploading: uploadState.uploading,
    progress: uploadState.progress,
    error: uploadState.error,
    success: uploadState.success,
  };
}