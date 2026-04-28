import { Button } from "@/components/ui/button";
import { Vote, Flag, CheckCircle2, ScrollText } from "lucide-react";

export function Hero() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-hero text-primary-foreground"
    >
      {/* Animated civic icons */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20">
        <Vote className="absolute left-[8%] top-[20%] h-16 w-16 animate-float-slow" />
        <Flag
          className="absolute right-[12%] top-[30%] h-14 w-14 animate-float-slow"
          style={{ animationDelay: "1.5s" }}
        />
        <CheckCircle2
          className="absolute left-[20%] bottom-[15%] h-12 w-12 animate-float-slow"
          style={{ animationDelay: "3s" }}
        />
        <ScrollText
          className="absolute right-[20%] bottom-[20%] h-14 w-14 animate-float-slow"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur-sm ring-1 ring-white/20">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" /> AI-Powered Civic Education
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          VoteWise
        </h1>
        <p className="mt-4 text-xl font-medium sm:text-2xl text-primary-foreground/90">
          Understand Your Vote. Shape Your Future.
        </p>
        <p className="mx-auto mt-6 max-w-2xl text-base text-primary-foreground/80 sm:text-lg">
          Ask anything about elections, voting timelines, registration, or how
          democracy works — and get clear, friendly answers powered by AI.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            variant="hero"
            onClick={() => scrollTo("chat")}
            aria-label="Start learning by scrolling to chat"
          >
            Start Learning
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => scrollTo("timeline")}
            className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground"
            aria-label="View election timeline"
          >
            View Timeline
          </Button>
        </div>
      </div>
    </section>
  );
}