'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Send, Sparkles, X, Minimize2, Command, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { answerDashboardChat, type DashboardRepoSnapshot } from '@/lib/assessment/recommendations';
import { cn } from '@/lib/utils/cn';

interface DashboardChatBarProps {
  repos: DashboardRepoSnapshot[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Which repo needs attention?',
  'Compare my scores',
  'What smells should I fix?',
  'What can you help with?',
];

const PLACEHOLDERS = [
  'Ask about architecture scores…',
  'Which repo needs attention?',
  'What smells should I fix first?',
  'Compare quality across repos…',
];

export function DashboardChatBar({ repos }: DashboardChatBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi — I’m your Architecture Assessment assistant. Ask about scores, smells, or which repo to improve next.',
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  const scoredCount = useMemo(() => repos.filter((r) => r.overall !== null).length, [repos]);
  const canSend = Boolean(input.trim()) && !typing;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (expanded) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [expanded, messages, typing]);

  useEffect(() => {
    if (expanded || input.length > 0) return;
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [expanded, input.length]);

  function pushReply(question: string) {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);
    const reply = answerDashboardChat(question, repos);
    window.setTimeout(
      () => {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: reply,
          },
        ]);
        setTyping(false);
      },
      450 + Math.min(800, question.length * 12)
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || typing) return;
    setInput('');
    setExpanded(true);
    pushReply(q);
  }

  const chat = (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-5 md:pl-64"
      data-testid="dashboard-chat-bar"
    >
      <div
        className={cn(
          'pointer-events-auto relative w-full max-w-3xl transition-[max-height] duration-500 ease-out',
          expanded ? 'max-h-[min(36rem,78vh)]' : 'max-h-[9.5rem]'
        )}
      >
        {/* Animated gradient aura */}
        <div
          className={cn(
            'pointer-events-none absolute -inset-[1px] rounded-[1.45rem] transition-opacity duration-700',
            focused || expanded || typing ? 'opacity-70' : 'opacity-40'
          )}
          aria-hidden
        >
          <div
            className="chat-border-glow absolute inset-0 rounded-[1.45rem]"
            style={{
              background:
                'linear-gradient(120deg, hsl(var(--ai) / 0.35), hsl(222 24% 14% / 0.08), hsl(var(--ai-bright) / 0.4), hsl(var(--ai) / 0.2))',
              backgroundSize: '200% 200%',
              animation: 'chat-shimmer 12s linear infinite',
            }}
          />
        </div>

        <div
          className={cn(
            'relative overflow-hidden rounded-[1.35rem] border border-border/60 bg-card/95 shadow-xl shadow-ai/5 backdrop-blur-2xl transition-shadow duration-700',
            (focused || expanded) && 'shadow-lg shadow-ai/10'
          )}
        >
          {/* Soft ambient blobs */}
          <div
            className="pointer-events-none absolute -left-10 top-0 h-28 w-28 rounded-full bg-ai/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-ai-bright/10 blur-3xl"
            aria-hidden
          />

          {expanded ? (
            <div className="relative flex h-[min(27rem,64vh)] flex-col">
              <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-ai/10 via-transparent to-ai/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="chat-orbit-ring absolute -inset-1 rounded-xl border border-dashed border-ai/35" />
                    <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ai to-ai-bright text-white shadow-lg shadow-ai/30">
                      <Sparkles className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="leading-tight">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      Assessment assistant
                      {typing ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ai/15 px-2 py-0.5 text-[10px] font-medium text-ai">
                          <Zap className="h-2.5 w-2.5" />
                          Thinking…
                        </span>
                      ) : (
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-ai ai-pulse" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {scoredCount}/{repos.length} scored · live quality Q&A
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 transition hover:scale-105 hover:bg-ai/10 hover:text-ai"
                    onClick={() => setExpanded(false)}
                    aria-label="Minimize chat"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 transition hover:scale-105 hover:bg-ai/10 hover:text-ai"
                    onClick={() => {
                      setExpanded(false);
                      setMessages([
                        {
                          id: 'welcome',
                          role: 'assistant',
                          content:
                            'Hi — I’m your Architecture Assessment assistant. Ask about scores, smells, or which repo to improve next.',
                        },
                      ]);
                    }}
                    aria-label="Close chat"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-muted/30 via-card to-card px-4 py-3">
                {messages.map((m, i) => (
                  <div
                    key={m.id}
                    className={cn(
                      'chat-msg-in flex',
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                    style={{ animationDelay: `${Math.min(i, 6) * 30}ms` }}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        m.role === 'user'
                          ? 'rounded-br-md bg-foreground text-background shadow-sm'
                          : 'rounded-bl-md border border-ai/15 bg-card text-foreground shadow-sm'
                      )}
                    >
                      {m.role === 'assistant' ? (
                        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ai">
                          <Bot className="h-3 w-3" />
                          Assistant
                        </div>
                      ) : null}
                      {renderLightMarkdown(m.content)}
                    </div>
                  </div>
                ))}
                {typing ? (
                  <div className="chat-msg-in flex justify-start">
                    <div className="flex items-end gap-1 rounded-2xl border border-ai/20 bg-ai/5 px-4 py-3">
                      {[0, 1, 2, 3].map((n) => (
                        <span
                          key={n}
                          className="chat-wave-bar w-1 rounded-full bg-ai"
                          style={{ animationDelay: `${n * 120}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>

              <div className="flex flex-wrap gap-1.5 border-t border-border/60 bg-card/90 px-3 py-2.5">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    disabled={typing}
                    onClick={() => {
                      setExpanded(true);
                      pushReply(s);
                    }}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors duration-300 hover:border-ai/30 hover:bg-ai/8 hover:text-ai disabled:opacity-50"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="relative px-3.5 py-3">
            {!expanded ? (
              <div className="mb-2.5 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex h-7 w-7 items-center justify-center">
                    <span className="absolute inset-0 rounded-lg bg-ai/25 blur-md ai-pulse" />
                    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-ai to-ai-bright text-white shadow-md shadow-ai/30">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    Ask Archlens
                  </span>
                  <span className="chat-shimmer-text hidden text-[11px] font-medium sm:inline">
                    AI quality assistant
                  </span>
                </div>
                <span className="hidden items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
                  <Command className="h-3 w-3" />
                  Enter
                </span>
              </div>
            ) : null}

            <div
              className={cn(
                'group/composer relative flex items-center gap-2.5 rounded-2xl border bg-background/90 p-1.5 transition-all duration-300',
                focused
                  ? 'border-ai/50 shadow-[0_0_0_4px_hsl(var(--ai)/0.12)]'
                  : 'border-border/80 shadow-inner hover:border-ai/30'
              )}
            >
              <button
                type="button"
                className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ai to-ai-bright text-white shadow-md shadow-ai/20 transition duration-500 hover:brightness-105 active:scale-[0.98]"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? 'Minimize chat' : 'Open chat'}
              >
                <span className="chat-orbit-ring pointer-events-none absolute -inset-1 rounded-xl border border-dashed border-ai/25 opacity-50" />
                <Bot className="relative h-5 w-5" />
                {!expanded ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-ai-bright/90 ring-2 ring-card ai-pulse" />
                  </span>
                ) : null}
              </button>

              <div className="relative min-w-0 flex-1">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => {
                    setFocused(true);
                    setExpanded(true);
                  }}
                  onBlur={() => setFocused(false)}
                  placeholder={PLACEHOLDERS[placeholderIdx]}
                  className="h-11 w-full bg-transparent px-2 text-sm outline-none transition placeholder:text-muted-foreground/70"
                  data-testid="dashboard-chat-input"
                />
              </div>

              <Button
                type="submit"
                size="icon"
                className={cn(
                  'h-11 w-11 shrink-0 rounded-xl transition-all duration-500',
                  canSend
                    ? 'bg-gradient-to-br from-ai to-ai-bright text-white shadow-sm shadow-ai/20 hover:brightness-105'
                    : 'bg-muted text-muted-foreground opacity-55'
                )}
                disabled={!canSend}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {!expanded ? (
              <div className="mt-2.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    disabled={typing}
                    onClick={() => {
                      setExpanded(true);
                      pushReply(s);
                    }}
                    className="shrink-0 rounded-full border border-border/80 bg-muted/25 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors duration-300 hover:border-ai/30 hover:bg-ai/8 hover:text-ai disabled:opacity-50"
                    style={{ animationDelay: `${60 + i * 40}ms` }}
                  >
                    <span className="mr-1 inline-block text-ai/60">✦</span>
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(chat, document.body);
}

function renderLightMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
