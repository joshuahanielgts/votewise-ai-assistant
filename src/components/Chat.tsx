import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import { Send, Vote, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Role = "user" | "assistant";
interface Message {
  id: string;
  role: Role;
  content: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    // debounce 300ms
    const now = Date.now();
    if (now - lastSendRef.current < 300) return;
    lastSendRef.current = now;

    const userMsg: Message = { id: uuidv4(), role: "user", content: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
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
      toast.error("Hmm, something went wrong. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <section id="chat" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ask VoteWise</h2>
        <p className="mt-2 text-muted-foreground">
          Your AI guide to elections and democracy.
        </p>
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
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft ${
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