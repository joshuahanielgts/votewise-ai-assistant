"use client";

import { useEffect, useRef, useCallback, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
    ImageIcon,
    FileUp,
    Figma,
    MonitorIcon,
    ArrowUpIcon,
    PlusIcon,
    SendIcon,
    XIcon,
    LoaderIcon,
    Command,
    Vote,
    ScrollText,
    HelpCircle,
    UserCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Analytics } from "@/lib/analytics";
import { saveMessage, loadSessionHistory } from "@/lib/firebase";

// ── Types ─────────────────────────────────────────────────────────────────────
type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
}

interface CommandSuggestion {
    icon: React.ReactNode;
    label: string;
    description: string;
    prefix: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE         = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const SESSION_KEY      = "votewise_session_id";
const TIMEOUT_MS       = 30_000;
const SCROLL_DELAY_MS  = 50;
const WELCOME_ID       = "welcome";

const WELCOME_MESSAGE: Message = {
  id: WELCOME_ID,
  role: "assistant",
  content: "Hi! I'm **VoteWise** 🗳️ Ask me anything about Indian elections, voter registration, or how democracy works!",
};

const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
    { icon: <PlusIcon className="w-4 h-4" />, label: "Register", description: "How to register as a new voter", prefix: "/register" },
    { icon: <ScrollText className="w-4 h-4" />, label: "EPIC Card", description: "What is EPIC (Voter ID card)?", prefix: "/epic" },
    { icon: <MonitorIcon className="w-4 h-4" />, label: "EVMs", description: "How do EVMs and VVPATs work?", prefix: "/evm" },
    { icon: <HelpCircle className="w-4 h-4" />, label: "NRI Voting", description: "How to apply for NRI voting?", prefix: "/nri" },
];

// ── Utils ─────────────────────────────────────────────────────────────────────
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, fresh);
  return fresh;
}

// ── Components ────────────────────────────────────────────────────────────────

