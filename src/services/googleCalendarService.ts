// ============================================================
// src/services/googleCalendarService.ts
// Talks to the Express backend at http://localhost:3001
// ============================================================

const BACKEND = "http://localhost:3001";

/** Gets the stored userId from localStorage (set after OAuth). */
export function getCalendarUserId(): string {
  return localStorage.getItem("gcal_user_id") || "default";
}

export const googleCalendarService = {
  // ── Check whether the current user has connected Google Calendar ──
  isConnected: async (): Promise<boolean> => {
    const userId = getCalendarUserId();
    const res = await fetch(`${BACKEND}/auth/google/status?userId=${userId}`);
    const data = await res.json();
    return data.connected;
  },

  // ── Get the OAuth consent-screen URL and redirect the user to it ──
  startOAuth: async (): Promise<void> => {
    const userId = getCalendarUserId();
    const res = await fetch(`${BACKEND}/auth/google/url?userId=${userId}`);
    const data = await res.json();
    if (data.authUrl) {
      window.location.href = data.authUrl; // Full-page redirect to Google
    }
  },

  // ── Create a Google Calendar event for a task ──
  createEvent: async (
    title: string,
    deadline: string // YYYY-MM-DD or full ISO datetime
  ): Promise<{ eventLink: string; eventId: string }> => {
    const userId = getCalendarUserId();
    const res = await fetch(`${BACKEND}/create-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, deadline }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create calendar event.");
    }

    return res.json();
  },

  // ── Disconnect Google Calendar ──
  disconnect: async (): Promise<void> => {
    const userId = getCalendarUserId();
    await fetch(`${BACKEND}/auth/google/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    localStorage.removeItem("gcal_connected");
    localStorage.removeItem("gcal_user_id");
  },
};
