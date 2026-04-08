import apiClient, { setAuthToken, clearAuthToken } from "./api";
import { DEMO_MODE, delay } from "./mock/mockMode";
import { MOCK_USER, MOCK_PROFILE } from "./mock/mockData";

export interface User {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// In-memory mock profile for demo mode
let mockProfile = { ...MOCK_PROFILE };

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    if (DEMO_MODE) {
      await delay(400);
      const token = "demo-jwt-token";
      setAuthToken(token);
      return { token, user: { ...MOCK_USER, email } };
    }
    const { data } = await apiClient.post<AuthResponse>("/auth/login", { email, password });
    setAuthToken(data.token);
    return data;
  },

  register: async (email: string, password: string, fullName?: string): Promise<AuthResponse> => {
    if (DEMO_MODE) {
      await delay(400);
      const token = "demo-jwt-token";
      setAuthToken(token);
      return { token, user: { ...MOCK_USER, email, fullName: fullName || "New User" } };
    }
    const { data } = await apiClient.post<AuthResponse>("/auth/register", { email, password, fullName });
    setAuthToken(data.token);
    return data;
  },

  getProfile: async (): Promise<{ user: User; profile: Profile }> => {
    if (DEMO_MODE) {
      await delay(200);
      return { user: { ...MOCK_USER }, profile: { ...mockProfile } };
    }
    const { data } = await apiClient.get("/auth/profile");
    return data;
  },

  updateProfile: async (updates: Partial<Profile>): Promise<Profile> => {
    if (DEMO_MODE) {
      await delay(300);
      mockProfile = { ...mockProfile, ...updates };
      return { ...mockProfile };
    }
    const { data } = await apiClient.put<Profile>("/auth/profile", updates);
    return data;
  },

  uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
    if (DEMO_MODE) {
      await delay(500);
      const url = URL.createObjectURL(file);
      mockProfile.avatarUrl = url;
      return { avatarUrl: url };
    }
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post("/auth/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  resetPassword: async (email: string): Promise<void> => {
    if (DEMO_MODE) {
      await delay(300);
      return;
    }
    await apiClient.post("/auth/forgot-password", { email });
  },

  updatePassword: async (token: string, password: string): Promise<void> => {
    if (DEMO_MODE) {
      await delay(300);
      return;
    }
    await apiClient.post("/auth/reset-password", { token, password });
  },

  logout: async (): Promise<void> => {
    if (DEMO_MODE) {
      clearAuthToken();
      return;
    }
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // best-effort server logout
    }
    clearAuthToken();
  },
};
