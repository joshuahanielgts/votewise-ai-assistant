import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Chat } from "@/components/Chat";
import { Footer } from "@/components/Footer";

const Timeline = lazy(() => import("@/components/Timeline"));
const FAQ = lazy(() => import("@/components/FAQ"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "VoteWise — Understand Your Vote" },
      {
        name: "description",
        content:
          "AI-powered election education. Ask about voting, registration, timelines, and how democracy works.",
      },
      { property: "og:title", content: "VoteWise — Understand Your Vote" },
      {
        property: "og:description",
        content: "Your AI guide to elections, voting, and democracy.",
      },
    ],
  }),
});

function SectionFallback() {
  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
    </div>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <Suspense fallback={<SectionFallback />}>
          <Timeline />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <FAQ />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
