import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/Chat";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "Chat with VoteWise AI — Indian Election Education" },
      {
        name: "description",
        content: "Get answers to your questions about Indian elections, voter registration, and democracy.",
      },
    ],
  }),
});

function ChatPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background overflow-hidden">
      <Navbar />
      <main className="flex-1 flex flex-col w-full relative">
        <Chat />
      </main>
      <Footer />
    </div>
  );
}
