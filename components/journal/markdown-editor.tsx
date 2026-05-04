"use client";

import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  type LucideIcon,
  Quote,
  Strikethrough,
} from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  /** Class for the inner <textarea>. Wrapper class is fixed. */
  textareaClassName?: string;
};

/**
 * Lightweight markdown editor — a textarea with a toolbar of buttons
 * that wrap or prefix the current selection with the corresponding
 * marker. Keyboard shortcuts: Cmd/Ctrl+B = bold, Cmd/Ctrl+I = italic.
 *
 * Deliberately tiny: no contenteditable, no rich-text engine, no
 * external lib. Just text manipulation on selection ranges. The
 * preview tab in the parent dialog still uses react-markdown to
 * render the result.
 */
export function MarkdownEditor({
  value,
  onChange,
  disabled,
  placeholder,
  rows = 10,
  textareaClassName,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  /** Wrap the current selection with `prefix` and `suffix` (defaults to prefix). */
  function wrap(prefix: string, suffix: string = prefix) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const next = `${before}${prefix}${selected}${suffix}${after}`;
    onChange(next);
    // Restore selection inside the new wrappers so further typing
    // continues in the formatted region.
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  }

  /**
   * Toggle a per-line prefix on every line touched by the selection.
   * Used for headings, quotes, lists. Doesn't try to be clever about
   * removal — re-clicking the same button just adds another prefix
   * (matches how Notion/GitHub editors behave).
   */
  function linePrefix(prefix: string) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const before = value.slice(0, lineStart);
    const block = value.slice(lineStart, end);
    const after = value.slice(end);
    const transformed = block
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n");
    const next = `${before}${transformed}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const added = transformed.length - block.length;
      ta.setSelectionRange(start + prefix.length, end + added);
    });
  }

  function insertLink() {
    const ta = ref.current;
    if (!ta) return;
    const url = window.prompt("URL do link:");
    if (!url) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const label = selected.length > 0 ? selected : "texto";
    const next = `${before}[${label}](${url})${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const labelStart = start + 1;
      ta.setSelectionRange(labelStart, labelStart + label.length);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const meta = e.metaKey || e.ctrlKey;
    if (!meta) return;
    if (e.key.toLowerCase() === "b") {
      e.preventDefault();
      wrap("**");
    } else if (e.key.toLowerCase() === "i") {
      e.preventDefault();
      wrap("*");
    } else if (e.key.toLowerCase() === "k") {
      e.preventDefault();
      insertLink();
    }
  }

  return (
    <div
      className={cn(
        "border-input bg-background flex flex-col overflow-hidden rounded-md border",
        "focus-within:border-ring focus-within:ring-ring/40 focus-within:ring-2",
        "transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        disabled && "opacity-50",
      )}
    >
      <div className="border-border bg-muted/20 flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
        <ToolButton
          onClick={() => wrap("**")}
          icon={Bold}
          title="negrito (Ctrl+B)"
          disabled={disabled}
        />
        <ToolButton
          onClick={() => wrap("*")}
          icon={Italic}
          title="itálico (Ctrl+I)"
          disabled={disabled}
        />
        <ToolButton
          onClick={() => wrap("~~")}
          icon={Strikethrough}
          title="riscado"
          disabled={disabled}
        />
        <Divider />
        <ToolButton
          onClick={() => linePrefix("## ")}
          icon={Heading2}
          title="cabeçalho"
          disabled={disabled}
        />
        <ToolButton
          onClick={() => linePrefix("> ")}
          icon={Quote}
          title="citação"
          disabled={disabled}
        />
        <ToolButton
          onClick={() => linePrefix("- ")}
          icon={List}
          title="lista"
          disabled={disabled}
        />
        <ToolButton
          onClick={() => linePrefix("1. ")}
          icon={ListOrdered}
          title="lista numerada"
          disabled={disabled}
        />
        <Divider />
        <ToolButton
          onClick={() => wrap("`")}
          icon={Code}
          title="código"
          disabled={disabled}
        />
        <ToolButton
          onClick={insertLink}
          icon={Link2}
          title="link (Ctrl+K)"
          disabled={disabled}
        />
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className={cn(
          "placeholder:text-muted-foreground/60 min-h-[200px] w-full resize-y bg-transparent px-3 py-2.5 font-sans text-[13px] leading-relaxed outline-none disabled:cursor-not-allowed",
          textareaClassName,
        )}
      />
    </div>
  );
}

function ToolButton({
  onClick,
  icon: Icon,
  title,
  disabled,
}: {
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.94] inline-flex size-7 items-center justify-center rounded-md transition-all duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)] disabled:opacity-50"
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={1.7} />
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="bg-border mx-0.5 h-4 w-px" />;
}
