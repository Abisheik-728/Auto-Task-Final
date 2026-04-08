import apiClient from "./api";
import { DEMO_MODE, delay, generateId } from "./mock/mockMode";
import { MOCK_TASKS } from "./mock/mockData";

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  priority: "High" | "Medium" | "Low";
  status: "pending" | "in_progress" | "completed";
  deadline: string | null;
  category: string | null;
  tags: string[];
  completed: boolean;
  completedAt: string | null;
  parentTaskId: string | null;
  position: number;
  reminderEnabled: boolean;
  notes: string | null;
  studentId: string | null;
  createdAt: string;
  updatedAt: string;
}

let mockTasks: Task[] = [...MOCK_TASKS] as Task[];

export const taskService = {
  getAll: async (): Promise<Task[]> => {
    if (DEMO_MODE) {
      await delay();
      return [...mockTasks];
    }
    const { data } = await apiClient.get<Task[]>("/tasks");
    return data;
  },

  create: async (task: Partial<Task>): Promise<Task> => {
    if (DEMO_MODE) {
      await delay(300);
      const newTask: Task = {
        id: generateId(),
        userId: "demo-user-001",
        title: task.title || "Untitled",
        description: task.description || null,
        priority: task.priority || "Medium",
        status: task.status || "pending",
        deadline: task.deadline || null,
        category: task.category || null,
        tags: task.tags || [],
        completed: false,
        completedAt: null,
        parentTaskId: null,
        position: mockTasks.length,
        reminderEnabled: task.reminderEnabled ?? false,
        notes: task.notes || null,
        studentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockTasks.push(newTask);
      return newTask;
    }
    const { data } = await apiClient.post<Task>("/tasks", task);
    return data;
  },

  update: async (id: string, updates: Partial<Task>): Promise<Task> => {
    if (DEMO_MODE) {
      await delay(200);
      mockTasks = mockTasks.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
      return mockTasks.find((t) => t.id === id)!;
    }
    const { data } = await apiClient.put<Task>(`/tasks/${id}`, updates);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    if (DEMO_MODE) {
      await delay(200);
      mockTasks = mockTasks.filter((t) => t.id !== id);
      return;
    }
    await apiClient.delete(`/tasks/${id}`);
  },

  extractTasks: async (message: string): Promise<{ tasks: any[] }> => {
    if (DEMO_MODE) {
      await delay(800);
      return {
        tasks: [
          { title: `Task from: "${message.slice(0, 30)}..."`, priority: "Medium", deadline: null },
        ],
      };
    }
    const { data } = await apiClient.post("/tasks/extract", { message });
    return data;
  },
};
