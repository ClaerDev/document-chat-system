'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Share2, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';

interface Citation {
  url: string;
  title?: string;
  content?: string;
  start_index: number;
  end_index: number;
}

interface MessageActionsProps {
  content: string;
  citations?: Citation[];
  onCopy?: (content: string) => void;
  onShare?: () => void;
  onShowSources?: () => void;
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
}

export function MessageActions({
  content,
  citations = [],
  onCopy,
  onShare,
  onShowSources,
  onThumbsUp,
  onThumbsDown
}: MessageActionsProps) {
  const hasCitations = citations.length > 0;

  return (
    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-muted/20">
      {/* Left side - Primary actions */}
      <div className="flex items-center gap-1">
        {hasCitations && (
          <Button
            variant="outline"
            size="sm"
            onClick={onShowSources}
            className="h-7 px-2 text-xs font-medium"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Sources
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {citations.length}
            </Badge>
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy?.(content)}
          className="h-7 px-2 text-xs"
        >
          <Copy className="w-3 h-3 mr-1" />
          Copy
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          className="h-7 px-2 text-xs"
        >
          <Share2 className="w-3 h-3 mr-1" />
          Share
        </Button>
      </div>

      {/* Right side - Feedback actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onThumbsUp}
          className="h-7 w-7 p-0 hover:bg-green-50 hover:text-green-600"
        >
          <ThumbsUp className="w-3 h-3" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onThumbsDown}
          className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
        >
          <ThumbsDown className="w-3 h-3" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
        >
          <MoreHorizontal className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}