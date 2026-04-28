import { Vote } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2 group" aria-label="VoteWise home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground shadow-soft group-hover:scale-105 transition-transform">
            <Vote className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">VoteWise</span>
        </a>
        <nav className="flex items-center gap-6">
          <a
            href="#chat"
            className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
          >
            Chat
          </a>
          <a
            href="#timeline"
            className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
          >
            Timeline
          </a>
          <a
            href="#faq"
            className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
          >
            FAQ
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}