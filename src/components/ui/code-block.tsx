"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  children: string;
  language?: string;
  className?: string;
}

/**
 * CodeBlock — monospace block with optional copy-to-clipboard button.
 * Doesn't ship a syntax highlighter (deliberately — tokens are rendered
 * in plain mono so the bundle stays slim). The dashboard primarily shows
 * curl + JSON snippets where this is fine.
 */
export function CodeBlock({ children, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={cn(
        "relative group rounded-md border border-border bg-surface-2 overflow-hidden",
        className,
      )}
    >
      {language && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle text-2xs">
          <span className="font-mono text-foreground-faint uppercase tracking-wider">
            {language}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto px-3 py-3 text-xs font-mono text-foreground-muted leading-relaxed">
        <code>{children}</code>
      </pre>
      <button
        onClick={onCopy}
        className={cn(
          "absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md",
          "border border-border bg-surface text-foreground-faint",
          "transition-all duration-150 opacity-0 group-hover:opacity-100",
          "hover:border-border-strong hover:text-foreground",
          "focus-visible:opacity-100",
        )}
        aria-label={copied ? "Copied" : "Copy"}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
