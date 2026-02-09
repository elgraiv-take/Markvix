import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import type { OpenTab } from "../types";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  // セキュリティ強化のため strict に設定（任意JS実行などを無効化）
  securityLevel: "strict",
});

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    setSvg(null);
    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
    mermaid
      .render(id, code)
      .then(({ svg: s }) => {
        if (!cancelled) setSvg(s);
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (err) return <pre className="text-red-400 text-sm p-2 bg-red-950/30 rounded">{err}</pre>;
  if (!svg) return <div className="animate-pulse h-16 bg-[var(--color-surface)] rounded" />;
  return <div className="my-4" dangerouslySetInnerHTML={{ __html: svg }} />;
}

interface PreviewPanelProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="preview-panel max-w-none px-4 py-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const code = String(children).replace(/\n$/, "");
            if (match?.[1] === "mermaid") {
              return <MermaidBlock code={code} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function PreviewPanel({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: PreviewPanelProps) {
  const active = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {tabs.length > 0 ? (
        <>
          <div className="flex items-center gap-0.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 cursor-pointer text-sm ${
                  tab.id === activeTabId
                    ? "border-[var(--color-accent)] text-[var(--color-text)] bg-[var(--color-bg)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
                onClick={() => onSelectTab(tab.id)}
              >
                <span className="truncate max-w-[180px]">{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  aria-label="Close tab"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            {active ? (
              <MarkdownContent content={active.content} />
            ) : (
              <div className="p-4 text-[var(--color-text-muted)]">Select a file</div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
          Open a folder or drop one here
        </div>
      )}
    </div>
  );
}
