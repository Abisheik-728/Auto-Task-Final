// ============================================================
// src/services/googleService.ts
// Unified Gmail + Calendar + Sync service
// ============================================================

const BACKEND = import.meta.env.VITE_CALENDAR_SERVER_URL || "http://localhost:3001";

export interface GmailTask {
  title: string;
  deadline: string;
  source: "gmail";
  emailSubject: string;
}

export interface SyncResult {
  success: boolean;
  isSynced: boolean;
  googleEventId?: string;
  eventLink?: string;
}

export interface SyncStatus {
  isSynced: boolean;
  googleEventId: string | null;
}

export function getGoogleUserId(): string {
  return localStorage.getItem("google_user_id") || "default";
}

export const googleService = {
  // ── Connection ──
  isConnected: async (): Promise<boolean> => {
    try {
      const userId = getGoogleUserId();
      const res = await fetch(`${BACKEND}/auth/google/status?userId=${userId}`);
      const data = await res.json();
      return data.connected;
    } catch {
      return false;
    }
  },

  startAuth: async (): Promise<void> => {
    const userId = getGoogleUserId();
    const res = await fetch(`${BACKEND}/auth/google/url?userId=${userId}`);
    const data = await res.json();
    if (data.authUrl) window.location.href = data.authUrl;
  },

  disconnect: async (): Promise<void> => {
    const userId = getGoogleUserId();
    await fetch(`${BACKEND}/auth/google/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    localStorage.removeItem("google_connected");
    localStorage.removeItem("google_user_id");
    localStorage.removeItem("gcal_connected");
    localStorage.removeItem("gcal_user_id");
  },

  // ── Gmail Tasks ──
  getGmailTasks: async (): Promise<GmailTask[]> => {
    const userId = getGoogleUserId();
    const res = await fetch(`${BACKEND}/gmail/tasks?userId=${userId}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body.error || "Failed to fetch Gmail tasks";
      const err: any = new Error(msg);
      err.needsReauth = body.needsReauth || false;
      throw err;
    }
    return res.json();
  },

  // ── Calendar Event (legacy) ──
  createCalendarEvent: async (
    title: string,
    deadline: string
  ): Promise<{ eventLink: string }> => {
    const userId = getGoogleUserId();
    const res = await fetch(`${BACKEND}/create-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, deadline }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Calendar sync failed");
    }
    return res.json();
  },

  // ── Task Sync: Toggle ON → create event ──
  syncTask: async (
    taskId: string,
    title: string,
    deadline: string
  ): Promise<SyncResult> => {
    const userId = getGoogleUserId();
    const res = await fetch(`${BACKEND}/calendar/sync-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, taskId, title, deadline }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Sync failed");
    }
    return res.json();
  },

  // ── Task Unsync: Toggle OFF → delete event ──
  unsyncTask: async (taskId: string): Promise<SyncResult> => {
    const userId = getGoogleUserId();
    const res = await fetch(
      `${BACKEND}/calendar/remove-task/${taskId}?userId=${userId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Unsync failed");
    }
    return res.json();
  },

  // ── Check single task sync status ──
  getSyncStatus: async (taskId: string): Promise<SyncStatus> => {
    const res = await fetch(`${BACKEND}/calendar/sync-status/${taskId}`);
    return res.json();
  },

  // ── Check multiple tasks sync status at once ──
  getSyncStatusBatch: async (
    taskIds: string[]
  ): Promise<Record<string, SyncStatus>> => {
    const res = await fetch(`${BACKEND}/calendar/sync-status-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskIds }),
    });
    return res.json();
  },
};
