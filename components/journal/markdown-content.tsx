"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Renders user-authored markdown for journal entries. Bold, italic,
 * lists, links, headings, blockquotes — keep it simple and readable.
 * No images or HTML embeds (the entry's cover takes that role); links
 * always open in a new tab so the journal feed isn't lost.
 */
export function MarkdownContent({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-neutral dark:prose-invert max-w-none",
        // Tight spacing so paragraphs in a single entry don't sprawl.
        "[&_h1]:text-foreground [&_h1]:text-[18px] [&_h1]:font-semibold [&_h1]:tracking-tight",
        "[&_h2]:text-foreground [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:tracking-tight",
        "[&_h3]:text-foreground [&_h3]:text-[13.5px] [&_h3]:font-semibold",
        "[&_p]:text-foreground/90 [&_p]:text-[13px] [&_p]:leading-relaxed",
        "[&_li]:text-foreground/90 [&_li]:text-[13px] [&_li]:leading-relaxed",
        "[&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline",
        "[&_blockquote]:border-border [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-foreground/75",
        "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12.5px] [&_code]:font-mono",
        "[&_strong]:text-foreground [&_strong]:font-semibold",
        "[&_em]:text-foreground/90",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children, ...props }) {
            return (
              <a {...props} href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
