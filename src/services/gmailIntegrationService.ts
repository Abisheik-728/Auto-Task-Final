import apiClient from "./api";
import { DEMO_MODE, delay, generateId } from "./mock/mockMode";
import type { ExtractedTaskData } from "./taskExtractionService";

export interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  hasTaskContent: boolean;
}

const MOCK_EMAILS: GmailMessage[] = [
  { id: "g1", from: "professor@university.edu", subject: "AIML Assignment 3 - Due April 10", snippet: "Please submit your AIML Assignment 3 by April 10. The topic is neural networks.", date: new Date(Date.now() - 86400000).toISOString(), hasTaskContent: true },
  { id: "g2", from: "placement@university.edu", subject: "Google Internship Drive - Register by April 15", snippet: "Google internship drive registration closes April 15. Register on the placement portal.", date: new Date(Date.now() - 2 * 86400000).toISOString(), hasTaskContent: true },
  { id: "g3", from: "events@university.edu", subject: "Annual Hackathon 2025", snippet: "Register for the annual hackathon starting April 20. Teams of 4 allowed.", date: new Date(Date.now() - 3 * 86400000).toISOString(), hasTaskContent: true },
];

export const gmailIntegrationService = {
  isConnected: async (): Promise<boolean> => {
    if (DEMO_MODE) { await delay(200); return false; }
    const { data } = await apiClient.get<{ connected: boolean }>("/integrations/gmail/status");
    return data.connected;
  },

  connect: async (): Promise<{ authUrl: string }> => {
    if (DEMO_MODE) { await delay(300); return { authUrl: "#demo-gmail-oauth" }; }
    const { data } = await apiClient.get<{ authUrl: string }>("/integrations/gmail/connect");
    return data;
  },

  getMessages: async (): Promise<GmailMessage[]> => {
    if (DEMO_MODE) { await delay(600); return [...MOCK_EMAILS]; }
    const { data } = await apiClient.get<GmailMessage[]>("/integrations/gmail/messages");
    return data;
  },

  extractTasksFromEmail: async (emailId: string): Promise<ExtractedTaskData[]> => {
    if (DEMO_MODE) {
      await delay(500);
      const email = MOCK_EMAILS.find((e) => e.id === emailId);
      if (!email) return [];
      return [{ title: email.subject.split(" - ")[0], workType: "Assignment", deadline: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0], notes: email.snippet }];
    }
    const { data } = await apiClient.post<{ tasks: ExtractedTaskData[] }>("/integrations/gmail/extract", { emailId });
    return data.tasks;
  },

  disconnect: async (): Promise<void> => {
    if (DEMO_MODE) { await delay(200); return; }
    await apiClient.post("/integrations/gmail/disconnect");
  },
};
