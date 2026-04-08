import apiClient from "./api";
import { DEMO_MODE, delay, generateId } from "./mock/mockMode";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string | null;
  color: string;
  source: "task" | "calendar" | "manual";
}

const today = new Date();
const mockEvents: CalendarEvent[] = [
  { id: "ce1", title: "AIML Assignment Due", start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 23, 59).toISOString(), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 23, 59).toISOString(), description: "Submit on portal", color: "hsl(0 72% 55%)", source: "task" },
  { id: "ce2", title: "OS Lab", start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0).toISOString(), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 12, 0).toISOString(), description: null, color: "hsl(217 91% 50%)", source: "calendar" },
  { id: "ce3", title: "Hackathon Registration Closes", start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 18, 0).toISOString(), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 18, 0).toISOString(), description: "Register team on website", color: "hsl(38 92% 55%)", source: "task" },
];

export const calendarService = {
  isConnected: async (): Promise<boolean> => {
    if (DEMO_MODE) { await delay(200); return false; }
    const { data } = await apiClient.get<{ connected: boolean }>("/integrations/calendar/status");
    return data.connected;
  },

  connect: async (): Promise<{ authUrl: string }> => {
    if (DEMO_MODE) { await delay(300); return { authUrl: "#demo-calendar-oauth" }; }
    const { data } = await apiClient.get<{ authUrl: string }>("/integrations/calendar/connect");
    return data;
  },

  getEvents: async (startDate?: string, endDate?: string): Promise<CalendarEvent[]> => {
    if (DEMO_MODE) { await delay(400); return [...mockEvents]; }
    const { data } = await apiClient.get<CalendarEvent[]>("/integrations/calendar/events", { params: { startDate, endDate } });
    return data;
  },

  createEventFromTask: async (taskId: string): Promise<CalendarEvent> => {
    if (DEMO_MODE) {
      await delay(300);
      return { id: generateId(), title: "Synced Task", start: new Date().toISOString(), end: new Date().toISOString(), description: null, color: "hsl(217 91% 50%)", source: "task" };
    }
    const { data } = await apiClient.post<CalendarEvent>("/integrations/calendar/sync-task", { taskId });
    return data;
  },

  importEvents: async (): Promise<CalendarEvent[]> => {
    if (DEMO_MODE) { await delay(600); return [...mockEvents]; }
    const { data } = await apiClient.post<CalendarEvent[]>("/integrations/calendar/import");
    return data;
  },

  disconnect: async (): Promise<void> => {
    if (DEMO_MODE) { await delay(200); return; }
    await apiClient.post("/integrations/calendar/disconnect");
  },
};
