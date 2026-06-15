import { User, Supplier, Order, StatusHistory, ActivityLog, DashboardStats } from "../types";

let currentToken: string | null = localStorage.getItem("suivi_appro_token");

export const api = {
  setToken(token: string | null) {
    currentToken = token;
    if (token) {
      localStorage.setItem("suivi_appro_token", token);
    } else {
      localStorage.removeItem("suivi_appro_token");
    }
  },

  getToken(): string | null {
    return currentToken;
    return ""
  },

  isAuthenticated(): boolean {
    return !!currentToken;
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (currentToken) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(endpoint, config);

    if (!response.ok) {
      let errorMessage = "Une erreur est survenue lors de l'appel système";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  },

  // Auth Operations
  auth: {
    async login(username: string, password: string): Promise<{ token: string; user: Omit<User, "MotDePasse"> }> {
      const res = await api.request<{ token: string; user: Omit<User, "MotDePasse"> }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      api.setToken(res.token);
      return res;
    },
    async me(): Promise<Omit<User, "MotDePasse">> {
      return api.request<Omit<User, "MotDePasse">>("/api/auth/me");
    },
    logout() {
      api.setToken(null);
    }
  },

  // Users CRUD
  users: {
    async getAll(): Promise<User[]> {
      return api.request<User[]>("/api/users");
    },
    async create(data: Partial<User> & { MotDePasse: string }): Promise<User> {
      return api.request<User>("/api/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    async update(id: string, data: Partial<User>): Promise<User> {
      return api.request<User>(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    async resetPassword(id: string, password: string): Promise<{ success: boolean; message: string }> {
      return api.request<{ success: boolean; message: string }>(`/api/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ NouveauMotDePasse: password }),
      });
    },
    async delete(id: string): Promise<{ success: boolean; message: string }> {
      return api.request<{ success: boolean; message: string }>(`/api/users/${id}`, {
        method: "DELETE",
      });
    }
  },

  // Suppliers CRUD
  suppliers: {
    async getAll(): Promise<Supplier[]> {
      return api.request<Supplier[]>("/api/suppliers");
    },
    async create(data: Partial<Supplier>): Promise<Supplier> {
      return api.request<Supplier>("/api/suppliers", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
      return api.request<Supplier>(`/api/suppliers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    async delete(id: string): Promise<{ success: boolean; message: string }> {
      return api.request<{ success: boolean; message: string }>(`/api/suppliers/${id}`, {
        method: "DELETE",
      });
    }
  },

  // Agencies
  agencies: {
    async getAll(): Promise<string[]> {
      return api.request<string[]>("/api/agencies");
    },
    async create(name: string): Promise<string[]> {
      return api.request<string[]>("/api/agencies", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },
    async delete(name: string): Promise<string[]> {
      return api.request<string[]>(`/api/agencies/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
    }
  },

  // Services
  services: {
    async getAll(): Promise<string[]> {
      return api.request<string[]>("/api/services");
    },
    async create(name: string): Promise<string[]> {
      return api.request<string[]>("/api/services", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },
    async delete(name: string): Promise<string[]> {
      return api.request<string[]>(`/api/services/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
    }
  },

  // Orders CRUD
  orders: {
    async getAll(archived = false): Promise<Order[]> {
      return api.request<Order[]>(`/api/orders?archived=${archived}`);
    },
    async getHistory(id: string): Promise<{ order: Order; history: StatusHistory[] }> {
      return api.request<{ order: Order; history: StatusHistory[] }>(`/api/orders/${id}/history`);
    },
    async create(data: {
      NoBonCommande: string;
      NoDS: string;
      Designation: string;
      Quantite: number;
      Prix?: number;
      ReferenceSage?: string;
      DateLivraison: string;
      Statut: string;
      Agence: string;
      SupplierIds?: string[];
      Fournisseur?: string;
    }): Promise<Order> {
      return api.request<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    async createBulk(data: {
      items: Array<{
        NoBonCommande: string;
        NoDS: string;
        Designation: string;
        Quantite: number;
        Prix?: number;
        ReferenceSage?: string;
        DateLivraison: string;
        Statut: string;
        Agence: string;
        Fournisseur: string;
      }>;
    }): Promise<Order> {
      return api.request<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    async update(id: string, data: Partial<Order> & { SupplierIds?: string[]; Fournisseur?: string }): Promise<Order> {
      return api.request<Order>(`/api/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    async updateStatus(id: string, status: "En cours" | "Livré" | "Non livré" | "Terminé", observation?: string): Promise<Order> {
      return api.request<Order>(`/api/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ Statut: status, Observation: observation }),
      });
    },
    async delete(id: string): Promise<{ success: boolean; message: string }> {
      return api.request<{ success: boolean; message: string }>(`/api/orders/${id}`, {
        method: "DELETE",
      });
    },
    async archive(id: string): Promise<{ success: boolean; message: string }> {
      return api.request<{ success: boolean; message: string }>(`/api/orders/${id}/archive`, {
        method: "POST",
      });
    },
    async restore(id: string): Promise<{ success: boolean; message: string }> {
      return api.request<{ success: boolean; message: string }>(`/api/orders/${id}/restore`, {
        method: "POST",
      });
    }
  },

  // Archive Config
  archiveConfig: {
    async get(): Promise<{ autoArchiveDays: number; enableAutoArchive: boolean }> {
      return api.request<{ autoArchiveDays: number; enableAutoArchive: boolean }>("/api/archive/config");
    },
    async update(data: { autoArchiveDays: number; enableAutoArchive: boolean }): Promise<{ success: boolean }> {
      return api.request<{ success: boolean }>("/api/archive/config", {
        method: "POST",
        body: JSON.stringify(data),
      });
    }
  },

  // Stats / Dashboard
  stats: {
    async get(): Promise<DashboardStats> {
      return api.request<DashboardStats>("/api/stats");
    }
  },

  // System Logs
  logs: {
    async getAll(): Promise<ActivityLog[]> {
      return api.request<ActivityLog[]>("/api/logs");
    }
  },

  // Notifications
  notifications: {
    async getAll(): Promise<any[]> {
      return api.request<any[]>("/api/notifications");
    },
    async clear(): Promise<{ success: boolean; notifications: any[] }> {
      return api.request<{ success: boolean; notifications: any[] }>("/api/notifications/clear", {
        method: "POST",
      });
    },
    async markRead(id: string): Promise<{ success: boolean; notifications: any[] }> {
      return api.request<{ success: boolean; notifications: any[] }>(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
    },
    async markAllRead(): Promise<{ success: boolean; notifications: any[] }> {
      return api.request<{ success: boolean; notifications: any[] }>("/api/notifications/read-all", {
        method: "POST",
      });
    }
  }
};
