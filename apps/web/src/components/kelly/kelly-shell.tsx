'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowUp,
  BookOpen,
  GitBranch,
  ListChecks,
  Plus,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useKelly } from '@/providers/kelly-provider';
import { KellyMark } from '@/components/kelly/kelly-mark';
import { cn } from '@/lib/utils/cn';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_ID = 'welcome';

const GIT_PROMPTS = [
  {
    title: 'Push',
    command: 'git push origin HEAD',
    blurb: 'Publish your local commits to the remote branch.',
  },
  {
    title: 'Pull',
    command: 'git pull --rebase origin main',
    blurb: 'Update your branch with the latest remote changes.',
  },
  {
    title: 'Add',
    command: 'git add -A',
    blurb: 'Stage all modified and new files for commit.',
  },
  {
    title: 'Commit',
    command: 'git commit -m "Describe the change"',
    blurb: 'Create a commit with a clear, present-tense message.',
  },
  {
    title: 'Clone',
    command: 'git clone https://github.com/owner/repo.git',
    blurb: 'Download a repository to your machine.',
  },
  {
    title: 'Branch',
    command: 'git checkout -b feature/short-name',
    blurb: 'Create and switch to a new feature branch.',
  },
  {
    title: 'PR',
    command: 'gh pr create --fill',
    blurb: 'Open a pull request from the current branch (GitHub CLI).',
  },
];

const QUICK_ACTIONS = [
  {
    id: 'write',
    label: 'Help me write',
    icon: Sparkles,
    prompt: 'Help me write a clear commit message and PR summary.',
  },
  {
    id: 'git',
    label: 'Git commands',
    icon: GitBranch,
    prompt: 'Show me the common Git commands I should use.',
  },
  { id: 'action', label: 'What needs action', icon: ListChecks, prompt: 'What needs action?' },
  { id: 'smells', label: 'Explain smells', icon: TriangleAlert, prompt: 'What are the smells?' },
  {
    id: 'score',
    label: 'Explain this score',
    icon: BookOpen,
    prompt: 'Explain how we got this score',
  },
] as const;

function renderChatText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    return <span key={i}>{part}</span>;
  });
}

