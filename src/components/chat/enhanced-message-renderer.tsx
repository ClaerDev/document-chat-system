'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ExternalLink, 
  Video, 
  Copy,
  Share2,
  Paperclip,
  FileText
} from 'lucide-react';
import { FilePreview } from './file-preview';
import dynamic from 'next/dynamic';

const TradingChart = dynamic(() => import('@/components/charts/trading-chart').then(mod => ({ default: mod.TradingChart })), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-muted animate-pulse rounded-md" />
});
import { Citations } from './citations';
import { useImageErrorHandler } from '@/lib/utils/image-error-handler';

// Enhanced Image Component with error handling
const EnhancedImage: React.FC<{ 
  src: string; 
  alt?: string; 
  className?: string; 
  [key: string]: any 
}> = ({ src, alt, className, ...props }) => {
  const { onError } = useImageErrorHandler({
    placeholder: alt || "External image unavailable",
    fallbackSrc: undefined // Let it go straight to placeholder for external images
  });

  return (
    <img 
      src={src} 
      alt={alt || "Image"}
      className={className}
      onError={onError}
      {...props}
    />
  );
};

// PDF Viewer Component - prevents reloading on re-renders
const PDFViewer: React.FC<{ url: string }> = ({ url }) => {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Use a stable key to prevent iframe reloading
  const stableKey = useMemo(() => `pdf-${btoa(url).slice(0, 10)}`, [url]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <span className="block my-3 w-full">
        <span className="block border border-border rounded-lg bg-muted/50 p-4 text-center">
          <span className="flex items-center justify-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">PDF Document</span>
          </span>
          <span className="block text-xs text-muted-foreground mb-3">
            This PDF cannot be displayed inline. Click below to open it in a new tab.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(url, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Open PDF
          </Button>
        </span>
      </span>
    );
  }

  return (
    <span className="block my-3 w-full">
      <span className="block relative border border-border rounded-lg overflow-hidden bg-background">
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <span className="text-center">
              <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto mb-2" />
              <span className="block text-sm text-muted-foreground">Loading PDF...</span>
            </span>
          </span>
        )}
        <iframe
          key={stableKey}
          ref={iframeRef}
          src={url}
          width="100%"
          height="400"
          className="w-full h-[400px] border-0"
          title="PDF Document"
          onLoad={handleLoad}
          onError={handleError}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      </span>
    </span>
  );
};

// Safe Iframe Component - handles X-Frame-Options errors
const SafeIframe: React.FC<{ url: string; title?: string; height?: string }> = ({ url, title = "External Content", height = "400px" }) => {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const handleLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <span className="block my-3 w-full">
        <span className="block border border-border rounded-lg bg-muted/50 p-4 text-center">
          <span className="flex items-center justify-center gap-2 mb-2">
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">External Website</span>
          </span>
          <span className="block text-xs text-muted-foreground mb-3">
            This website cannot be displayed inline due to security restrictions (X-Frame-Options).
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(url, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Open Website
          </Button>
        </span>
      </span>
    );
  }

  return (
    <span className="block my-3 w-full">
      <span className="block relative border border-border rounded-lg overflow-hidden bg-background">
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <span className="text-center">
              <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto mb-2" />
              <span className="block text-sm text-muted-foreground">Loading website...</span>
            </span>
          </span>
        )}
        <iframe
          src={url}
          width="100%"
          height={height}
          className={`w-full border-0`}
          style={{ height, display: isLoading ? 'none' : 'block' }}
          title={title}
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </span>
    </span>
  );
};

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  file?: File;
}

interface Citation {
  url: string;
  title?: string;
  content?: string;
  start_index: number;
  end_index: number;
}

interface EnhancedMessageRendererProps {
  content: string;
  isMarkdown?: boolean;
  className?: string;
  onCopy?: (content: string) => void;
  attachedFiles?: AttachedFile[];
  citations?: Citation[];
}



