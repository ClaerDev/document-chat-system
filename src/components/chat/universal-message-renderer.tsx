'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  ExternalLink,
  FileText,
  Film,
  Music,
  Image as ImageIcon,
  File,
  Maximize2,
  Minimize2,
  RotateCcw,
  FileArchive,
  Code,
  FileSpreadsheet,
  Presentation,
  Share2,
  Eye,
  EyeOff
} from 'lucide-react';

interface UniversalMessageRendererProps {
  content: string;
  role: 'user' | 'assistant';
  className?: string;
  onCopy?: (content: string) => void;
  attachedFiles?: AttachedFile[];
}

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  file?: File;
}

interface MediaState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
}

// URL patterns for different media types
const MEDIA_PATTERNS = {
  IMAGE: /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico|avif)(\?[^\s]*)?$/i,
  VIDEO: /\.(mp4|mov|avi|mkv|wmv|flv|webm|m4v|3gp|ogv|m2ts|ts)(\?[^\s]*)?$/i,
  AUDIO: /\.(mp3|wav|flac|aac|ogg|wma|m4a|opus|aiff)(\?[^\s]*)?$/i,
  PDF: /\.pdf(\?[^\s]*)?$/i,
  DOCUMENT: /\.(doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt|ods|odp)(\?[^\s]*)?$/i,
  ARCHIVE: /\.(zip|rar|7z|tar|gz|bz2|xz)(\?[^\s]*)?$/i,
  CODE: /\.(js|ts|jsx|tsx|html|css|scss|sass|less|json|xml|yaml|yml|md|py|java|cpp|c|h|php|rb|go|rs|swift|kt|scala|sql|sh|bash|zsh|fish|ps1|bat|cmd)(\?[^\s]*)?$/i,
  YOUTUBE: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i,
  URL: /https?:\/\/[^\s]+/g
};

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  const match = url.match(MEDIA_PATTERNS.YOUTUBE);
  return match ? match[1] : null;
};

