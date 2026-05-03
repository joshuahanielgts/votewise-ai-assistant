// Google Analytics 4 event tracking utilities
// GA4 is completely free — no usage limits on the standard tier

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const GA_MEASUREMENT_ID = "G-XXXXXXXXXX"; // Replace with real ID

export function trackEvent(
  eventName: string,
  parameters?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, {
    ...parameters,
    send_to: GA_MEASUREMENT_ID,
  });
}

export function trackPageView(pagePath: string, pageTitle: string): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_title: pageTitle,
    send_to: GA_MEASUREMENT_ID,
  });
}

// VoteWise-specific tracking events
export const Analytics = {
  chatMessageSent: (questionLength: number) =>
    trackEvent("chat_message_sent", {
      question_length: questionLength,
      event_category: "engagement",
    }),

  quickPillClicked: (topic: string) =>
    trackEvent("quick_pill_clicked", {
      topic,
      event_category: "engagement",
    }),

  aiResponseReceived: (responseLength: number, success: boolean) =>
    trackEvent("ai_response_received", {
      response_length: responseLength,
      success,
      event_category: "engagement",
    }),

  apiError: (errorMessage: string) =>
    trackEvent("api_error", {
      error_message: errorMessage.slice(0, 100),
      event_category: "error",
    }),

  themeToggled: (theme: "dark" | "light") =>
    trackEvent("theme_toggled", {
      theme,
      event_category: "ui",
    }),
};