// URL pattern matching for different content types
const URL_PATTERNS = {
  // Image extensions
  IMAGE: /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(\?[^)\s]*)?$/i,
  // Video extensions
  VIDEO: /\.(mp4|mov|avi|mkv|wmv|flv|webm|m4v|3gp|ogv)(\?[^)\s]*)?$/i,
  // Audio extensions
  AUDIO: /\.(mp3|wav|flac|aac|ogg|wma|m4a|opus)(\?[^)\s]*)?$/i,
  // Document extensions
  DOCUMENT: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt|ods|odp)(\?[^)\s]*)?$/i,
  // Archive extensions
  ARCHIVE: /\.(zip|rar|7z|tar|gz|bz2)(\?[^)\s]*)?$/i,
  // Code extensions
  CODE: /\.(js|ts|jsx|tsx|html|css|scss|sass|less|json|xml|yaml|yml|md|py|java|cpp|c|h|php|rb|go|rs|swift|kt|scala|sql)(\?[^)\s]*)?$/i,
  // General URL pattern
  URL: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
  // YouTube URLs - Enhanced patterns for all YouTube URL formats
  YOUTUBE: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  // Vimeo URLs - Enhanced patterns
  VIMEO: /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/,
  // Twitter/X URLs - Enhanced patterns
  TWITTER: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  // GitHub URLs
  GITHUB: /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+/,
  // TikTok URLs
  TIKTOK: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
  // Instagram URLs
  INSTAGRAM: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/,
  // Twitch URLs
  TWITCH: /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/videos\/(\d+)/,
  // Dailymotion URLs
  DAILYMOTION: /(?:https?:\/\/)?(?:www\.)?dailymotion\.com\/video\/([A-Za-z0-9]+)/,
  // Wistia URLs
  WISTIA: /(?:https?:\/\/)?(?:[\w.-]+\.)?wistia\.com\/medias\/([A-Za-z0-9]+)/,
  // Loom URLs
  LOOM: /(?:https?:\/\/)?(?:www\.)?loom\.com\/share\/([A-Za-z0-9]+)/,
  // Financial symbols and price patterns
  FINANCIAL_SYMBOL: /\b(BTC|ETH|BITCOIN|ETHEREUM|AAPL|GOOGL|MSFT|TSLA|AMZN|NVDA|SPY|QQQ|DOW|NASDAQ|S&P)\b/gi,
  PRICE_MENTION: /\b(?:price|chart|trading|stock|crypto|market|trend|analysis)\b/gi
};

// Utility functions for video platform ID extraction
const extractVideoId = (url: string, platform: string): string | null => {
  try {
    switch (platform) {
      case 'youtube':
        // Use the YouTube regex pattern to extract ID
        const youtubeMatch = url.match(URL_PATTERNS.YOUTUBE);
        if (youtubeMatch && youtubeMatch[1]) {
          return youtubeMatch[1];
        }
        // Fallback to manual parsing for edge cases
        if (url.includes('youtu.be/')) {
          const id = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
          return id;
        } else if (url.includes('youtube.com/watch?v=')) {
          const urlParams = new URLSearchParams(url.split('?')[1]);
          const id = urlParams.get('v');
          return id;
        } else if (url.includes('youtube.com/embed/')) {
          const id = url.split('/embed/')[1].split('?')[0];
          return id;
        }
        return null;
        
      case 'vimeo':
        const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        const vimeoId = vimeoMatch ? vimeoMatch[1] : null;
        return vimeoId;
        
      default:
        const patterns = {
          tiktok: URL_PATTERNS.TIKTOK,
          instagram: URL_PATTERNS.INSTAGRAM,
          twitch: URL_PATTERNS.TWITCH,
          dailymotion: URL_PATTERNS.DAILYMOTION,
          wistia: URL_PATTERNS.WISTIA,
          loom: URL_PATTERNS.LOOM
        };
        
        const pattern = patterns[platform as keyof typeof patterns];
        if (!pattern) return null;
        
        const match = url.match(pattern);
        const id = match ? match[1] : null;
        return id;
    }
  } catch (error) {
    console.error('Error extracting video ID:', error);
    return null;
  }
  
  return null;
};

