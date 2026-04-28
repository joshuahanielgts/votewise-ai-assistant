import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy — VoteWise" },
      {
        name: "description",
        content:
          "How VoteWise handles chat messages, session identifiers, and your data.",
      },
      { property: "og:title", content: "Privacy — VoteWise" },
      {
        property: "og:description",
        content: "Data handling for chat messages and session_id in VoteWise.",
      },
    ],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground shadow-soft">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Privacy</h1>
            <p className="text-sm text-muted-foreground">
              How we handle chat messages and session data.
            </p>
          </div>
        </div>

        <Card className="p-8 shadow-soft">
          <section>
            <h2 className="text-xl font-semibold">Chat messages</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Messages you type into the VoteWise chat are sent to our backend
              service and forwarded to an AI provider to generate a response.
              We do not require you to sign in, and we do not associate your
              messages with personal identifiers such as name or email.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Messages may be logged temporarily for abuse prevention and quality.</li>
              <li>Do not include sensitive personal information in chat.</li>
              <li>Responses are educational and may contain inaccuracies.</li>
            </ul>
          </section>

          <Separator className="my-6" />

          <section>
            <h2 className="text-xl font-semibold">Session ID</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Each chat session is assigned a random{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">session_id</code>{" "}
              (a UUID generated in your browser). It is sent with each
              message so the assistant can maintain conversational context.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>The session_id is not linked to your identity.</li>
              <li>It is regenerated each time you reload the page.</li>
              <li>It is not stored in cookies or local storage.</li>
            </ul>
          </section>

          <Separator className="my-6" />

          <section>
            <h2 className="text-xl font-semibold">Third parties</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Chat content is processed by an AI model provider. No advertising
              trackers are used on this site.
            </p>
          </section>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