// Enhanced MediaRenderer component
const MediaRenderer: React.FC<{ url: string; alt?: string; className?: string }> = ({ url, alt, className }) => {
  const [mediaState, setMediaState] = useState<MediaState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false
  });
  const [loadError, setLoadError] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (url: string) => {
    if (MEDIA_PATTERNS.IMAGE.test(url)) return <ImageIcon className="w-5 h-5" />;
    if (MEDIA_PATTERNS.VIDEO.test(url)) return <Film className="w-5 h-5" />;
    if (MEDIA_PATTERNS.AUDIO.test(url)) return <Music className="w-5 h-5" />;
    if (MEDIA_PATTERNS.PDF.test(url)) return <FileText className="w-5 h-5" />;
    if (MEDIA_PATTERNS.DOCUMENT.test(url)) return <FileSpreadsheet className="w-5 h-5" />;
    if (MEDIA_PATTERNS.ARCHIVE.test(url)) return <FileArchive className="w-5 h-5" />;
    if (MEDIA_PATTERNS.CODE.test(url)) return <Code className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const getFileType = (url: string) => {
    if (MEDIA_PATTERNS.IMAGE.test(url)) return 'image';
    if (MEDIA_PATTERNS.VIDEO.test(url)) return 'video';
    if (MEDIA_PATTERNS.AUDIO.test(url)) return 'audio';
    if (MEDIA_PATTERNS.PDF.test(url)) return 'pdf';
    if (MEDIA_PATTERNS.DOCUMENT.test(url)) return 'document';
    if (MEDIA_PATTERNS.ARCHIVE.test(url)) return 'archive';
    if (MEDIA_PATTERNS.CODE.test(url)) return 'code';
    return 'file';
  };

  const togglePlayPause = () => {
    const media = mediaRef.current;
    if (!media) return;
    
    if (mediaState.isPlaying) {
      media.pause();
    } else {
      media.play();
    }
    setMediaState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;
    
    media.muted = !media.muted;
    setMediaState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  if (loadError) {
    // Fallback to file link
    return (
      <Card className="my-3 border-gray-600 bg-gray-800/50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            {getFileIcon(url)}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-200 truncate">{alt || 'File'}</p>
              <p className="text-sm text-gray-400 capitalize">{getFileType(url)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(url, '_blank')}
              className="text-blue-400 hover:text-blue-300"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // YouTube video embedding
  const youtubeVideoId = getYouTubeVideoId(url);
  if (youtubeVideoId) {
    return (
      <div className={`my-4 ${className}`}>
        <div className="relative w-full max-w-3xl rounded-lg overflow-hidden border border-gray-600 bg-black">
          <div className="relative pb-[56.25%]"> {/* 16:9 aspect ratio */}
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${youtubeVideoId}`}
              title={alt || 'YouTube video player'}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="px-3 py-2 bg-gray-900/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Film className="h-4 w-4 text-red-500" />
              <span className="text-xs text-gray-300">YouTube Video</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(url, '_blank')}
              className="text-gray-400 hover:text-white"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              <span className="text-xs">Watch on YouTube</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Image rendering
  if (MEDIA_PATTERNS.IMAGE.test(url)) {
    return (
      <div className={`my-4 ${className}`}>
        <div className="relative group max-w-2xl">
          <img
            src={url}
            alt={alt || 'Image'}
            className="rounded-lg max-w-full h-auto border border-gray-600"
            onError={() => setLoadError(true)}
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(url, '_blank')}
                className="bg-black/50 hover:bg-black/70 text-white"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = alt || 'image';
                  link.click();
                }}
                className="bg-black/50 hover:bg-black/70 text-white"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Video rendering
  if (MEDIA_PATTERNS.VIDEO.test(url)) {
    return (
      <div className={`my-4 ${className}`}>
        <div className="relative group bg-black rounded-lg overflow-hidden border border-gray-600 max-w-3xl">
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={url}
            className="w-full max-h-96 object-contain"
            onLoadedMetadata={() => {
              const video = mediaRef.current as HTMLVideoElement;
              if (video) {
                setMediaState(prev => ({ ...prev, duration: video.duration }));
              }
            }}
            onTimeUpdate={() => {
              const video = mediaRef.current as HTMLVideoElement;
              if (video) {
                setMediaState(prev => ({ ...prev, currentTime: video.currentTime }));
              }
            }}
            onEnded={() => {
              setMediaState(prev => ({ ...prev, isPlaying: false }));
            }}
            onError={() => setLoadError(true)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center space-x-3 text-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="hover:bg-white/20"
              >
                {mediaState.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1 flex items-center space-x-2">
                <span className="text-xs">{formatTime(mediaState.currentTime)}</span>
                <div className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100"
                    style={{ width: `${(mediaState.currentTime / mediaState.duration) * 100}%` }}
                  />
                </div>
                <span className="text-xs">{formatTime(mediaState.duration)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="hover:bg-white/20"
              >
                {mediaState.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Audio rendering
  if (MEDIA_PATTERNS.AUDIO.test(url)) {
    return (
      <div className={`my-3 ${className}`}>
        <Card className="border-gray-600 bg-gray-800/50 max-w-md">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="hover:bg-gray-700"
              >
                {mediaState.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Music className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-200 truncate">{alt || 'Audio File'}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span>{formatTime(mediaState.currentTime)}</span>
                  <div className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-100"
                      style={{ width: `${(mediaState.currentTime / mediaState.duration) * 100}%` }}
                    />
                  </div>
                  <span>{formatTime(mediaState.duration)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="hover:bg-gray-700"
              >
                {mediaState.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={url}
              className="hidden"
              onLoadedMetadata={() => {
                const audio = mediaRef.current as HTMLAudioElement;
                if (audio) {
                  setMediaState(prev => ({ ...prev, duration: audio.duration }));
                }
              }}
              onTimeUpdate={() => {
                const audio = mediaRef.current as HTMLAudioElement;
                if (audio) {
                  setMediaState(prev => ({ ...prev, currentTime: audio.currentTime }));
                }
              }}
              onEnded={() => {
                setMediaState(prev => ({ ...prev, isPlaying: false }));
              }}
              onError={() => setLoadError(true)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default file rendering
  return (
    <Card className={`my-3 border-gray-600 bg-gray-800/50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 text-gray-400">
            {getFileIcon(url)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-200 truncate">{alt || url.split('/').pop()}</p>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Badge variant="outline" className="text-xs capitalize">
                {getFileType(url)}
              </Badge>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(url, '_blank')}
              className="text-blue-400 hover:text-blue-300"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = url;
                link.download = alt || url.split('/').pop() || 'file';
                link.click();
              }}
              className="text-gray-400 hover:text-gray-300"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const UniversalMessageRenderer: React.FC<UniversalMessageRendererProps> = ({
  content,
  role,
  className = '',
  onCopy,
  attachedFiles = []
}) => {
  // Preprocess content to convert all media URLs to appropriate formats
  const preprocessContent = (text: string): string => {
    // Extract YouTube URLs from markdown links and convert to plain URLs for embedding
    // Matches: [Title](youtube_url) or [Title](youtu.be_url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\)]*)?)\)/g, (match, title, url) => {
      // Return the URL on its own line with the title as a heading
      return `\n\n### ${title}\n${url}\n\n`;
    });

    // Find standalone YouTube URLs and ensure they're on their own line for embedding
    text = text.replace(/(?:^|\s)(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s]*))/gm, (match, url) => {
      // Return the URL on its own line to ensure it gets rendered as an embed
      return `\n\n${url}\n\n`;
    });

    // Convert standalone image URLs to markdown format
    text = text.replace(MEDIA_PATTERNS.URL, (url) => {
      // Skip if it's already in markdown format or a YouTube URL
      if (text.includes(`](${url})`) || MEDIA_PATTERNS.YOUTUBE.test(url)) {
        return url;
      }

      if (MEDIA_PATTERNS.IMAGE.test(url)) {
        const filename = url.split('/').pop()?.split('?')[0] || 'image';
        return `![${filename}](${url})`;
      }
      return url;
    });

    return text;
  };

  const processedContent = preprocessContent(content);

  // Custom markdown components
  const markdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      
      if (!inline && match) {
        // Extract text content from children recursively
        const extractTextFromChildren = (children: any): string => {
          if (typeof children === 'string') {
            return children;
          }
          if (Array.isArray(children)) {
            return children.map(extractTextFromChildren).join('');
          }
          if (children && typeof children === 'object') {
            if (children.props && children.props.children) {
              return extractTextFromChildren(children.props.children);
            }
            return '';
          }
          return String(children);
        };
        
        const codeString = extractTextFromChildren(children);
        
        return (
          <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            customStyle={{
              margin: '1rem 0',
              borderRadius: '0.375rem',
              backgroundColor: '#1f2937',
              padding: '1rem',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
            }}
            {...props}
          >
            {codeString.replace(/\n$/, '')}
          </SyntaxHighlighter>
        );
      }
      
      return (
        <code className="bg-gray-700 text-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },

    a: ({ children, href, ...props }: any) => {
      // Check if this is a media URL
      if (href && MEDIA_PATTERNS.URL.test(href)) {
        const filename = typeof children === 'string' ? children : href.split('/').pop()?.split('?')[0];

        // Check for YouTube URLs first - ALWAYS embed, never show as link
        if (MEDIA_PATTERNS.YOUTUBE.test(href)) {
          console.log('🎬 Embedding YouTube URL from link:', href);
          return (
            <div className="block my-4">
              <MediaRenderer url={href} alt={filename} />
            </div>
          );
        }

        // Render media inline
        if (MEDIA_PATTERNS.IMAGE.test(href) || MEDIA_PATTERNS.VIDEO.test(href) || MEDIA_PATTERNS.AUDIO.test(href)) {
          return <MediaRenderer url={href} alt={filename} />;
        }

        // Render other files as file cards
        if (MEDIA_PATTERNS.DOCUMENT.test(href) || MEDIA_PATTERNS.ARCHIVE.test(href) || MEDIA_PATTERNS.PDF.test(href)) {
          return <MediaRenderer url={href} alt={filename} />;
        }
      }

      // Regular link
      return (
        <a
          className="text-blue-400 hover:text-blue-300 underline transition-colors inline-flex items-center gap-1"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      );
    },

    // Enhanced styling for other elements
    img: ({ src, alt, ...props }: any) => {
      return <MediaRenderer url={src} alt={alt} {...props} />;
    },

    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border border-gray-600 rounded-lg" {...props}>
          {children}
        </table>
      </div>
    ),

    th: ({ children, ...props }: any) => (
      <th className="bg-gray-700 border-b border-gray-600 px-4 py-2 text-left text-gray-100 font-semibold" {...props}>
        {children}
      </th>
    ),

    td: ({ children, ...props }: any) => (
      <td className="border-b border-gray-700 px-4 py-2 text-gray-200" {...props}>
        {children}
      </td>
    ),

    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-900/20 text-gray-200 italic" {...props}>
        {children}
      </blockquote>
    ),

    h1: ({ children, ...props }: any) => (
      <h1 className="text-2xl font-bold text-white mt-6 mb-4 border-b border-gray-600 pb-2" {...props}>
        {children}
      </h1>
    ),

    h2: ({ children, ...props }: any) => (
      <h2 className="text-xl font-semibold text-white mt-5 mb-3" {...props}>
        {children}
      </h2>
    ),

    h3: ({ children, ...props }: any) => (
      <h3 className="text-lg font-medium text-white mt-4 mb-2" {...props}>
        {children}
      </h3>
    ),

    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-outside ml-6 space-y-1 text-gray-200 my-3" {...props}>
        {children}
      </ul>
    ),

    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-outside ml-6 space-y-1 text-gray-200 my-3" {...props}>
        {children}
      </ol>
    ),

    li: ({ children, ...props }: any) => (
      <li className="text-gray-200 leading-relaxed" {...props}>
        {children}
      </li>
    ),

    p: ({ children, ...props }: any) => {
      // Check if paragraph contains a standalone YouTube URL
      if (typeof children === 'string') {
        const youtubeMatch = children.match(MEDIA_PATTERNS.YOUTUBE);
        if (youtubeMatch) {
          // Extract the full URL
          const urlMatch = children.match(/https?:\/\/[^\s]+/);
          if (urlMatch) {
            return <MediaRenderer url={urlMatch[0]} />;
          }
        }
      }

      return (
        <p className="text-gray-200 leading-relaxed mb-3" {...props}>
          {children}
        </p>
      );
    },

    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold text-white" {...props}>
        {children}
      </strong>
    ),

    em: ({ children, ...props }: any) => (
      <em className="italic text-gray-300" {...props}>
        {children}
      </em>
    ),

    hr: ({ ...props }: any) => (
      <hr className="border-gray-600 my-6" {...props} />
    )
  };

  return (
    <div className={`prose prose-sm max-w-none prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
      
      {/* Render attached files */}
      {attachedFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="text-sm text-gray-400 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{attachedFiles.length} attached file{attachedFiles.length > 1 ? 's' : ''}</span>
          </div>
          {attachedFiles.map((file) => (
            <MediaRenderer
              key={file.id}
              url={file.url || '#'}
              alt={file.name}
              className="not-prose"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UniversalMessageRenderer;