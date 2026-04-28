import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What ID do I need to vote?",
    a: "ID requirements vary by state. Some states require a photo ID, others accept utility bills or bank statements. Check your state's election website for specifics.",
  },
  {
    q: "Can I vote by mail?",
    a: "Most states offer mail-in or absentee voting. Some require an excuse, while others allow no-excuse mail voting. Request your ballot well before your state's deadline.",
  },
  {
    q: "What happens if I miss the registration deadline?",
    a: "Some states offer same-day registration on Election Day. If your state doesn't, you'll need to wait until the next election cycle to register and vote.",
  },
  {
    q: "How do I find my polling location?",
    a: "Visit your state's official election website or vote.gov. Polling locations can change between elections, so verify before each one.",
  },
  {
    q: "What is early voting?",
    a: "Early voting lets eligible voters cast ballots in person before Election Day, often over several days or weeks. Availability and dates vary by state.",
  },
  {
    q: "How are votes kept secure?",
    a: "Elections use audited paper trails, bipartisan poll workers, post-election audits, and certification processes to ensure accuracy and security.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-muted-foreground">Quick answers to common voting questions.</p>
        </div>
        <Accordion type="single" collapsible className="rounded-xl border border-border/60 bg-card px-4 shadow-soft sm:px-6">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium hover:text-primary">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}