// Check if URL is a video platform
const getVideoPlatform = (url: string): string | null => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('vimeo.com')) {
    return 'vimeo';
  }
  if (url.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (url.includes('instagram.com')) {
    return 'instagram';
  }
  if (url.includes('twitch.tv')) {
    return 'twitch';
  }
  if (url.includes('dailymotion.com')) {
    return 'dailymotion';
  }
  if (url.includes('wistia.com')) {
    return 'wistia';
  }
  if (url.includes('loom.com')) {
    return 'loom';
  }
  
  return null;
};

// Utility function to escape regex special characters
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Detect if content should render a trading chart
const shouldRenderChart = (content: string): { symbol: string; shouldRender: boolean } => {
  // Check for financial symbol mentions
  const symbolMatch = content.match(URL_PATTERNS.FINANCIAL_SYMBOL);
  const priceMatch = content.match(URL_PATTERNS.PRICE_MENTION);
  
  if (symbolMatch && priceMatch) {
    // Extract the first financial symbol found
    const symbol = symbolMatch[0].toUpperCase();
    
    // Map common variations to standard symbols
    const symbolMap: { [key: string]: string } = {
      'BITCOIN': 'BTC',
      'ETHEREUM': 'ETH',
      'DOW': 'DJI',
      'NASDAQ': 'QQQ',
      'S&P': 'SPY'
    };
    
    const standardSymbol = symbolMap[symbol] || symbol;
    
    return {
      symbol: standardSymbol,
      shouldRender: true
    };
  }
  
  return {
    symbol: '',
    shouldRender: false
  };
};



