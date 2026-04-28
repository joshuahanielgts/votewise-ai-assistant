import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import {
  Send, Vote, User, RefreshCw, Copy, Check, FileDown,
  Settings2, Pencil, Sparkles, X,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Role = "user" | "assistant";
interface Message {
  id: string;
  role: Role;
  content: string;
  /** id of the user message that produced this assistant reply (for regenerate) */
  promptId?: string;
  createdAt: number;
  failed?: boolean;
}

interface PdfOptions {
  includeSessionId: boolean;
  includeTimestamps: boolean;
  keepMarkdown: boolean;
}

const STORAGE_KEY = "votewise:chat";
const SESSION_KEY = "votewise:session_id";

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to **VoteWise**. I'm here to help you navigate the democratic process with clarity and confidence. What would you like to explore today? 🗳️",
  createdAt: Date.now(),
};

const QUICK_PROMPTS = [
  "How do I register to vote?",
  "What is the election timeline?",
  "Explain Electoral College",
  "Who can vote?",
  "How are votes counted?",
  "What is a primary election?",
];

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

export function Chat() {
  // Persistent session id so reloads restore the same conversation
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return uuidv4();
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = uuidv4();
    window.localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  }, []);

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [WELCOME];
    try {
      const raw = window.localStorage.getItem(`${STORAGE_KEY}:${sessionId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [WELCOME];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [copyWithNotes, setCopyWithNotes] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfOpts, setPdfOpts] = useState<PdfOptions>({
    includeSessionId: true,
    includeTimestamps: true,
    keepMarkdown: false,
  });
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Persist chat history to localStorage scoped by session_id
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        `${STORAGE_KEY}:${sessionId}`,
        JSON.stringify(messages),
      );
    } catch {
      /* ignore quota */
    }
  }, [messages, sessionId]);

  const clearHistory = () => {
    setMessages([WELCOME]);
    setLastFailed(null);
    setEditing(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`${STORAGE_KEY}:${sessionId}`);
    }
    toast.success("Chat history cleared");
  };

  const callApi = async (text: string): Promise<string> => {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        session_id: sessionId,
        history: messages.map(m => ({ role: m.role, content: m.content }))
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { reply: string };
    return data.reply ?? "(no response)";
  };

  const sendMessage = async (text: string, opts?: { isRetry?: boolean }) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const now = Date.now();
    if (now - lastSendRef.current < 300) return;
    lastSendRef.current = now;

    let promptId: string;
    if (opts?.isRetry) {
      // Re-use the most recent user message id if available
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      promptId = lastUser?.id ?? uuidv4();
    } else {
      promptId = uuidv4();
      const userMsg: Message = {
        id: promptId, role: "user", content: trimmed, createdAt: Date.now(),
      };
      setMessages((m) => [...m, userMsg]);
      setInput("");
    }
    setLastFailed(null);
    setEditing(false);
    setLoading(true);

    try {
      const reply = await callApi(trimmed);
      setMessages((m) => [
        ...m,
        { id: uuidv4(), role: "assistant", content: reply, promptId, createdAt: Date.now() },
      ]);
    } catch (err) {
      console.error(err);
      setLastFailed(trimmed);
      setEditDraft(trimmed);
      toast.error("I'm having trouble connecting right now. Please ensure the backend server is running and try again!");
    } finally {
      setLoading(false);
    }
  };

  const retryLast = () => {
    if (lastFailed) sendMessage(lastFailed, { isRetry: true });
  };

  const startEditLast = () => {
    const text = lastFailed ??
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    setEditDraft(text);
    setEditing(true);
  };

  const submitEdit = () => {
    const text = editDraft.trim();
    if (!text) return;
    // If editing a failed-send: don't append a new user bubble, replace the failed prompt
    if (lastFailed) {
      setMessages((m) => {
        const copy = [...m];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].role === "user") {
            copy[i] = { ...copy[i], content: text };
            break;
          }
        }
        return copy;
      });
      setLastFailed(null);
      setEditing(false);
      sendMessage(text, { isRetry: true });
    } else {
      // Editing the previous successful prompt → behave like a brand new send
      setEditing(false);
      sendMessage(text);
    }
  };

  const regenerate = async (assistantId: string) => {
    if (loading) return;
    const idx = messages.findIndex((m) => m.id === assistantId);
    if (idx === -1) return;
    const target = messages[idx];
    // Find the prompt that produced this answer
    let prompt = "";
    if (target.promptId) {
      prompt = messages.find((m) => m.id === target.promptId)?.content ?? "";
    }
    if (!prompt) {
      // fall back: nearest preceding user message
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === "user") { prompt = messages[i].content; break; }
      }
    }
    if (!prompt) {
      toast.error("No prompt found to regenerate from");
      return;
    }
    setRegeneratingId(assistantId);
    setLoading(true);
    try {
      const reply = await callApi(prompt);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: reply, createdAt: Date.now() }
            : msg,
        ),
      );
      toast.success("Regenerated answer");
    } catch (e) {
      console.error(e);
      toast.error("Could not regenerate. Please try again!");
    } finally {
      setLoading(false);
      setRegeneratingId(null);
    }
  };

  const exportPdf = () => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      const contentW = pageW - margin * 2;

      // Header band
      doc.setFillColor(26, 54, 93); // VoteWise deep blue
      doc.rect(0, 0, pageW, 70, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("VoteWise", margin, 35);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Understand Your Vote. Shape Your Future.", margin, 54);
      doc.setFontSize(9);
      const dateStr = new Date().toLocaleString();
      doc.text(`Exported: ${dateStr}`, pageW - margin, 35, { align: "right" });
      if (pdfOpts.includeSessionId) {
        doc.text(`Session: ${sessionId.slice(0, 8)}…`, pageW - margin, 54, { align: "right" });
      }

      let y = 100;
      doc.setTextColor(20, 20, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Chat transcript", margin, y);
      y += 18;
      doc.setDrawColor(220, 220, 230);
      doc.line(margin, y, pageW - margin, y);
      y += 18;

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - 60) {
          doc.addPage();
          y = margin;
        }
      };

      messages.forEach((m) => {
        const label = m.role === "user" ? "You" : "VoteWise";
        const color: [number, number, number] =
          m.role === "user" ? [230, 126, 34] : [26, 54, 93];
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...color);
        ensureSpace(18);
        const headerLine = pdfOpts.includeTimestamps
          ? `${label}  ·  ${new Date(m.createdAt).toLocaleString()}`
          : label;
        doc.text(headerLine, margin, y);
        y += 14;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(35, 35, 45);
        const text = pdfOpts.keepMarkdown
          ? m.content
          : m.content.replace(/[*_`>#]+/g, "").replace(/\n{2,}/g, "\n\n").trim();
        const lines = doc.splitTextToSize(text, contentW);
        lines.forEach((line: string) => {
          ensureSpace(14);
          doc.text(line, margin, y);
          y += 14;
        });
        y += 10;
      });

      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 150);
        doc.text(
          `VoteWise — Educational use only • Page ${i} of ${pageCount}`,
          pageW / 2,
          pageH - 24,
          { align: "center" }
        );
      }

      doc.save(`votewise-chat-${Date.now()}.pdf`);
      toast.success("Chat exported as PDF");
      setPdfOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Could not export PDF");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <section id="chat" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <Badge variant="secondary" className="mb-3">AI Assistant</Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ask VoteWise</h2>
        <p className="mt-2 text-muted-foreground">
          Your AI guide to elections and democracy.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={messages.length <= 1}
                aria-label="Customize and export chat as PDF"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export as PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" /> Customize PDF
                </DialogTitle>
                <DialogDescription>
                  Choose what to include before exporting your VoteWise transcript.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <ToggleRow
                  id="opt-session"
                  label="Include session ID"
                  hint="Show a short session identifier in the PDF header."
                  checked={pdfOpts.includeSessionId}
                  onChange={(v) => setPdfOpts((o) => ({ ...o, includeSessionId: v }))}
                />
                <ToggleRow
                  id="opt-time"
                  label="Include timestamps"
                  hint="Add a date/time next to each message."
                  checked={pdfOpts.includeTimestamps}
                  onChange={(v) => setPdfOpts((o) => ({ ...o, includeTimestamps: v }))}
                />
                <ToggleRow
                  id="opt-md"
                  label="Keep markdown formatting"
                  hint="Preserve characters like **bold** and lists as-is."
                  checked={pdfOpts.keepMarkdown}
                  onChange={(v) => setPdfOpts((o) => ({ ...o, keepMarkdown: v }))}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPdfOpen(false)}>Cancel</Button>
                <Button onClick={exportPdf}>
                  <FileDown className="mr-2 h-4 w-4" /> Export
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
            <Switch
              id="copy-notes"
              checked={copyWithNotes}
              onCheckedChange={setCopyWithNotes}
              aria-label="Toggle copying with sources and notes"
            />
            <Label htmlFor="copy-notes" className="cursor-pointer text-xs">
              Copy with sources / notes
            </Label>
          </div>

          {messages.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              aria-label="Clear saved chat history"
            >
              <X className="mr-2 h-4 w-4" />
              Clear history
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden border-border/60 shadow-elegant">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="h-[480px] overflow-y-auto bg-muted/30 px-4 py-6 sm:px-6"
          role="log"
          aria-live="polite"
          aria-label="Chat conversation"
        >
          <div className="space-y-4">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                copyWithNotes={copyWithNotes}
                onRegenerate={m.role === "assistant" && m.id !== "welcome" ? () => regenerate(m.id) : undefined}
                regenerating={regeneratingId === m.id}
                disabled={loading}
              />
            ))}
            {loading && <TypingIndicator />}
            {lastFailed && !loading && !editing && (
              <div className="flex animate-fade-up flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={retryLast}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Retry sending last message"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry last message
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startEditLast}
                  aria-label="Edit last message before resending"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit & resend
                </Button>
              </div>
            )}
            {editing && (
              <div className="animate-fade-up rounded-xl border border-border/60 bg-card p-3 shadow-soft">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit your message
                </div>
                <Textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={3}
                  aria-label="Edit your message before resending"
                  className="text-sm"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={submitEdit}
                    disabled={!editDraft.trim() || loading}
                  >
                    <Send className="mr-2 h-3.5 w-3.5" /> Resend
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick prompts */}
        <div className="border-t border-border/60 bg-card px-4 pt-4 sm:px-6">
          <div
            className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:thin]"
            role="group"
            aria-label="Quick topic suggestions"
          >
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => sendMessage(p)}
                disabled={loading}
                className="shrink-0 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                aria-label={`Ask: ${p}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-border/60 glass-morphism p-3 sm:p-4"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about voting, elections, or democracy..."
            role="textbox"
            aria-label="Ask a question"
            className="flex-1 rounded-md border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={loading}
          />
          <Button
            type="submit"
            variant="accent"
            size="icon"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </section>
  );
}

