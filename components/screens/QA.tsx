import { useState } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { AppBar, Panel, Body } from '@/components/Shell';
import { Card, SourceIcon } from '@/components/ui';
import type { QAItem } from '@/lib/types';

const SUGGESTED = ['Does it overheat?', 'Battery after 1 year?', 'Worth upgrading?', 'Good for daily use?'];

export function QA({
  product,
  qa,
  onAsk,
  onBack,
}: {
  product: string;
  qa: QAItem[];
  onAsk?: (question: string) => Promise<QAItem>;
  onBack?: () => void;
}) {
  const [items, setItems] = useState<QAItem[]>(qa);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy || !onAsk) return;
    setDraft('');
    setBusy(true);
    setItems((prev) => [...prev, { question: q, answer: '', citations: [] }]); // optimistic
    const res = await onAsk(q);
    setItems((prev) => {
      const next = [...prev];
      next[next.length - 1] = res;
      return next;
    });
    setBusy(false);
  }

  return (
    <Panel>
      <AppBar title="Ask about this" subtitle={product} onBack={onBack} />
      <Body>
        {items.map((item, i) => {
          const pending = busy && i === items.length - 1 && !item.answer;
          return (
            <div key={i} className="flex flex-col gap-2">
              <div className="self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm font-medium text-white">
                {item.question}
              </div>
              <Card className="self-start">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    {pending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  </span>
                  <p className="text-[13px] leading-relaxed text-ink/85">
                    {pending ? 'Thinking…' : item.answer}
                  </p>
                </div>
                {item.citations.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
                    {item.citations.map((c, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[11px] font-medium text-muted"
                      >
                        <SourceIcon source={c.source} size={11} /> {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          );
        })}

        {!busy && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-full border border-line bg-bg px-3 py-1.5 text-xs font-medium text-ink hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </Body>

      <div className="border-t border-line bg-bg p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 focus-within:border-primary">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(draft)}
            placeholder="Ask anything about this product…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          />
          <button
            onClick={() => ask(draft)}
            disabled={busy || !draft.trim()}
            className="grid h-8 w-8 place-items-center rounded-full bg-primary text-white disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </Panel>
  );
}