export function KellyShell() {
  const { open, openModal, close, setOpen } = useKelly();
  const chat = useKellyChat(open);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (open) close();
          else openModal();
        }}
        className={cn(
          'group/kelly-fab fixed z-40 inline-flex flex-col items-center gap-1',
          'transition-all duration-300 ease-out',
          'hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]',
          open
            ? 'pointer-events-none translate-y-3 scale-75 opacity-0'
            : 'translate-y-0 scale-100 opacity-100'
        )}
        data-testid="kelly-fab"
        aria-label="Ask Kelly"
      >
        <KellyMark
          size="lg"
          iconClassName="text-slate-100"
          className={cn(
            'border border-white/15 bg-[hsl(217_55%_12%)] text-slate-100 ring-0',
            'shadow-[0_4px_16px_rgba(8,17,31,0.2)]',
            'transition-all duration-300 ease-out',
            'group-hover/kelly-fab:scale-105 group-hover/kelly-fab:border-sky-300/40 group-hover/kelly-fab:bg-white/18',
            'group-hover/kelly-fab:shadow-[0_8px_24px_rgba(8,17,31,0.35)]'
          )}
        />
        <span className="rounded-full border border-white/10 bg-[hsl(217_55%_12%)] px-2.5 py-0.5 text-[12px] font-semibold tracking-tight text-slate-100 shadow-[0_4px_16px_rgba(8,17,31,0.2)]">
          Kelly
        </span>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-[hsl(217_59%_8%/0.45)] backdrop-blur-[2px]',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=open]:duration-300 data-[state=closed]:duration-200'
            )}
          />
          <Dialog.Content
            className={cn(
              'glass fixed left-1/2 top-1/2 z-50 flex h-[min(90vh,720px)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border shadow-md focus:outline-none',
              'max-sm:h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-none',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
              'data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-2',
              'data-[state=open]:duration-300 data-[state=closed]:duration-200'
            )}
            aria-describedby="kelly-modal-description"
            data-testid="kelly-modal"
          >
            <header className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <KellyMark size="md" />
                <div>
                  <Dialog.Title className="text-base font-semibold text-foreground">
                    Kelly
                  </Dialog.Title>
                  <Dialog.Description
                    id="kelly-modal-description"
                    className="text-sm text-muted-foreground"
                  >
                    Quality assessment assistant
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close Ask AI"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </header>

            <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
              {!chat.hasConversation ? (
                <div className="flex flex-1 flex-col items-center justify-center">
                  <h1 className="mb-7 text-center text-[1.75rem] font-semibold tracking-tight text-foreground">
                    How can I help you?
                  </h1>
                  <Composer chat={chat} placeholder="Ask anything..." />
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {QUICK_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => chat.replyTo(action.prompt)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <MessageList chat={chat} />
                  <div className="pt-3">
                    <Composer chat={chat} placeholder="Ask anything..." compact />
                  </div>
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function useKellyChat(active: boolean) {
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: WELCOME_ID,
      role: 'assistant',
      content:
        'Hi, I’m Kelly. Pick a prompt from the gallery or ask about scores, smells, and next actions across your projects.',
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasConversation = messages.some((m) => m.id !== WELCOME_ID);

  const assessHints = useMemo(
    () =>
      [
        'Open Projects and use Assessment (i) on a scored repo for detailed recommendations.',
        'Smells and modules counts on each project row show where debt concentrates.',
        'Switch branches from the branch pill, then re-scan to refresh scores.',
      ].join(' '),
    []
  );

  useEffect(() => {
    if (active) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      const id = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [active, messages, typing]);

  useEffect(() => {
    if (!active) setShowMore(false);
  }, [active]);

  function replyTo(question: string) {
    setShowMore(false);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: question }]);
    setTyping(true);
    const lower = question.toLowerCase();
    let answer: string;
    if (/last commit|who did/.test(lower)) {
      answer =
        'Hover Collaborators / Contributors on a project row, or open the repo on GitHub. I can also use live GitHub meta once you expand Languages or people chips — last commit author is included there when available.';
    } else if (/smell/.test(lower)) {
      answer =
        'Architecture smells appear on each project row and in repo Overview. Open Glossary → Smells for rule definitions, or click Assessment (i) for prioritized fixes.';
    } else if (/score|explain/.test(lower)) {
      answer =
        'Scores combine complexity, duplication, coupling, cohesion, and smells. Click the (i) icon on a project for a full breakdown of why that score landed where it did.';
    } else if (/action|needs|fix|priority/.test(lower)) {
      answer = `Start with the lowest-scoring project, then clear high-severity smells and dependency cycles. ${assessHints}`;
    } else if (/push|pull|add|commit|clone|branch|pr|git/.test(lower)) {
      const hit = GIT_PROMPTS.find((p) => lower.includes(p.title.toLowerCase()));
      answer = hit
        ? `**${hit.title}** — ${hit.blurb}\n\`${hit.command}\``
        : 'Here are common Git commands you can copy:\n' +
          GIT_PROMPTS.map((p) => `• **${p.title}** — \`${p.command}\``).join('\n');
    } else {
      answer = `I can help with Git commands and assessment guidance. ${assessHints}`;
    }
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: answer },
      ]);
      setTyping(false);
    }, 350);
  }

  function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    const q = input.trim();
    if (!q || typing) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    replyTo(q);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  function resizeTextarea() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return {
    input,
    setInput,
    typing,
    showMore,
    setShowMore,
    messages,
    hasConversation,
    bottomRef,
    inputRef,
    replyTo,
    onSubmit,
    onKeyDown,
    resizeTextarea,
  };
}

type ChatState = ReturnType<typeof useKellyChat>;

