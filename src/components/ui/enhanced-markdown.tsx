'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '@/styles/markdown.css';

interface EnhancedMarkdownProps {
  content: string;
  className?: string;
}

export function EnhancedMarkdown({ content, className = '' }: EnhancedMarkdownProps) {
  return (
    <div className={`prose prose-sm max-w-none prose-invert markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
          table({children, ...props}) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="w-full border border-gray-600 rounded-lg" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          th({children, ...props}) {
            return (
              <th className="bg-gray-700 border-b border-gray-600 px-4 py-2 text-left text-gray-100 font-semibold" {...props}>
                {children}
              </th>
            );
          },
          td({children, ...props}) {
            return (
              <td className="border-b border-gray-700 px-4 py-2 text-gray-200" {...props}>
                {children}
              </td>
            );
          },
          blockquote({children, ...props}) {
            return (
              <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-900/20 text-gray-200 italic" {...props}>
                {children}
              </blockquote>
            );
          },
          h1({children, ...props}) {
            return (
              <h1 className="text-2xl font-bold text-white mt-6 mb-4 border-b border-gray-600 pb-2" {...props}>
                {children}
              </h1>
            );
          },
          h2({children, ...props}) {
            return (
              <h2 className="text-xl font-semibold text-white mt-5 mb-3" {...props}>
                {children}
              </h2>
            );
          },
          h3({children, ...props}) {
            return (
              <h3 className="text-lg font-medium text-white mt-4 mb-2" {...props}>
                {children}
              </h3>
            );
          },
          ul({children, ...props}) {
            return (
              <ul className="list-disc list-outside ml-6 space-y-1 text-gray-200 my-3" {...props}>
                {children}
              </ul>
            );
          },
          ol({children, ...props}) {
            return (
              <ol className="list-decimal list-outside ml-6 space-y-1 text-gray-200 my-3" {...props}>
                {children}
              </ol>
            );
          },
          li({children, ...props}) {
            return (
              <li className="text-gray-200 leading-relaxed" {...props}>
                {children}
              </li>
            );
          },
          p({children, ...props}) {
            return (
              <p className="text-gray-200 leading-relaxed mb-3" {...props}>
                {children}
              </p>
            );
          },
          a({children, href, ...props}) {
            // Check if the link is an image
            const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(\?[^)\s]*)?$/i;
            const isImageLink = href && imageExtensions.test(href);
            
            if (isImageLink) {
              return (
                <div className="my-4">
                  <img
                    src={href}
                    alt={typeof children === 'string' ? children : 'Image'}
                    className="max-w-full h-auto rounded-lg border border-gray-600"
                    onError={(e) => {
                      // If image fails to load, show as regular link
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.insertAdjacentHTML('afterend', `
                        <a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline transition-colors inline-flex items-center gap-1">
                          ${children}
                          <svg class="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      `);
                    }}
                  />
                  <div className="mt-2 text-sm text-gray-400">
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                      View full size
                    </a>
                  </div>
                </div>
              );
            }
            
            return (
              <a className="text-blue-400 hover:text-blue-300 underline transition-colors inline-flex items-center gap-1" href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
                <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            );
          },
          strong({children, ...props}) {
            return (
              <strong className="font-semibold text-white" {...props}>
                {children}
              </strong>
            );
          },
          em({children, ...props}) {
            return (
              <em className="italic text-gray-300" {...props}>
                {children}
              </em>
            );
          },
          hr({...props}) {
            return (
              <hr className="border-gray-600 my-6" {...props} />
            );
          },
          input({type, checked, ...props}) {
            if (type === 'checkbox') {
              return (
                <input 
                  type="checkbox" 
                  checked={checked}
                  className="mr-2 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  readOnly
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}