import { create } from "zustand";
import type { User } from "@studio-os/shared";
import { api } from "@/lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  loadSession: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  async loadSession() {
    try {
      const user = await api.get<User>("/api/auth/me");
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  async login(username, password) {
    const user = await api.post<User>("/api/auth/login", { username, password });
    set({ user });
  },
  async logout() {
    await api.post("/api/auth/logout");
    set({ user: null });
  },
}));
