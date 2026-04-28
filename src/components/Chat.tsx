import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import { Send, Vote, User, RefreshCw, Copy, Check, FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Role = "user" | "assistant";
interface Message {
  id: string;
  role: Role;
  content: string;
  failed?: boolean;
}

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
  const sessionId = useMemo(() => uuidv4(), []);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm **VoteWise**. Ask me anything about elections, voting timelines, or how democracy works! 🗳️",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string, opts?: { isRetry?: boolean }) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const now = Date.now();
    if (now - lastSendRef.current < 300) return;
    lastSendRef.current = now;

    if (!opts?.isRetry) {
      const userMsg: Message = { id: uuidv4(), role: "user", content: trimmed };
      setMessages((m) => [...m, userMsg]);
      setInput("");
    }
    setLastFailed(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, session_id: sessionId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { reply: string };
      setMessages((m) => [
        ...m,
        { id: uuidv4(), role: "assistant", content: data.reply ?? "(no response)" },
      ]);
    } catch (err) {
      console.error(err);
      setLastFailed(trimmed);
      toast.error("Hmm, something went wrong. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  const retryLast = () => {
    if (lastFailed) sendMessage(lastFailed, { isRetry: true });
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
      doc.text(`Session: ${sessionId.slice(0, 8)}…`, pageW - margin, 54, { align: "right" });

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
        doc.text(label, margin, y);
        y += 14;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(35, 35, 45);
        // Strip markdown for cleaner PDF
        const plain = m.content
          .replace(/[*_`>#-]+/g, "")
          .replace(/\n{2,}/g, "\n\n")
          .trim();
        const lines = doc.splitTextToSize(plain, contentW);
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
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportPdf}
            disabled={messages.length <= 1}
            aria-label="Export chat history as PDF"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export as PDF
          </Button>
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
              <MessageBubble key={m.id} message={m} />
            ))}
            {loading && <TypingIndicator />}
            {lastFailed && !loading && (
              <div className="flex animate-fade-up justify-center">
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
          className="flex items-center gap-2 border-t border-border/60 bg-card p-3 sm:p-4"
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

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Answer copied");
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
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Copy answer to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy answer
              </>
            )}
          </button>
        )}
      </div>
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