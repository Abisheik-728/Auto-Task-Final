import apiClient from "./api";
import { DEMO_MODE, delay } from "./mock/mockMode";
import type { ExtractedTaskData } from "./taskExtractionService";

export interface WhatsAppMessage {
  id: string;
  sender: string;
  group: string;
  text: string;
  timestamp: string;
  hasTaskContent: boolean;
}

const MOCK_MESSAGES: WhatsAppMessage[] = [
  { id: "w1", sender: "+91-98765-43210", group: "CSE-A Class Group", text: "Reminder: OS lab record submission tomorrow. Bring printed copies.", timestamp: new Date(Date.now() - 3600000).toISOString(), hasTaskContent: true },
  { id: "w2", sender: "+91-98765-11111", group: "Placement Cell", text: "TCS NQT registration deadline extended to April 12. Apply now.", timestamp: new Date(Date.now() - 7200000).toISOString(), hasTaskContent: true },
  { id: "w3", sender: "+91-98765-22222", group: "CSE-A Class Group", text: "DBMS seminar rescheduled to April 8 at 2 PM in Hall B.", timestamp: new Date(Date.now() - 10800000).toISOString(), hasTaskContent: true },
];

export const whatsappIntegrationService = {
  isConnected: async (): Promise<boolean> => {
    if (DEMO_MODE) { await delay(200); return false; }
    const { data } = await apiClient.get<{ connected: boolean }>("/integrations/whatsapp/status");
    return data.connected;
  },

  connect: async (): Promise<{ qrCode: string }> => {
    if (DEMO_MODE) { await delay(300); return { qrCode: "demo-qr-placeholder" }; }
    const { data } = await apiClient.get<{ qrCode: string }>("/integrations/whatsapp/connect");
    return data;
  },

  getMessages: async (): Promise<WhatsAppMessage[]> => {
    if (DEMO_MODE) { await delay(600); return [...MOCK_MESSAGES]; }
    const { data } = await apiClient.get<WhatsAppMessage[]>("/integrations/whatsapp/messages");
    return data;
  },

  extractTasksFromMessage: async (messageId: string): Promise<ExtractedTaskData[]> => {
    if (DEMO_MODE) {
      await delay(500);
      const msg = MOCK_MESSAGES.find((m) => m.id === messageId);
      if (!msg) return [];
      return [{ title: msg.text.slice(0, 60), workType: "Deadline Reminder", deadline: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0], notes: `From: ${msg.group}` }];
    }
    const { data } = await apiClient.post<{ tasks: ExtractedTaskData[] }>("/integrations/whatsapp/extract", { messageId });
    return data.tasks;
  },

  disconnect: async (): Promise<void> => {
    if (DEMO_MODE) { await delay(200); return; }
    await apiClient.post("/integrations/whatsapp/disconnect");
  },
};
