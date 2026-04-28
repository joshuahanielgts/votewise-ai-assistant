import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
          <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
          Powered by Google Cloud & Gemini AI
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground" aria-label="Footer">
          <a href="#" className="hover:text-foreground">About</a>
          <a href="#" className="hover:text-foreground">Accessibility</a>
          <a href="#" className="hover:text-foreground">Privacy</a>
        </nav>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} VoteWise — Educational use only.
      </div>
    </footer>
  );
}