function MessageBubble({
  message,
  copyWithNotes,
  onRegenerate,
  regenerating,
  disabled,
}: {
  message: Message;
  copyWithNotes?: boolean;
  onRegenerate?: () => void;
  regenerating?: boolean;
  disabled?: boolean;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      let payload = message.content;
      if (copyWithNotes) {
        payload =
          `${message.content}\n\n` +
          `---\n` +
          `Sources / Notes:\n` +
          `- Generated by VoteWise AI assistant on ${new Date(message.createdAt).toLocaleString()}.\n` +
          `- Educational content — verify with your local election authority.\n` +
          `- No official sources cited; treat as a starting point for your own research.`;
      }
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success(copyWithNotes ? "Answer + notes copied" : "Answer copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div
      className={`flex animate-fade-up items-start gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-accent text-accent-foreground"
            : "bg-gradient-hero text-primary-foreground"
        }`}
        aria-hidden
      >
        {isUser ? <User className="h-4 w-4" /> : <Vote className="h-4 w-4" />}
      </div>
      <div className={`flex max-w-[78%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft ${
            isUser
              ? "rounded-tr-sm bg-accent text-accent-foreground"
              : "rounded-tl-sm bg-card text-card-foreground border border-border/60"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Copy answer to clipboard"
            >
              {copied ? (
                <><Check className="h-3 w-3" /> Copied</>
              ) : (
                <><Copy className="h-3 w-3" /> {copyWithNotes ? "Copy + notes" : "Copy answer"}</>
              )}
            </button>
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={disabled}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                aria-label="Regenerate this answer"
              >
                <Sparkles className={`h-3 w-3 ${regenerating ? "animate-pulse" : ""}`} />
                {regenerating ? "Regenerating…" : "Regenerate"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  id, label, hint, checked, onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-muted/30 p-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex animate-fade-up items-start gap-3" aria-label="VoteWise is typing">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground"
        aria-hidden
      >
        <Vote className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-card px-4 py-3 shadow-soft">
        <div className="flex items-center gap-1">
          <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
          <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
          <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}