function TypingDots() {
    return (
        <div className="flex items-center ml-1">
            {[1, 2, 3].map((dot) => (
                <motion.div
                    key={dot}
                    className="w-1.5 h-1.5 bg-violet-400 rounded-full mx-0.5"
                    initial={{ opacity: 0.3 }}
                    animate={{ 
                        opacity: [0.3, 0.9, 0.3],
                        scale: [0.85, 1.1, 0.85]
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: dot * 0.15,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}

export function Chat() {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [value, setValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [inputFocused, setInputFocused] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    
    const sessionRef = useRef<string>(getOrCreateSessionId());
    const sessionId  = sessionRef.current;
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const commandPaletteRef = useRef<HTMLDivElement>(null);

    // Load chat history from Firestore on mount
    useEffect(() => {
        loadSessionHistory(sessionId).then((history) => {
            if (history.length > 0) {
                const restored = history.map((msg) => ({
                    id: msg.id ?? crypto.randomUUID(),
                    role: msg.role,
                    content: msg.content,
                }));
                setMessages([WELCOME_MESSAGE, ...restored]);
            }
        });
    }, [sessionId]);

    // Auto-resize logic
    const adjustHeight = useCallback((reset?: boolean) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "60px";
        if (reset) return;
        const newHeight = Math.max(60, Math.min(textarea.scrollHeight, 200));
        textarea.style.height = `${newHeight}px`;
    }, []);

    // API Logic
    const callApi = async (text: string): Promise<string> => {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    message: text,
                    session_id: sessionId,
                    history: messages
                        .filter((m) => m.id !== WELCOME_ID)
                        .map((m) => ({ role: m.role, content: m.content })),
                }),
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Request failed (HTTP ${res.status})`);
            }
            const data = await res.json();
            return data.reply;
        } catch (err: any) {
            clearTimeout(timeoutId);
            throw err;
        }
    };

    const handleSendMessage = async (text = value.trim()) => {
        if (!text || loading) return;

        const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
        setMessages(prev => [...prev, userMsg]);
        setValue("");
        setLoading(true);
        adjustHeight(true);

        // Track & persist user message
        Analytics.chatMessageSent(text.length);
        saveMessage(sessionId, "user", text);

        try {
            const reply = await callApi(text);
            const aiMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: reply };
            setMessages(prev => [...prev, aiMsg]);

            // Track & persist AI response
            Analytics.aiResponseReceived(reply.length, true);
            saveMessage(sessionId, "assistant", reply);
        } catch (err: any) {
            toast.error("Error", { description: err.message });
            Analytics.apiError(err.message || "Unknown error");
        } finally {
            setLoading(false);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), SCROLL_DELAY_MS);
        }
    };

    // Events
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        if (value.startsWith('/') && !value.includes(' ')) {
            setShowCommandPalette(true);
            const idx = COMMAND_SUGGESTIONS.findIndex(cmd => cmd.prefix.startsWith(value));
            setActiveSuggestion(idx);
        } else {
            setShowCommandPalette(false);
        }
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showCommandPalette) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestion(prev => (prev < COMMAND_SUGGESTIONS.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestion(prev => (prev > 0 ? prev - 1 : COMMAND_SUGGESTIONS.length - 1));
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                if (activeSuggestion >= 0) {
                    const cmd = COMMAND_SUGGESTIONS[activeSuggestion];
                    handleSendMessage(cmd.description);
                    setShowCommandPalette(false);
                }
            } else if (e.key === 'Escape') {
                setShowCommandPalette(false);
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-transparent relative overflow-hidden text-foreground">
            {/* Animated Blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-20">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px] animate-pulse delay-700" />
            </div>

            {/* Header Area (Only shown when no messages or just welcome) */}
            <AnimatePresence>
                {messages.length <= 1 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center justify-center pt-20 pb-10 space-y-4"
                    >
                        <h1 className="text-3xl font-bold tracking-tight text-center">
                            How can <span className="text-violet-500">VoteWise</span> help?
                        </h1>
                        <p className="text-muted-foreground text-center max-w-md">
                            Ask about voter registration, election dates, or how to vote in India.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat History */}
            <ScrollArea 
                className="flex-1 w-full max-w-3xl mx-auto px-4 py-6"
                aria-live="polite"
                aria-label="Chat messages"
            >
                <div className="space-y-6">
                    {messages.map((msg, i) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4 }}
                            className={cn(
                                "flex gap-3",
                                msg.role === "user" ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden",
                                msg.role === "assistant" ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {msg.role === "assistant" ? (
                                    <img src="/favicon.ico" alt="VoteWise" className="h-5 w-5" />
                                ) : (
                                    <UserCircle className="w-5 h-5" />
                                )}
                            </div>
                            <div className={cn(
                                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                                msg.role === "assistant" 
                                    ? "bg-card border border-border shadow-sm text-foreground" 
                                    : "bg-violet-600 text-white"
                            )}>
                                {msg.role === "assistant" ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    msg.content
                                )}
                            </div>
                        </motion.div>
                    ))}
                    <div ref={bottomRef} />
                </div>
            </ScrollArea>

            {/* Input Container */}
            <div className="w-full max-w-3xl mx-auto p-4 relative">
                <motion.div 
                    className="relative backdrop-blur-2xl bg-card/50 rounded-2xl border border-border shadow-xl overflow-visible"
                    animate={inputFocused ? { scale: 1.01 } : { scale: 1 }}
                >
                    {/* Command Palette */}
                    <AnimatePresence>
                        {showCommandPalette && (
                            <motion.div 
                                ref={commandPaletteRef}
                                className="absolute bottom-full left-0 right-0 mb-3 bg-popover rounded-xl border border-border shadow-2xl overflow-hidden z-50"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                <div className="p-2">
                                    {COMMAND_SUGGESTIONS.map((suggestion, index) => (
                                        <div
                                            key={suggestion.prefix}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors",
                                                activeSuggestion === index ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                                            )}
                                            onClick={() => {
                                                handleSendMessage(suggestion.description);
                                                setShowCommandPalette(false);
                                            }}
                                        >
                                            <div className="w-6 h-6 flex items-center justify-center bg-background rounded border border-border">
                                                {suggestion.icon}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{suggestion.label}</span>
                                                <span className="text-xs opacity-70">{suggestion.description}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="p-3">
                        <textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                adjustHeight();
                            }}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            placeholder="Ask VoteWise about elections..."
                            aria-label="Ask a question about elections"
                            role="textbox"
                            aria-multiline="false"
                            className="w-full px-3 py-2 bg-transparent border-none text-sm focus:ring-0 resize-none min-h-[60px]"
                        />
                    </div>

                    <div className="px-3 pb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setShowCommandPalette(!showCommandPalette)}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    showCommandPalette ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                                aria-label="Toggle command palette"
                            >
                                <Command className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </div>
                        
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={loading || !value.trim()}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-md",
                                value.trim() && !loading 
                                    ? "bg-violet-600 text-white hover:bg-violet-700" 
                                    : "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
                            )}
                            aria-label="Send message"
                        >
                            {loading ? <LoaderIcon className="w-4 h-4 animate-spin" aria-hidden="true" /> : <SendIcon className="w-4 h-4" aria-hidden="true" />}
                            <span>Send</span>
                        </button>
                    </div>
                </motion.div>

                {/* Suggestions Pills (Only initial) */}
                {messages.length <= 1 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {COMMAND_SUGGESTIONS.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => handleSendMessage(s.description)}
                                className="px-3 py-1.5 bg-muted/50 border border-border rounded-full text-xs hover:bg-muted transition-colors flex items-center gap-2"
                            >
                                {s.icon}
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Thinking Indicator */}
            <AnimatePresence>
                {loading && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full px-4 py-2 shadow-lg z-50"
                        role="status"
                        aria-label="VoteWise is thinking"
                    >
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-violet-500 font-medium">VoteWise</span>
                            <span className="text-muted-foreground">is thinking</span>
                            <TypingDots />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Mouse Tracking Glow (Only on dark theme) */}
            {inputFocused && (
                <motion.div 
                    className="fixed w-[600px] h-[600px] rounded-full pointer-events-none z-0 opacity-10 bg-violet-500 blur-[120px]"
                    animate={{ x: mousePosition.x - 300, y: mousePosition.y - 300 }}
                    transition={{ type: "spring", damping: 30, stiffness: 100, mass: 0.5 }}
                />
            )}
        </div>
    );
}

export default Chat;