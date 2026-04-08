import apiClient from "./api";
import { DEMO_MODE, delay, generateId } from "./mock/mockMode";
import {
  MOCK_TIMETABLE,
  MOCK_STUDY_SESSIONS,
  MOCK_NOTES,
  MOCK_PRODUCTIVITY,
  MOCK_STUDY_HOURS,
  MOCK_TASK_COMPLETION,
} from "./mock/mockData";

export interface ProductivityData {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  studyHours: number;
  weeklyCompletions: { day: string; completed: number }[];
  priorityDistribution: { name: string; value: number }[];
  completionRate: number;
}

export interface StudyHoursData {
  totalHours: number;
  weeklyHours: { day: string; hours: number }[];
  subjectBreakdown: { subject: string; hours: number }[];
}

export interface TaskCompletionData {
  daily: { date: string; completed: number; total: number }[];
  weekly: { week: string; completed: number; total: number }[];
  overallRate: number;
}

export interface TimetableEntry {
  id: string;
  title: string;
  entryType: string;
  subject: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
  color: string | null;
}

export interface StudySession {
  id: string;
  subject: string | null;
  durationMinutes: number;
  startedAt: string;
  sessionType: string | null;
}

export interface QuickNote {
  id: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
}

// In-memory mock stores
let mockTimetable = [...MOCK_TIMETABLE];
let mockSessions = [...MOCK_STUDY_SESSIONS];
let mockNotes = [...MOCK_NOTES];

export const analyticsService = {
  // Analytics
  getProductivity: async (): Promise<ProductivityData> => {
    if (DEMO_MODE) { await delay(); return { ...MOCK_PRODUCTIVITY }; }
    const { data } = await apiClient.get<ProductivityData>("/analytics/productivity");
    return data;
  },

  getStudyHours: async (): Promise<StudyHoursData> => {
    if (DEMO_MODE) { await delay(); return { ...MOCK_STUDY_HOURS }; }
    const { data } = await apiClient.get<StudyHoursData>("/analytics/study-hours");
    return data;
  },

  getTaskCompletion: async (): Promise<TaskCompletionData> => {
    if (DEMO_MODE) { await delay(); return { ...MOCK_TASK_COMPLETION }; }
    const { data } = await apiClient.get<TaskCompletionData>("/analytics/task-completion");
    return data;
  },

  // Timetable
  getTimetableEntries: async (): Promise<TimetableEntry[]> => {
    if (DEMO_MODE) { await delay(); return [...mockTimetable]; }
    const { data } = await apiClient.get<TimetableEntry[]>("/timetable");
    return data;
  },

  createTimetableEntry: async (entry: Partial<TimetableEntry>): Promise<TimetableEntry> => {
    if (DEMO_MODE) {
      await delay(300);
      const newEntry: TimetableEntry = {
        id: generateId(), title: entry.title || "Untitled", entryType: entry.entryType || "class",
        subject: entry.subject || null, dayOfWeek: entry.dayOfWeek ?? 1,
        startTime: entry.startTime || "09:00", endTime: entry.endTime || "10:00",
        location: entry.location || null, color: entry.color || "#3b82f6",
      };
      mockTimetable.push(newEntry);
      return newEntry;
    }
    const { data } = await apiClient.post<TimetableEntry>("/timetable", entry);
    return data;
  },

  updateTimetableEntry: async (id: string, entry: Partial<TimetableEntry>): Promise<TimetableEntry> => {
    if (DEMO_MODE) {
      await delay(200);
      mockTimetable = mockTimetable.map((e) => (e.id === id ? { ...e, ...entry } : e));
      return mockTimetable.find((e) => e.id === id)!;
    }
    const { data } = await apiClient.put<TimetableEntry>(`/timetable/${id}`, entry);
    return data;
  },

  deleteTimetableEntry: async (id: string): Promise<void> => {
    if (DEMO_MODE) { await delay(200); mockTimetable = mockTimetable.filter((e) => e.id !== id); return; }
    await apiClient.delete(`/timetable/${id}`);
  },

  // Study sessions
  getStudySessions: async (limit?: number): Promise<StudySession[]> => {
    if (DEMO_MODE) { await delay(); return limit ? mockSessions.slice(0, limit) : [...mockSessions]; }
    const query = limit ? `?limit=${limit}` : "";
    const { data } = await apiClient.get<StudySession[]>(`/study-sessions${query}`);
    return data;
  },

  createStudySession: async (session: Partial<StudySession>): Promise<StudySession> => {
    if (DEMO_MODE) {
      await delay(300);
      const newSession: StudySession = {
        id: generateId(), subject: session.subject || null,
        durationMinutes: session.durationMinutes || 0,
        startedAt: session.startedAt || new Date().toISOString(),
        sessionType: session.sessionType || "pomodoro",
      };
      mockSessions.push(newSession);
      return newSession;
    }
    const { data } = await apiClient.post<StudySession>("/study-sessions", session);
    return data;
  },

  // Quick notes
  getNotes: async (): Promise<QuickNote[]> => {
    if (DEMO_MODE) { await delay(); return [...mockNotes]; }
    const { data } = await apiClient.get<QuickNote[]>("/notes");
    return data;
  },

  createNote: async (note: Partial<QuickNote>): Promise<QuickNote> => {
    if (DEMO_MODE) {
      await delay(300);
      const newNote: QuickNote = {
        id: generateId(), content: note.content || "",
        color: note.color || "#fbbf24", pinned: note.pinned ?? false,
        createdAt: new Date().toISOString(),
      };
      mockNotes.push(newNote);
      return newNote;
    }
    const { data } = await apiClient.post<QuickNote>("/notes", note);
    return data;
  },

  updateNote: async (id: string, updates: Partial<QuickNote>): Promise<QuickNote> => {
    if (DEMO_MODE) {
      await delay(200);
      mockNotes = mockNotes.map((n) => (n.id === id ? { ...n, ...updates } : n));
      return mockNotes.find((n) => n.id === id)!;
    }
    const { data } = await apiClient.put<QuickNote>(`/notes/${id}`, updates);
    return data;
  },

  deleteNote: async (id: string): Promise<void> => {
    if (DEMO_MODE) { await delay(200); mockNotes = mockNotes.filter((n) => n.id !== id); return; }
    await apiClient.delete(`/notes/${id}`);
  },

  // Admin
  getAdminStats: async (): Promise<{ users: number; tasks: number; sessions: number; materials: number }> => {
    if (DEMO_MODE) { await delay(); return { users: 42, tasks: 156, sessions: 89, materials: 34 }; }
    const { data } = await apiClient.get("/admin/stats");
    return data;
  },

  getAdminUsers: async (): Promise<{ userId: string; displayName: string | null; avatarUrl: string | null; createdAt: string }[]> => {
    if (DEMO_MODE) {
      await delay();
      return [
        { userId: "demo-user-001", displayName: "Demo Student", avatarUrl: null, createdAt: new Date().toISOString() },
        { userId: "demo-user-002", displayName: "Jane Smith", avatarUrl: null, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
      ];
    }
    const { data } = await apiClient.get("/admin/users");
    return data;
  },
};
