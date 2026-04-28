import { UserPlus, FileSignature, Vote, Megaphone, CalendarCheck, Award } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    title: "Voter Registration Opens",
    desc: "Eligible citizens register to vote. Deadlines vary by state.",
    status: "done",
  },
  {
    icon: FileSignature,
    title: "Candidate Filing Deadline",
    desc: "Candidates officially submit paperwork to appear on the ballot.",
    status: "done",
  },
  {
    icon: Vote,
    title: "Primary Elections",
    desc: "Parties select their candidates through primaries or caucuses.",
    status: "active",
  },
  {
    icon: Megaphone,
    title: "General Election Campaign",
    desc: "Candidates campaign nationally — debates, ads, and rallies.",
    status: "upcoming",
  },
  {
    icon: CalendarCheck,
    title: "Election Day",
    desc: "Voters cast ballots in person, by mail, or early voting.",
    status: "upcoming",
  },
  {
    icon: Award,
    title: "Results & Certification",
    desc: "Votes are counted, audited, and officially certified.",
    status: "upcoming",
  },
];

const STATUS_STYLES: Record<string, string> = {
  done: "bg-primary text-primary-foreground border-primary",
  active: "bg-accent text-accent-foreground border-accent ring-4 ring-accent/20",
  upcoming: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  done: "Completed",
  active: "In progress",
  upcoming: "Upcoming",
};

export default function Timeline() {
  return (
    <section id="timeline" className="bg-muted/40 py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Election Timeline</h2>
          <p className="mt-2 text-muted-foreground">
            From registration to results — the path of a typical election cycle.
          </p>
        </div>

        <ol className="relative space-y-6 border-l-2 border-border/70 pl-8 sm:pl-10">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <span
                  className={`absolute -left-[2.6rem] sm:-left-[3.1rem] flex h-10 w-10 items-center justify-center rounded-full border-2 ${STATUS_STYLES[step.status]}`}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="rounded-xl border border-border/60 bg-card p-5 shadow-soft">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        step.status === "active"
                          ? "bg-accent/15 text-accent"
                          : step.status === "done"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABEL[step.status]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}