import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Chat from "../Chat";

// Mock the toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock ScrollArea
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("Chat Component", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // @ts-ignore
    vi.spyOn(window.crypto, "randomUUID").mockReturnValue("test-uuid-1234");
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders welcome message on load", () => {
    render(<Chat />);
    expect(screen.getByText(/How can/i)).toBeInTheDocument();
    expect(screen.getByText(/VoteWise/i)).toBeInTheDocument();
  });

  it("renders all command suggestion buttons initially", () => {
    render(<Chat />);
    expect(screen.getByText("Register")).toBeInTheDocument();
    expect(screen.getByText("EPIC Card")).toBeInTheDocument();
    expect(screen.getByText("EVMs")).toBeInTheDocument();
    expect(screen.getByText("NRI Voting")).toBeInTheDocument();
  });

  it("send button is disabled when input is empty", () => {
    render(<Chat />);
    const btn = screen.getByText("Send").closest('button');
    expect(btn).toBeDisabled();
  });

  it("send button enables when input has text", () => {
    render(<Chat />);
    const textarea = screen.getByLabelText("Ask a question about elections");
    fireEvent.change(textarea, { target: { value: "How do I vote?" } });
    const btn = screen.getByText("Send").closest('button');
    expect(btn).not.toBeDisabled();
  });

  it("submits message and shows AI response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "You can register at voterportal.eci.gov.in", session_id: "abc" }),
    });

    render(<Chat />);
    const textarea = screen.getByLabelText("Ask a question about elections");
    fireEvent.change(textarea, { target: { value: "How do I register?" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(screen.getByText(/You can register at voterportal.eci.gov.in/i)).toBeInTheDocument();
    });
  });
});
