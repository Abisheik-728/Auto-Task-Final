import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authService, Profile, User } from "@/services/authService";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultAuthContext: AuthContextType = {
  user: null,
  profile: null,
  roles: [],
  loading: true,
  isAuthenticated: false,
  signUp: async () => ({ error: { message: "Auth not ready" } }),
  signIn: async () => ({ error: { message: "Auth not ready" } }),
  signOut: async () => {},
  updateProfile: async () => {},
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return ctx ?? defaultAuthContext;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const data = await authService.getProfile();
      setUser(data.user);
      setProfile(data.profile);
      setRoles(data.user.roles ?? []);
    } catch {
      setUser(null);
      setProfile(null);
      setRoles([]);
      authService.logout();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetchProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const data = await authService.register(email, password, fullName);
      setUser(data.user);
      setRoles(data.user.roles ?? []);
      await fetchProfile();
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await authService.login(email, password);
      setUser(data.user);
      setRoles(data.user.roles ?? []);
      await fetchProfile();
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    const updated = await authService.updateProfile(updates);
    setProfile(updated);
  };

  return (
    <AuthContext.Provider value={{ user, profile, roles, loading, isAuthenticated: !!user, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
