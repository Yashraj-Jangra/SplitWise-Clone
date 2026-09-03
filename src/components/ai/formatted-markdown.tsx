'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface FormattedMarkdownProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export function FormattedMarkdown({ content, className, isStreaming }: FormattedMarkdownProps) {
  if (!content) {
    return isStreaming ? (
      <span className="inline-block w-1.5 h-4 bg-foreground/70 animate-pulse rounded-xs" />
    ) : null;
  }

  return (
    <div className={cn('text-sm leading-relaxed break-words space-y-2', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-foreground mt-3 mb-1.5 tracking-tight border-b border-border/30 pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-foreground mt-2.5 mb-1 tracking-tight flex items-center gap-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-0.5">
              {children}
            </h3>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-sm leading-relaxed text-foreground/95 mb-2 last:mb-0">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="space-y-1 my-2 pl-4 list-disc marker:text-muted-foreground/70 text-sm">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1 my-2 pl-4 list-decimal marker:text-muted-foreground text-sm">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm leading-relaxed text-foreground/95 pl-0.5">
              {children}
            </li>
          ),

          // Bold / Strong text
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),

          // Code
          code: ({ className, children, ...props }) => {
            const isInline = !className && typeof children === 'string' && !children.includes('\n');
            if (isInline) {
              return (
                <code
                  className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[12px] font-medium border border-border/40 text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="my-2.5 overflow-x-auto rounded-xl border border-border/30 bg-muted/40 p-3 font-mono text-xs text-foreground">
                <code {...props}>{children}</code>
              </pre>
            );
          },

          // Tables
          table: ({ children }) => (
            <div className="my-2.5 overflow-x-auto rounded-xl border border-border/30 bg-muted/10 shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/40 border-b border-border/30 text-muted-foreground font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/20">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/20 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="py-2 px-3 text-xs text-foreground">
              {children}
            </td>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-border/60 pl-3 py-1 text-xs text-muted-foreground italic bg-muted/15 rounded-r-lg">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {children}
            </a>
          ),

          // Horizontal rule
          hr: () => <hr className="my-2.5 border-border/30" />,
        }}
      >
        {content}
      </ReactMarkdown>

      {isStreaming && (
        <span className="inline-block w-1.5 h-4 ml-1 bg-foreground/80 animate-pulse align-middle rounded-xs" />
      )}
    </div>
  );
}
