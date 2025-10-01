'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Paperclip } from 'lucide-react';
import '@/styles/markdown.css';

interface ReactMarkdownRendererProps {
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
  base64?: string;
}

// Simple file preview component
const FilePreview = ({ href, children }: any) => {
  if (!href || href.trim() === '') {
    return <span className="text-gray-400">{children}</span>;
  }
  
  if (href.endsWith('.pdf')) {
    return <embed src={href} width="100%" height="400px" type="application/pdf" />;
  }
  
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{children}</a>;
};

export const ReactMarkdownRenderer: React.FC<ReactMarkdownRendererProps> = ({
  content,
  role,
  className = '',
  onCopy,
  attachedFiles = []
}) => {
  // Fallback for empty content
  if (!content || content.trim() === '') {
    return (
      <div className={`text-gray-200 leading-relaxed ${className}`}>
        <p className="text-gray-400 italic">No content to display</p>
      </div>
    );
  }

  // Process content to handle base64 images
  const processedContent = content.replace(
    /data:image\/[^;]+;base64,[A-Za-z0-9+/]+=*/g,
    (match) => `![Image](${match})`
  );

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          img: ({ node, src, ...props }) => {
            if (!src || src.trim() === '') return null;
            return <img src={src} {...props} />;
          },
          video: ({ node, src, ...props }) => {
            if (!src || src.trim() === '') return null;
            return (
              <video 
                src={src}
                controls 
                className="max-w-full rounded-lg border border-gray-600 my-4"
                {...props} 
              />
            );
          },
          audio: ({ node, src, ...props }) => {
            if (!src || src.trim() === '') return null;
            return (
              <audio 
                src={src}
                controls 
                className="w-full my-2"
                {...props} 
              />
            );
          },
          a: ({ node, ...props }) => <FilePreview {...props} />,
          code: ({ inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            return !inline && match ? (
              <div className="my-4">
                <div className="bg-gray-900 rounded-t-lg px-4 py-2 text-sm text-gray-400 border-b border-gray-700">
                  {language}
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={language}
                  PreTag="div"
                  className="rounded-b-lg !mt-0"
                  customStyle={{
                    background: '#1f2937',
                    margin: 0,
                    borderRadius: '0 0 0.5rem 0.5rem'
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
      
      {/* Render attached files */}
      {attachedFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="text-sm text-gray-400 flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            <span>{attachedFiles.length} attached file{attachedFiles.length > 1 ? 's' : ''}</span>
          </div>
          {attachedFiles.map((file) => {
            // Create object URL for file if it exists
            const fileUrl = file.url || (file.file ? URL.createObjectURL(file.file) : null);
            
            if (!fileUrl) {
              return (
                <div key={file.id} className="text-sm text-gray-400">
                  {file.name}
                </div>
              );
            }

            // Simple file rendering based on type
            if (file.type.startsWith('image/')) {
              return (
                <img 
                  key={file.id} 
                  src={fileUrl} 
                  alt={file.name}
                  style={{ maxWidth: "100%", borderRadius: 8, marginTop: 16, marginBottom: 16 }}
                  className="border border-gray-600"
                />
              );
            }
            
            if (file.type.startsWith('video/')) {
              return (
                <video 
                  key={file.id} 
                  src={fileUrl} 
                  controls
                  style={{ maxWidth: "100%", borderRadius: 8, marginTop: 16, marginBottom: 16 }}
                  className="border border-gray-600"
                />
              );
            }
            
            if (file.type.startsWith('audio/')) {
              return (
                <audio 
                  key={file.id} 
                  src={fileUrl} 
                  controls
                  style={{ width: "100%", marginTop: 8, marginBottom: 8 }}
                />
              );
            }
            
            // For other file types, show as download link
            return (
              <div key={file.id} className="text-sm">
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  {file.name}
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReactMarkdownRenderer;