import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Vote, Sparkles, Users, BookOpen } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — VoteWise" },
      {
        name: "description",
        content:
          "Learn what VoteWise does and how its AI assistant helps citizens understand elections and democracy.",
      },
      { property: "og:title", content: "About VoteWise" },
      {
        property: "og:description",
        content: "An AI-powered assistant for election process education.",
      },
    ],
  }),
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-soft">
            <Vote className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">About VoteWise</h1>
          <p className="mt-3 text-muted-foreground">
            Understand Your Vote. Shape Your Future.
          </p>
        </div>

        <Card className="p-8 shadow-soft">
          <h2 className="text-2xl font-semibold">Our mission</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            VoteWise is an AI-powered education assistant that helps citizens
            understand how elections work — from voter registration to ballot
            counting. We translate complex civic processes into clear,
            accessible answers so everyone can participate confidently in
            democracy.
          </p>
        </Card>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Card className="p-6">
            <Sparkles className="h-6 w-6 text-accent" aria-hidden />
            <h3 className="mt-3 font-semibold">AI assistant</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Conversational answers powered by a large language model trained
              on election and civics references.
            </p>
          </Card>
          <Card className="p-6">
            <BookOpen className="h-6 w-6 text-accent" aria-hidden />
            <h3 className="mt-3 font-semibold">Curated content</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Timeline, FAQ, and quick prompts cover the most common voter
              questions in plain language.
            </p>
          </Card>
          <Card className="p-6">
            <Users className="h-6 w-6 text-accent" aria-hidden />
            <h3 className="mt-3 font-semibold">For everyone</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Designed to be responsive, accessible, and non-partisan — a
              neutral guide for any voter.
            </p>
          </Card>
        </div>

        <div className="mt-10 rounded-lg border border-border/60 bg-muted/30 p-6">
          <h2 className="text-xl font-semibold">How the AI is used</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            When you send a question, it is forwarded with a session identifier
            to our backend, which queries an AI model and returns an
            educational answer. VoteWise does not provide voting advice or
            endorse candidates. For official information, always confirm with
            your local election authority.
          </p>
          <Link to="/privacy" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Read our Privacy page →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
