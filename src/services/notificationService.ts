import apiClient from "./api";
import { DEMO_MODE, delay } from "./mock/mockMode";
import { MOCK_NOTIFICATIONS } from "./mock/mockData";

export type NotificationType = "ASSIGNMENT" | "EXAM" | "DEADLINE" | "ANNOUNCEMENT";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

let mockNotifications = [...MOCK_NOTIFICATIONS];

export const notificationService = {
  getAll: async (): Promise<Notification[]> => {
    if (DEMO_MODE) {
      await delay();
      return [...mockNotifications];
    }
    const { data } = await apiClient.get<Notification[]>("/notifications");
    return data;
  },

  markAsRead: async (): Promise<void> => {
    if (DEMO_MODE) {
      await delay(200);
      mockNotifications = mockNotifications.map((n) => ({ ...n, read: true }));
      return;
    }
    await apiClient.put("/notifications/read");
  },
};
