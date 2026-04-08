import apiClient from "./api";
import { DEMO_MODE, delay, generateId } from "./mock/mockMode";
import { MOCK_RESOURCES } from "./mock/mockData";

export interface Resource {
  id: string;
  title: string;
  subject: string;
  fileUrl: string | null;
  fileType: "PDF" | "PPT" | "DOC" | "IMAGE" | "VIDEO" | string | null;
  fileSize: number | null;
  folder: string | null;
  createdAt: string;
}

let mockResources: Resource[] = [...MOCK_RESOURCES] as Resource[];

export const resourceService = {
  getAll: async (): Promise<Resource[]> => {
    if (DEMO_MODE) {
      await delay();
      return [...mockResources];
    }
    const { data } = await apiClient.get<Resource[]>("/resources");
    return data;
  },

  create: async (formData: FormData): Promise<Resource> => {
    if (DEMO_MODE) {
      await delay(400);
      const newResource: Resource = {
        id: generateId(),
        title: (formData.get("title") as string) || "Uploaded File",
        subject: (formData.get("subject") as string) || "General",
        fileUrl: null,
        fileType: "PDF",
        fileSize: 1024,
        folder: null,
        createdAt: new Date().toISOString(),
      };
      mockResources.push(newResource);
      return newResource;
    }
    const { data } = await apiClient.post<Resource>("/resources", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  getBySubject: async (subjectId: string): Promise<Resource[]> => {
    if (DEMO_MODE) {
      await delay();
      return mockResources.filter((r) => r.subject === subjectId);
    }
    const { data } = await apiClient.get<Resource[]>(`/resources/subject/${subjectId}`);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    if (DEMO_MODE) {
      await delay(200);
      mockResources = mockResources.filter((r) => r.id !== id);
      return;
    }
    await apiClient.delete(`/resources/${id}`);
  },
};
