'use client';

import React from 'react';
import { ExternalLink, Globe, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Citation {
  url: string;
  title?: string;
  content?: string;
  start_index: number;
  end_index: number;
}

interface CitationsProps {
  citations: Citation[];
  className?: string;
  onCopy?: (content: string) => void;
}

export const Citations: React.FC<CitationsProps> = ({ 
  citations, 
  className = '', 
  onCopy 
}) => {
  if (!citations || citations.length === 0) {
    return null;
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    if (onCopy) {
      onCopy(url);
    }
  };

  const handleCopyAllSources = () => {
    const formattedSources = citations
      .map((citation, index) => {
        const title = citation.title || 'Source';
        return `${index + 1}. ${title}\n   ${citation.url}`;
      })
      .join('\n\n');
    
    navigator.clipboard.writeText(formattedSources);
    if (onCopy) {
      onCopy(formattedSources);
    }
  };

  return (
    <Card className={`mt-4 border-primary/20 bg-primary/5 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-foreground">
              Sources ({citations.length})
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyAllSources}
            className="h-6 px-2 text-xs text-primary hover:text-primary/80"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {citations.map((citation, index) => {
            const domain = new URL(citation.url).hostname.replace('www.', '');
            const title = citation.title || `Source ${index + 1}`;
            
            return (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900"
              >
                {/* Citation Number */}
                <Badge 
                  variant="secondary" 
                  className="mt-0.5 flex-shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1"
                >
                  {index + 1}
                </Badge>
                
                {/* Citation Content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1 line-clamp-2">
                    {title}
                  </h4>
                  
                  {/* Domain */}
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                    {domain}
                  </p>
                  
                  {/* Content Preview */}
                  {citation.content && (
                    <p className="text-xs text-blue-700 dark:text-blue-300 line-clamp-2 mb-2">
                      {citation.content}
                    </p>
                  )}
                  
                  {/* URL */}
                  <div className="flex items-center gap-2">
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline truncate flex-1"
                      title={citation.url}
                    >
                      {citation.url}
                    </a>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyUrl(citation.url)}
                        className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Copy URL"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(citation.url, '_blank')}
                        className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Footer Note */}
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 text-center">
          These sources were used to generate the AI response above
        </p>
      </CardContent>
    </Card>
  );
};

export default Citations;