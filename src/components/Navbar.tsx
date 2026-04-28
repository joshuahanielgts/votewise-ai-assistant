import { Vote } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const linkCls =
    "hidden text-sm font-medium text-muted-foreground hover:text-foreground transition-colors sm:inline";
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group" aria-label="VoteWise home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground shadow-soft group-hover:scale-105 transition-transform">
            <Vote className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">VoteWise</span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link to="/about" className={linkCls} activeProps={{ className: "hidden text-sm font-semibold text-foreground sm:inline" }}>
            About
          </Link>
          <Link to="/privacy" className={linkCls} activeProps={{ className: "hidden text-sm font-semibold text-foreground sm:inline" }}>
            Privacy
          </Link>
          <Link to="/accessibility" className={linkCls} activeProps={{ className: "hidden text-sm font-semibold text-foreground sm:inline" }}>
            Accessibility
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}