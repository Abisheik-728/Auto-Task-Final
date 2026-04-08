import apiClient from "./api";
import { DEMO_MODE, delay, generateId } from "./mock/mockMode";
import { MOCK_ASSIGNMENTS } from "./mock/mockData";

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  section: string | null;
  deadline: string | null;
  status: string;
  attachments: string[];
  createdAt: string;
}

let mockAssignments = [...MOCK_ASSIGNMENTS];

export const assignmentService = {
  getAll: async (): Promise<Assignment[]> => {
    if (DEMO_MODE) {
      await delay();
      return [...mockAssignments];
    }
    const { data } = await apiClient.get<Assignment[]>("/assignments");
    return data;
  },

  create: async (assignment: Partial<Assignment>): Promise<Assignment> => {
    if (DEMO_MODE) {
      await delay(300);
      const newAssignment: Assignment = {
        id: generateId(),
        title: assignment.title || "Untitled",
        description: assignment.description || null,
        subject: assignment.subject || "General",
        section: assignment.section || null,
        deadline: assignment.deadline || null,
        status: assignment.status || "pending",
        attachments: assignment.attachments || [],
        createdAt: new Date().toISOString(),
      };
      mockAssignments.push(newAssignment);
      return newAssignment;
    }
    const { data } = await apiClient.post<Assignment>("/assignments", assignment);
    return data;
  },

  getBySection: async (sectionId: string): Promise<Assignment[]> => {
    if (DEMO_MODE) {
      await delay();
      return mockAssignments.filter((a) => a.section === sectionId);
    }
    const { data } = await apiClient.get<Assignment[]>(`/assignments/section/${sectionId}`);
    return data;
  },
};