// Component for rendering video platform embeds
const VideoEmbedRenderer: React.FC<{ url: string; platform: string; videoId: string }> = ({ url, platform, videoId }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);


  const getEmbedUrl = () => {
    switch (platform) {
      case 'youtube':
        // Try regular youtube.com domain instead of nocookie - sometimes nocookie has more restrictions
        return `https://www.youtube.com/embed/${videoId}`;
      case 'vimeo':
        return `https://player.vimeo.com/video/${videoId}?color=ffffff&title=0&byline=0&portrait=0`;
      case 'dailymotion':
        return `https://www.dailymotion.com/embed/video/${videoId}`;
      case 'wistia':
        return `https://fast.wistia.net/embed/iframe/${videoId}`;
      case 'loom':
        return `https://www.loom.com/embed/${videoId}`;
      default:
        return null;
    }
  };

  const embedUrl = getEmbedUrl();

  if (!embedUrl) {
    return (
      <Card className="my-3 border-border bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Video className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {platform.charAt(0).toUpperCase() + platform.slice(1)} Video
              </p>
              <p className="text-xs text-muted-foreground">
                Embedded playback not supported for this platform
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(url, '_blank')}
              className="ml-auto"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="my-3 sm:my-4 w-full max-w-full sm:max-w-2xl">
      <div className="relative rounded-lg overflow-hidden border border-border bg-background">
        <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
          {!isLoaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Loading video...</p>
              </div>
            </div>
          )}
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <Video className="h-8 w-8 mx-auto mb-2 text-red-400" />
                <p className="text-sm text-muted-foreground mb-2">Video blocked or restricted</p>
                <p className="text-xs text-muted-foreground mb-3">This video may have embedding restrictions</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Watch on {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
              onLoad={() => setIsLoaded(true)}
              onError={() => setError(true)}
              style={{ display: isLoaded ? 'block' : 'none' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};


/**
 * Inject YouTube search URLs for video titles that don't have actual URLs
 * This is a fallback for when OpenRouter's :online feature doesn't provide direct video URLs
 */
function injectYouTubeURLs(content: string): string {
  // Pattern: Play button emoji followed by title (without URL on next line)
  // Example: "▶️ NO WAY NICK FUENTES TELLS BLACK AMERICA THIS..."
  const pattern = /▶️\s*([^\n]+?)(?=\n|$)(?!\nhttps?:)/g;

  let injectedContent = content;
  const matches = [...content.matchAll(pattern)];

  if (matches.length > 0) {
    console.log(`🎬 Found ${matches.length} video titles without URLs, injecting YouTube search links...`);

    matches.forEach((match) => {
      const fullMatch = match[0];
      const title = match[1].trim();

      // Create YouTube search URL
      const searchQuery = encodeURIComponent(title);
      const youtubeSearchURL = `https://www.youtube.com/results?search_query=${searchQuery}`;

      // Replace "▶️ Title" with "### Title\n[YouTube URL]"
      const replacement = `### ${title}\n${youtubeSearchURL}`;
      injectedContent = injectedContent.replace(fullMatch, replacement);

      console.log(`🔗 Injected YouTube search for: "${title}"`);
    });
  }

  return injectedContent;
}

// Main component
export const EnhancedMessageRenderer: React.FC<EnhancedMessageRendererProps> = ({
  content,
  isMarkdown = true,
  className = '',
  onCopy,
  attachedFiles = [],
  citations = []
}) => {
  // Ensure content is always a string
  const stringContent = typeof content === 'string' ? content : String(content || '');

  // Track rendered video IDs to prevent duplicates in inline rendering
  const renderedVideoIds = new Set<string>();

  // Inject YouTube URLs for video titles without URLs (fallback solution)
  let contentWithURLs = injectYouTubeURLs(stringContent);

  // Check if content should render a trading chart
  const chartDetection = shouldRenderChart(contentWithURLs);

  // Process content to handle base64 images like the original renderer
  let processedContent = contentWithURLs.replace(
    /data:image\/[^;]+;base64,[A-Za-z0-9+/]+=*/g,
    (match) => `![Image](${match})`
  );


  // Convert direct image URLs to markdown
  processedContent = processedContent.replace(URL_PATTERNS.URL, (url) => {
    // Check for direct image URLs that aren't already in markdown
    if (URL_PATTERNS.IMAGE.test(url)) {
      // Convert HTTP to HTTPS for CSP compliance
      const secureUrl = url.replace(/^http:\/\//, 'https://');
      return `![Image](${secureUrl})`;
    }

    // Check for direct video file URLs
    if (URL_PATTERNS.VIDEO.test(url)) {
      return `<video src="${url}" controls style="max-width: 600px; max-height: 400px;" className="rounded-lg border border-border my-3"></video>`;
    }

    // Check for direct audio URLs
    if (URL_PATTERNS.AUDIO.test(url)) {
      return `<audio src="${url}" controls className="w-full my-3"></audio>`;
    }

    return url; // Return unchanged for other URLs
  });

  // Custom markdown components
  const markdownComponents = {
    // Enhanced link component with direct media rendering
    a: ({ children, href, ...props }: any) => {
      // Ensure children is properly rendered
      const renderChildren = () => {
        if (typeof children === 'string') return children;
        if (Array.isArray(children)) {
          return children.map((child, idx) =>
            typeof child === 'string' ? child : String(child || '')
          ).join('');
        }
        return String(children || '');
      };

      if (!href) {
        return <span>{renderChildren()}</span>;
      }
      
      // Check if it's a video platform link that can be embedded
      const videoPlatform = getVideoPlatform(href);
      if (videoPlatform) {
        const videoId = extractVideoId(href, videoPlatform);
        if (videoId) {
          // Check if this video ID was already rendered to prevent duplicates
          const uniqueVideoKey = `${videoPlatform}:${videoId}`;
          if (renderedVideoIds.has(uniqueVideoKey)) {
            return null; // Don't render duplicate video
          }
          
          // Mark this video as rendered and render it inline
          renderedVideoIds.add(uniqueVideoKey);
          return <VideoEmbedRenderer url={href} platform={videoPlatform} videoId={videoId} />;
        }
      }
      
      // Check if it's a direct image URL
      if (URL_PATTERNS.IMAGE.test(href)) {
        // Convert HTTP to HTTPS for CSP compliance
        const secureUrl = href.replace(/^http:\/\//, 'https://');
        
        return (
          <span className="inline-block my-3 w-full">
            <EnhancedImage
              src={secureUrl} 
              alt="Shared image"
              className="max-w-full h-auto rounded-lg border border-border sm:max-w-[600px] sm:max-h-[400px] max-h-[250px] object-contain"
            />
          </span>
        );
      }
      
      // Check if it's a direct video URL
      if (URL_PATTERNS.VIDEO.test(href)) {
        return (
          <span className="inline-block my-3 w-full">
            <video 
              src={href}
              controls
              className="max-w-full rounded-lg border border-border sm:max-w-[600px] sm:max-h-[400px] max-h-[250px] w-full"
            >
              Your browser does not support the video tag.
            </video>
          </span>
        );
      }
      
      // Check if it's a direct audio URL
      if (URL_PATTERNS.AUDIO.test(href)) {
        return (
          <span className="inline-block my-3 w-full max-w-full sm:max-w-md">
            <audio 
              src={href}
              controls
              className="w-full"
            >
              Your browser does not support the audio tag.
            </audio>
          </span>
        );
      }
      
      // For PDFs, show an iframe with fallback
      if (href.toLowerCase().endsWith('.pdf')) {
        return (
          <PDFViewer url={href} />
        );
      }
      
      // For government/secure websites that might have iframe restrictions, 
      // just show as a link to avoid X-Frame-Options issues
      const isGovernmentOrSecureSite = 
        href.includes('.gov') || 
        href.includes('.edu') || 
        href.includes('senate.gov') ||
        href.includes('judiciary') ||
        href.includes('congress.gov');

      if (isGovernmentOrSecureSite) {
        return (
          <a 
            className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1" 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            {...props}
          >
            {children}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }

      // Default link behavior
      return (
        <a 
          className="text-primary hover:text-primary/80 underline" 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          {...props}
        >
          {children}
        </a>
      );
    },

    // Enhanced img component for markdown images
    img: ({ src, alt, ...props }: any) => {
      if (!src) return null;
      // Convert HTTP to HTTPS for CSP compliance
      const secureUrl = src.replace(/^http:\/\//, 'https://');
      
      return (
        <EnhancedImage
          src={secureUrl} 
          alt={alt || "Image"}
          className="max-w-full h-auto rounded-lg border border-border my-3 sm:max-w-[600px] sm:max-h-[400px] max-h-[250px] object-contain"
          {...props}
        />
      );
    },

    // Enhanced video component for markdown videos
    video: ({ src, ...props }: any) => {
      if (!src) return null;
      return (
        <video 
          src={src}
          controls
          className="max-w-full rounded-lg border border-border my-3 sm:max-w-[600px] sm:max-h-[400px] max-h-[250px] w-full"
          {...props}
        >
          Your browser does not support the video tag.
        </video>
      );
    },
    
    // Enhanced code component with copy functionality
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      const codeContent = String(children).replace(/\n$/, '');

      if (!inline && match) {
        return (
          <div className="my-4 sm:my-5 rounded-lg border border-border overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-muted/50 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-primary">💻</span>
                <span className="text-sm sm:text-base font-medium text-foreground capitalize">
                  {language}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(codeContent);
                  if (onCopy) onCopy(codeContent);
                }}
                className="h-7 px-3 text-xs hover:bg-muted"
              >
                <Copy className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Copy</span>
              </Button>
            </div>
            <div className="overflow-x-auto">
              <SyntaxHighlighter
                style={oneDark}
                language={language}
                PreTag="div"
                className="!mt-0 !mb-0"
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  backgroundColor: '#1f2937',
                  padding: '0.75rem',
                  minWidth: '100%',
                  whiteSpace: 'pre',
                  wordWrap: 'normal'
                }}
                {...props}
              >
                {codeContent}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      }

      return (
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[0.9em] font-mono" {...props}>
          {children}
        </code>
      );
    },
    
    // Enhanced table components
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-5 rounded-lg border border-border shadow-sm">
        <table className="w-full text-base" {...props}>
          {children}
        </table>
      </div>
    ),
    
    th: ({ children, ...props }: any) => (
      <th className="bg-muted border-b border-border px-4 py-3 text-left text-foreground font-semibold text-base" {...props}>
        <div className="flex items-center gap-2">
          <span className="text-primary text-sm">📊</span>
          {children}
        </div>
      </th>
    ),
    
    td: ({ children, ...props }: any) => (
      <td className="border-b border-border px-4 py-3 text-foreground text-base leading-relaxed" {...props}>
        {children}
      </td>
    ),
    
    // Enhanced blockquote
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-primary pl-6 py-4 my-5 bg-primary/10 text-foreground italic rounded-r-lg" {...props}>
        <div className="flex items-start gap-3">
          <span className="text-primary text-xl">💬</span>
          <div className="text-base leading-relaxed">{children}</div>
        </div>
      </blockquote>
    ),
    
    // Enhanced heading components
    h1: ({ children, ...props }: any) => (
      <h1 className="text-3xl font-bold text-foreground mt-8 mb-6 border-b-2 border-primary pb-3" {...props}>
        {children}
      </h1>
    ),
    
    h2: ({ children, ...props }: any) => (
      <h2 className="text-2xl font-semibold text-foreground mt-6 mb-4 flex items-center gap-2" {...props}>
        <span className="text-primary">📌</span>
        {children}
      </h2>
    ),
    
    h3: ({ children, ...props }: any) => (
      <h3 className="text-xl font-medium text-foreground mt-5 mb-3 flex items-center gap-2" {...props}>
        <span className="text-primary">▶️</span>
        {children}
      </h3>
    ),
    
    // Enhanced list components with task list support
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-outside space-y-2 text-foreground my-4 pl-6" {...props}>
        {children}
      </ul>
    ),
    
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-outside space-y-2 text-foreground my-4 pl-6" {...props}>
        {children}
      </ol>
    ),
    
    li: ({ children, ...props }: any) => {
      // Check if this is a task list item
      const childrenArray = React.Children.toArray(children);
      const firstChild = childrenArray[0];
      
      if (typeof firstChild === 'string') {
        // Task list items
        if (firstChild.startsWith('[ ] ')) {
          return (
            <li className="flex items-start space-x-3 text-foreground leading-relaxed list-none" {...props}>
              <input 
                type="checkbox" 
                disabled 
                className="mt-1 rounded border-border"
              />
              <span className="text-base">{firstChild.slice(4)}{childrenArray.slice(1)}</span>
            </li>
          );
        }
        if (firstChild.startsWith('[x] ') || firstChild.startsWith('[X] ')) {
          return (
            <li className="flex items-start space-x-3 text-foreground leading-relaxed list-none" {...props}>
              <input 
                type="checkbox" 
                disabled 
                checked 
                className="mt-1 rounded border-border"
              />
              <span className="line-through text-muted-foreground text-base">
                {firstChild.slice(4)}{childrenArray.slice(1)}
              </span>
            </li>
          );
        }
      }
      
      // For regular list items, let the parent ul/ol handle the styling
      return (
        <li className="text-foreground leading-relaxed text-base" {...props}>
          {children}
        </li>
      );
    },
    
    // Enhanced paragraph
    p: ({ children, ...props }: any) => {
      // Handle children that might be objects
      const renderChildren = () => {
        if (!children) return null;
        if (typeof children === 'string') return children;
        if (Array.isArray(children)) {
          return children.map((child, idx) => {
            if (React.isValidElement(child)) return child;
            if (typeof child === 'string') return child;
            return String(child || '');
          });
        }
        if (React.isValidElement(children)) return children;
        return String(children);
      };

      return (
        <p className="text-base text-foreground leading-relaxed mb-4" {...props}>
          {renderChildren()}
        </p>
      );
    },
    
    // Enhanced emphasis
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),
    
    em: ({ children, ...props }: any) => (
      <em className="italic text-muted-foreground" {...props}>
        {children}
      </em>
    ),

    // Enhanced pre component for mermaid and other special code blocks
    pre: ({ children, ...props }: any) => {
      const codeElement = children?.props;
      const className = codeElement?.className || '';
      const content = codeElement?.children;
      
      // Handle mermaid diagrams
      if (className.includes('language-mermaid')) {
        return (
          <div className="my-4 rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
              <span className="text-sm font-medium text-muted-foreground">
                📊 Mermaid Diagram
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(String(content));
                  if (onCopy) onCopy(String(content));
                }}
                className="h-6 px-2 text-xs hover:bg-muted"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <div className="p-4 bg-background">
              <div className="text-center text-muted-foreground text-sm">
                <div className="mb-2">📊 Mermaid diagram detected</div>
                <div className="text-xs">Copy the code and paste it into a Mermaid viewer</div>
              </div>
              <pre className="mt-2 p-3 bg-muted rounded text-sm font-mono overflow-x-auto">
                <code>{content}</code>
              </pre>
            </div>
          </div>
        );
      }

      // Handle math blocks (LaTeX)
      if (className.includes('language-math') || className.includes('language-latex')) {
        return (
          <div className="my-4 rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
              <span className="text-sm font-medium text-muted-foreground">
                ∑ Math Expression
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(String(content));
                  if (onCopy) onCopy(String(content));
                }}
                className="h-6 px-2 text-xs hover:bg-muted"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <div className="p-4 bg-background">
              <div className="text-center text-muted-foreground text-sm">
                <div className="mb-2">∑ Mathematical expression detected</div>
                <div className="text-xs">Copy the LaTeX code for use in a math renderer</div>
              </div>
              <pre className="mt-2 p-3 bg-muted rounded text-sm font-mono overflow-x-auto">
                <code>{content}</code>
              </pre>
            </div>
          </div>
        );
      }

      // Default pre handling
      return (
        <div className="bg-muted rounded-lg my-3 overflow-x-auto">
          <pre className="p-3 sm:p-4 text-sm font-mono whitespace-pre" {...props}>
            {children}
          </pre>
        </div>
      );
    }
  };
  
  return (
    <div className={`prose prose-base max-w-none ${className}`}>
      
      {/* Render trading chart if financial content is detected */}
      {chartDetection.shouldRender && (
        <div className="my-4">
          <TradingChart 
            symbol={chartDetection.symbol}
            height={400}
            showControls={true}
            className="not-prose"
          />
        </div>
      )}

      
      {/* Render markdown content */}
      {isMarkdown ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          components={markdownComponents}
        >
          {processedContent}
        </ReactMarkdown>
      ) : (
        <div className="whitespace-pre-wrap text-foreground leading-relaxed">
          {content}
        </div>
      )}
      
      {/* Render attached files */}
      {attachedFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          {attachedFiles.length > 1 && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Paperclip className="h-4 w-4" />
              <span>{attachedFiles.length} attached files</span>
            </div>
          )}
          <div className="grid gap-3">
            {attachedFiles.map((file) => {
              // Create a File object if we only have metadata
              const fileObj = file.file || new File([], file.name, { type: file.type });
              
              return (
                <FilePreview
                  key={file.id}
                  file={fileObj}
                  url={file.url}
                  showRemove={false}
                  size="medium"
                  className="not-prose"
                />
              );
            })}
          </div>
        </div>
      )}
      
      {/* Citations are now handled by the Citations Panel */}
    </div>
  );
};

export default EnhancedMessageRenderer;