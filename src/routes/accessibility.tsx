import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accessibility as AccessibilityIcon, Keyboard, Eye, Ear } from "lucide-react";

export const Route = createFileRoute("/accessibility")({
  component: AccessibilityPage,
  head: () => ({
    meta: [
      { title: "Accessibility — VoteWise" },
      {
        name: "description",
        content:
          "Keyboard navigation, ARIA usage, and color contrast in VoteWise.",
      },
      { property: "og:title", content: "Accessibility — VoteWise" },
      {
        property: "og:description",
        content: "Our commitment to an accessible election education tool.",
      },
    ],
  }),
});

function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground shadow-soft">
            <AccessibilityIcon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Accessibility</h1>
            <p className="text-sm text-muted-foreground">
              Built so every voter can participate.
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-accent" aria-hidden />
              <h2 className="text-lg font-semibold">Keyboard navigation</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Badge variant="secondary">Tab</Badge> moves focus through links, buttons, and inputs.</li>
              <li><Badge variant="secondary">Shift + Tab</Badge> moves focus backwards.</li>
              <li><Badge variant="secondary">Enter</Badge> activates buttons and submits the chat.</li>
              <li><Badge variant="secondary">Space</Badge> toggles theme switch and accordion items.</li>
              <li>Visible focus rings are provided via the <code className="rounded bg-muted px-1 text-xs">--ring</code> token.</li>
            </ul>
          </Card>

          <Card className="p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <Ear className="h-5 w-5 text-accent" aria-hidden />
              <h2 className="text-lg font-semibold">ARIA usage</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>The chat log uses <code className="rounded bg-muted px-1 text-xs">role="log"</code> with <code className="rounded bg-muted px-1 text-xs">aria-live="polite"</code> so new messages are announced.</li>
              <li>Decorative icons are marked <code className="rounded bg-muted px-1 text-xs">aria-hidden</code>.</li>
              <li>All icon-only buttons include an <code className="rounded bg-muted px-1 text-xs">aria-label</code>.</li>
              <li>Quick-prompt pills are grouped with <code className="rounded bg-muted px-1 text-xs">role="group"</code> and a label.</li>
              <li>Landmarks (<code className="rounded bg-muted px-1 text-xs">header</code>, <code className="rounded bg-muted px-1 text-xs">main</code>, <code className="rounded bg-muted px-1 text-xs">footer</code>) structure each page.</li>
            </ul>
          </Card>

          <Card className="p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-accent" aria-hidden />
              <h2 className="text-lg font-semibold">Color & contrast</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Colors are defined as semantic OKLCH tokens in <code className="rounded bg-muted px-1 text-xs">src/styles.css</code>.</li>
              <li>Body and heading text meet WCAG AA contrast (≥ 4.5:1) in both light and dark themes.</li>
              <li>Dark theme uses brightened foreground tokens for improved legibility.</li>
              <li>A theme toggle is available in the navbar; preference is reflected immediately.</li>
            </ul>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
