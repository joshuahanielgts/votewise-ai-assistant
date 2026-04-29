import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ─────────────────────────────────────────────────────────────────────
type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE    = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const SESSION_KEY = "votewise_session_id";
const TIMEOUT_MS  = 30_000;
const WELCOME_ID  = "welcome";

const WELCOME_MESSAGE: Message = {
  id: WELCOME_ID,
  role: "assistant",
  content:
    "Hi! I'm **VoteWise** 🗳️ Ask me anything about elections, voting timelines, " +
    "voter registration, or how democracy works!",
};

const QUICK_PILLS = [
  "How do I register to vote?",
  "What is the election timeline?",
  "Explain the Electoral College",
  "Who can vote?",
  "How are votes counted?",
  "What is a primary election?",
];

// ── Session ID — FIX #8 ───────────────────────────────────────────────────────
// useRef keeps the value stable across re-renders.
// crypto.randomUUID() replaces the uuidv4 dependency.
// localStorage persists the session across page refreshes.
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, fresh);
  return fresh;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ChatInterface() {
  const { toast } = useToast();

  // FIX #8: useRef so the session ID is created exactly once and never changes
  const sessionRef = useRef<string>(getOrCreateSessionId());
  const sessionId  = sessionRef.current;

  const bottomRef   = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // ── API call — FIX #5, #6, #7 ──────────────────────────────────────────────
  const callApi = async (text: string): Promise<string> => {
    // FIX #5: AbortController with 30-second timeout
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message:    text,
          session_id: sessionId,
          // FIX #6: exclude the static welcome message from history so the
          // first real API call sends history: [] instead of the welcome text
          history: messages
            .filter((m) => m.id !== WELCOME_ID)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      clearTimeout(timeoutId);

      // FIX #7: parse the backend error body and extract `detail` for the toast
      if (!res.ok) {
        let detail = `Request failed (HTTP ${res.status})`;
        try {
          const errData = await res.json();
          if (typeof errData.detail === "string") {
            detail = errData.detail;
          } else if (errData.detail) {
            detail = JSON.stringify(errData.detail);
          }
        } catch {
          // response body wasn't JSON — use the generic message above
        }
        throw new Error(detail);
      }

      const data = (await res.json()) as { reply: string };
      return data.reply ?? "(no response)";

    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("Request timed out after 30 seconds. Please try again.");
      }
      throw err;
    }
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async (text = input.trim()) => {
    if (!text || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await callApi(text);
      const aiMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: reply };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast({
        title:       "Hmm, something went wrong.",
        description: detail,
        variant:     "destructive",
      });
    } finally {
      setLoading(false);
      // Auto-scroll to latest message
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section aria-label="Election education chat" className="flex flex-col h-full">

      {/* Quick topic pills */}
      <div
        role="list"
        aria-label="Quick topic shortcuts"
        className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-border scrollbar-hide"
      >
        {QUICK_PILLS.map((pill) => (
          <button
            key={pill}
            role="listitem"
            onClick={() => handleSend(pill)}
            disabled={loading}
            aria-label={`Ask: ${pill}`}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-border
                       hover:bg-primary hover:text-primary-foreground hover:border-primary
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="flex flex-col gap-4" aria-live="polite" aria-atomic="false">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                aria-hidden="true"
                className={`w-8 h-8 rounded-full flex items-center justify-center
                            text-xs font-medium flex-shrink-0
                            ${msg.role === "assistant"
                              ? "bg-primary text-primary-foreground"
                              : "bg-orange-500 text-white"}`}
              >
                {msg.role === "assistant" ? "V" : "U"}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                            ${msg.role === "assistant"
                              ? "bg-secondary text-secondary-foreground rounded-tl-sm"
                              : "bg-primary text-primary-foreground rounded-tr-sm"}`}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    className="prose prose-sm dark:prose-invert max-w-none
                               [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1
                               [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mt-3
                               [&>h3]:text-sm [&>h3]:font-medium [&>h3]:mt-2"
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3" aria-label="VoteWise is thinking" aria-live="polite">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground
                              flex items-center justify-center text-xs font-medium flex-shrink-0"
                   aria-hidden="true">
                V
              </div>
              <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input row */}
      <div className="flex gap-2 p-4 border-t border-border">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about elections..."
          disabled={loading}
          rows={1}
          aria-label="Ask a question about elections"
          role="textbox"
          aria-multiline="false"
          className="flex-1 resize-none min-h-[40px] max-h-[120px] text-sm"
        />
        <Button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="self-end px-4"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent
                             rounded-full animate-spin" aria-hidden="true" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </Button>
      </div>

    </section>
  );
}

export default ChatInterface;
