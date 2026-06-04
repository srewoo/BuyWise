import { useEffect, useState } from 'react';
import { KeyRound, Cpu, Bell, Telescope, Check, HelpCircle, ExternalLink, ChevronDown, Globe } from 'lucide-react';
import { AppBar, Panel, Body } from '@/components/Shell';
import { Card, Eyebrow } from '@/components/ui';
import { storage, DEFAULT_SETTINGS, type Settings as S } from '@/lib/storage';
import { REGIONS, detectRegion, getRegion } from '@/lib/regions';

const YT_STEPS = [
  <>Open the <b>Google Cloud Console</b> and sign in with any Google account.</>,
  <>Click the project dropdown (top bar) → <b>New Project</b> → name it anything → <b>Create</b>.</>,
  <>Go to <b>APIs &amp; Services → Library</b>, search <b>“YouTube Data API v3”</b>, open it, click <b>Enable</b>.</>,
  <>Open <b>APIs &amp; Services → Credentials</b> → <b>Create credentials</b> → <b>API key</b>.</>,
  <>Copy the key and paste it in the field above. (It’s free — 10,000 units/day ≈ ~90 lookups.)</>,
];

/** Collapsible "how to get a YouTube Data API key" helper. */
function YouTubeKeyHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <HelpCircle size={14} className="text-primary" />
        <span className="flex-1 text-[13px] font-semibold text-ink">How do I get a free key?</span>
        <ChevronDown size={15} className={`text-faint transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-2.5 border-t border-line px-3 pb-3 pt-3">
          <ol className="flex flex-col gap-2.5">
            {YT_STEPS.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-[12px] leading-snug text-ink/85">{step}</span>
              </li>
            ))}
          </ol>
          <a
            href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13px] font-semibold text-white hover:bg-primary-600"
          >
            Open Google Cloud Console <ExternalLink size={14} />
          </a>
          <p className="text-[11px] text-faint">
            No billing or credit card is required for the free YouTube Data API quota.
          </p>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${on ? 'bg-primary' : 'bg-surface-2'}`}
      aria-pressed={on}
    >
      <span className={`h-5 w-5 rounded-full bg-white shadow transition ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

const MODELS = ['gpt-5', 'gpt-5-mini', 'gpt-4.1'];

export function Settings({ onBack }: { onBack?: () => void }) {
  const [s, setS] = useState<S>(DEFAULT_SETTINGS);

  useEffect(() => {
    void storage.getSettings().then(setS);
  }, []);

  const patch = (p: Partial<S>) => {
    setS((prev) => ({ ...prev, ...p }));
    void storage.saveSettings(p);
  };

  return (
    <Panel>
      <AppBar title="Settings" onBack={onBack} />
      <Body>
        {/* API keys */}
        <div className="flex flex-col gap-2">
          <Eyebrow>
            <span className="flex items-center gap-1.5">
              <KeyRound size={12} /> API keys
            </span>
          </Eyebrow>
          <Card pad>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">OpenAI key</p>
              {s.openaiKey ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-buy">
                  <Check size={13} /> Connected
                </span>
              ) : (
                <span className="text-xs font-medium text-skip">Required</span>
              )}
            </div>
            <input
              type="password"
              value={s.openaiKey}
              onChange={(e) => patch({ openaiKey: e.target.value.trim() })}
              placeholder="sk-…"
              className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-primary"
            />
          </Card>
          <Card pad>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">YouTube Data API key</p>
              <span className="text-xs font-medium text-faint">Optional · free</span>
            </div>
            <input
              type="password"
              value={s.youtubeKey}
              onChange={(e) => patch({ youtubeKey: e.target.value.trim() })}
              placeholder="Add to include video reviews…"
              className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-primary"
            />
            <div className="mt-2.5">
              <YouTubeKeyHelp />
            </div>
          </Card>
          <Card pad>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Perplexity key</p>
              <span className="text-xs font-medium text-faint">Optional · paid</span>
            </div>
            <input
              type="password"
              value={s.perplexityKey}
              onChange={(e) => patch({ perplexityKey: e.target.value.trim() })}
              placeholder="pplx-… (extra web research in Deep mode)"
              className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-primary"
            />
          </Card>
          <p className="px-1 text-[11px] text-faint">
            Keys are stored only in your browser and sent directly to each provider. Reddit needs no key,
            and Deep mode uses OpenAI's built-in web search (your OpenAI key) — Perplexity is optional.
          </p>
        </div>

        {/* region */}
        <div className="flex flex-col gap-2">
          <Eyebrow>
            <span className="flex items-center gap-1.5">
              <Globe size={12} /> Region
            </span>
          </Eyebrow>
          <div className="grid grid-cols-2 gap-2">
            {REGIONS.map((r) => {
              const active = (s.region || detectRegion()) === r.code;
              return (
                <button
                  key={r.code}
                  onClick={() => patch({ region: r.code })}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                    active ? 'border-primary bg-primary-soft' : 'border-line bg-bg hover:border-primary/40'
                  }`}
                >
                  <span className="text-lg leading-none">{r.flag}</span>
                  <div className="min-w-0">
                    <p className={`text-[13px] font-semibold ${active ? 'text-primary' : 'text-ink'}`}>{r.name}</p>
                    <p className="truncate text-[11px] text-muted">{r.currency}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="px-1 text-[11px] text-faint">
            Sets currency, retailers and regional sources — currently {getRegion(s.region || detectRegion()).retailers.join(', ')}.
          </p>
        </div>

        {/* model */}
        <div className="flex flex-col gap-2">
          <Eyebrow>
            <span className="flex items-center gap-1.5">
              <Cpu size={12} /> AI model
            </span>
          </Eyebrow>
          <div className="flex gap-2">
            {MODELS.map((m) => (
              <button
                key={m}
                onClick={() => patch({ model: m })}
                className={`flex-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${
                  s.model === m
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-line bg-bg text-muted hover:border-primary/40'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* preferences */}
        <div className="flex flex-col gap-2">
          <Eyebrow>Preferences</Eyebrow>
          <Card pad className="flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-primary">
                <Telescope size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Deep research mode</p>
                <p className="text-xs text-muted">Multi-agent web research · best quality · slower, more tokens</p>
              </div>
            </div>
            <Toggle on={s.deepResearch} onClick={() => patch({ deepResearch: !s.deepResearch })} />
          </Card>
          <Card pad className="flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-primary">
                <Bell size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Price drop alerts</p>
                <p className="text-xs text-muted">Notify on tracked products</p>
              </div>
            </div>
            <Toggle on={s.priceAlerts} onClick={() => patch({ priceAlerts: !s.priceAlerts })} />
          </Card>
        </div>

        {/* free + privacy note */}
        <Card className="border-buy/20 bg-buy-soft/50">
          <p className="text-[13px] text-ink/85">
            <span className="font-semibold text-buy">Free &amp; unlimited.</span> BuyWise runs entirely
            in your browser — no account, no subscription. You only pay your own OpenAI usage.
          </p>
        </Card>
      </Body>
    </Panel>
  );
}