function MessageList({ chat, compact = false }: { chat: ChatState; compact?: boolean }) {
  const visible = chat.hasConversation
    ? chat.messages.filter((m) => m.id !== WELCOME_ID)
    : chat.messages;

  return (
    <div className={cn('min-h-0 flex-1 space-y-3 overflow-y-auto', compact ? 'px-4 py-3' : 'py-2')}>
      {visible.map((m) => (
        <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
          {m.role === 'assistant' ? (
            <div className={cn('flex gap-2.5', compact ? 'max-w-[94%]' : 'max-w-[92%]')}>
              {!compact ? <KellyMark size="sm" className="mt-0.5 shadow-2xs" /> : null}
              <div
                className={cn(
                  'whitespace-pre-wrap border border-border bg-muted/50 leading-relaxed text-foreground',
                  compact
                    ? 'rounded-xl rounded-tl-sm px-3.5 py-2 text-[15px]'
                    : 'rounded-2xl rounded-tl-sm px-4 py-3 text-[15px]'
                )}
              >
                {renderChatText(m.content)}
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'whitespace-pre-wrap bg-primary text-primary-foreground',
                compact
                  ? 'max-w-[88%] rounded-xl rounded-tr-sm px-3.5 py-2 text-[15px]'
                  : 'max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-[15px]'
              )}
            >
              {renderChatText(m.content)}
            </div>
          )}
        </div>
      ))}
      {chat.typing ? (
        <div className="text-sm font-medium text-muted-foreground" role="status">
          Kelly is thinking…
        </div>
      ) : null}
      <div ref={chat.bottomRef} />
    </div>
  );
}

function Composer({
  chat,
  placeholder,
  compact = false,
}: {
  chat: ChatState;
  placeholder: string;
  compact?: boolean;
}) {
  return (
    <form onSubmit={chat.onSubmit} className="relative w-full">
      <div
        className={cn(
          'border border-border bg-card transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20',
          compact ? 'rounded-xl' : 'rounded-2xl'
        )}
      >
        <textarea
          ref={chat.inputRef}
          value={chat.input}
          onChange={(e) => {
            chat.setInput(e.target.value);
            chat.resizeTextarea();
          }}
          onKeyDown={chat.onKeyDown}
          placeholder={placeholder}
          rows={1}
          aria-label="Ask Kelly"
          className={cn(
            'w-full resize-none bg-transparent text-foreground outline-none placeholder:text-muted-foreground',
            compact ? 'min-h-[44px] px-3.5 pt-3 text-sm' : 'min-h-[54px] px-5 pt-4 text-sm'
          )}
        />
        <div
          className={cn(
            'flex items-center justify-between',
            compact ? 'px-2.5 pb-2.5' : 'px-3 pb-3'
          )}
        >
          <button
            type="button"
            onClick={() => chat.setShowMore((v) => !v)}
            className={cn(
              'inline-flex items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              compact ? 'h-8 w-8' : 'h-9 w-9',
              chat.showMore && 'bg-muted text-foreground'
            )}
            aria-label="More prompts"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="submit"
            disabled={!chat.input.trim() || chat.typing}
            className={cn(
              'inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
              compact ? 'h-8 w-8' : 'h-9 w-9'
            )}
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      {chat.showMore ? (
        <div className="absolute bottom-[calc(100%+10px)] left-0 z-20 w-full max-w-sm rounded-lg border border-border bg-card p-2 shadow-md">
          <p className="px-2.5 pb-1.5 pt-1 text-sm font-semibold text-muted-foreground">
            Suggested prompts
          </p>
          {GIT_PROMPTS.map((p) => (
            <button
              key={p.title}
              type="button"
              onClick={() => chat.replyTo(p.title)}
              className="flex w-full flex-col rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-sm font-semibold text-foreground">{p.title}</span>
              <span className="text-sm text-muted-foreground">{p.blurb}</span>
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
