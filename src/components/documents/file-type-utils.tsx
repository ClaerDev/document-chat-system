import React from 'react';
import {
  FileText,
  File,
  Code,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  Image,
  Video,
  Music
} from 'lucide-react';

// File type color mappings
export const getFileTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    pdf: '#ef4444',     // red-500
    text: '#6b7280',    // gray-500
    md: '#8b5cf6',      // violet-500
    code: '#06b6d4',    // cyan-500
    image: '#10b981',   // emerald-500
    video: '#8b5cf6',   // violet-500
    audio: '#ec4899',   // pink-500
    archive: '#f59e0b', // amber-500
  };
  return colors[type] || '#6b7280'; // default gray
};

// File type badge styling
export const getFileTypeBadgeClass = (type: string): string => {
  const classes: Record<string, string> = {
    pdf: 'bg-red-100 text-red-700 border-red-200',
    text: 'bg-gray-100 text-gray-700 border-gray-200',
    md: 'bg-violet-100 text-violet-700 border-violet-200',
    code: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    image: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    video: 'bg-violet-100 text-violet-700 border-violet-200',
    audio: 'bg-pink-100 text-pink-700 border-pink-200',
    archive: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return classes[type] || 'bg-gray-100 text-gray-700 border-gray-200';
};

// Get document icon based on type
export const getDocumentIcon = (type: string, size: number = 20): React.ReactNode => {
  const iconProps = { size };
  
  switch (type) {
    case 'pdf':
    case 'text':
    case 'md':
      return <FileText {...iconProps} />;
    case 'code':
      return <Code {...iconProps} />;
    case 'image':
      return <FileImage {...iconProps} />;
    case 'video':
      return <FileVideo {...iconProps} />;
    case 'audio':
      return <FileAudio {...iconProps} />;
    case 'archive':
      return <Archive {...iconProps} />;
    default:
      return <File {...iconProps} />;
  }
};

// Get file extension from filename
export const getFileExtension = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return extension ? `.${extension}` : '';
};

// Get filename without extension
export const getFilenameWithoutExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
};

// Get file type from MIME type or file extension
export const getFileTypeFromMimeType = (mimeType: string, fileName: string): string => {
  
  // First check for CSV files specifically (before general text/ check)
  if (fileName.toLowerCase().endsWith('.csv') || mimeType === 'text/csv') {
    return 'excel';
  }
  
  // Then try to determine from MIME type
  if (mimeType) {
    if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
      return 'pdf';
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return 'word';
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return 'excel';
    }
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return 'powerpoint';
    }
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType.startsWith('video/')) {
      return 'video';
    }
    if (mimeType.startsWith('audio/')) {
      return 'audio';
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) {
      return 'archive';
    }
    // Check for markdown specifically before general text check
    if (mimeType === 'text/markdown') {
      return 'md';
    }
    if (mimeType.startsWith('text/')) {
      return 'text';
    }
    
    // If no specific type matches, return the second part of the MIME type (after /)
    if (mimeType.includes('/')) {
      const mimeSubtype = mimeType.split('/')[1];
      return mimeSubtype;
    }
  }
  
  // Fallback to extension-based detection
  const ext = getFileExtension(fileName).replace('.', '').toLowerCase();
  
  const extensionMap: Record<string, string> = {
    // Documents
    pdf: 'pdf',
    doc: 'word',
    docx: 'word',
    xls: 'excel',
    xlsx: 'excel',
    ppt: 'powerpoint',
    pptx: 'powerpoint',
    
    // Images
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    bmp: 'image',
    svg: 'image',
    webp: 'image',
    
    // Videos
    mp4: 'video',
    avi: 'video',
    mov: 'video',
    wmv: 'video',
    flv: 'video',
    mkv: 'video',
    webm: 'video',
    
    // Audio
    mp3: 'audio',
    wav: 'audio',
    ogg: 'audio',
    flac: 'audio',
    aac: 'audio',
    
    // Archives
    zip: 'archive',
    rar: 'archive',
    '7z': 'archive',
    tar: 'archive',
    gz: 'archive',
    
    // Code
    js: 'code',
    ts: 'code',
    jsx: 'code',
    tsx: 'code',
    py: 'code',
    java: 'code',
    cpp: 'code',
    c: 'code',
    cs: 'code',
    php: 'code',
    rb: 'code',
    go: 'code',
    rs: 'code',
    swift: 'code',
    kt: 'code',
    
    // Text
    txt: 'text',
    md: 'md',
    rtf: 'text',
    csv: 'excel', // CSV files are handled in excel case for preview
  };
  
  const finalType = extensionMap[ext] || 'file';
  return finalType;
};

// Format file size
export const formatFileSize = (bytes: number | string): string => {
  // Handle both number and string inputs
  let numBytes: number;
  
  if (typeof bytes === 'number') {
    numBytes = bytes;
  } else if (typeof bytes === 'string') {
    // Check if it's already formatted (contains units like KB, MB)
    if (bytes.match(/\s*(B|KB|MB|GB|TB)$/i)) {
      // Already formatted, return as-is
      return bytes;
    }
    
    // Try to parse as number
    numBytes = parseFloat(bytes) || 0;
  } else {
    numBytes = 0;
  }
  
  if (numBytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  
  return `${parseFloat((numBytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Format date to display only date part
export const formatDateOnly = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
