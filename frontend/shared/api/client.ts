import {
  User,
  Cohort,
  SurveyField,
  Application,
  TestTask,
  UserTestTask,
  StudentDocumentData,
  TaskCard,
  CreateTaskCardDto,
  UpdateTaskCardDto,
  UpdateStudentDocumentDto,
} from "./types";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

// Тип функции fetch — можно заменить на мок
type FetchFn = typeof globalThis.fetch;

class ApiClient {
  private baseURL = "";
  private token: string | null = null;
  private _fetchFn: FetchFn = globalThis.fetch.bind(globalThis);

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  /** Заменить fetch-функцию (для мокирования) */
  setFetchFn(fn: FetchFn) {
    this._fetchFn = fn;
  }

  /** Вернуть оригинальный fetch */
  resetFetchFn() {
    this._fetchFn = globalThis.fetch.bind(globalThis);
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = new Headers(options?.headers);

    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    const response = await this._fetchFn(url, {
      ...options,
      headers,
    });

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.message || "Server error", response.status);
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();

// API методы
export const api = {
  auth: {
    login: (data: { email: string; password: string }) =>
      apiClient.request<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    register: (data: { email: string; password: string }) =>
      apiClient.request<{ token: string; user: User }>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    me: () => apiClient.request<User>("/api/auth/me"),
  },

  cohorts: {
    get: (cohortId: string) =>
      apiClient.request<Cohort>(`/api/cohorts/${cohortId}`),
  },

  survey: {
    getFields: () =>
      apiClient.request<SurveyField[]>("/api/survey/fields"),
  },

  applications: {
    submit: (data: { cohortId: string; surveyData: Record<string, string> }) =>
      apiClient.request<Application>("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    getMy: () => apiClient.request<Application[]>("/api/applications/my"),
  },

  testTask: {
    get: (cohortId: string) =>
      apiClient.request<TestTask>(`/api/test-task?cohortId=${cohortId}`),
    getMy: (cohortId: string) =>
      apiClient.request<UserTestTask>(`/api/test-task/my?cohortId=${cohortId}`),
    submit: (data: { cohortId: string; answer: string }) =>
      apiClient.request<{ status: string }>("/api/test-task/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  },

  studentDocument: {
    get: (cohortId: string) =>
      apiClient.request<StudentDocumentData>(`/api/student-document?cohortId=${cohortId}`),
    save: (data: UpdateStudentDocumentDto) =>
      apiClient.request<StudentDocumentData>("/api/student-document", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  },

  taskCards: {
    list: (cohortId: string, week: string) =>
      apiClient.request<TaskCard[]>(`/api/task-cards?cohortId=${cohortId}&week=${week}`),
    create: (data: CreateTaskCardDto) =>
      apiClient.request<TaskCard>("/api/task-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateTaskCardDto) =>
      apiClient.request<TaskCard>(`/api/task-cards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  },
};

export { ApiClient, ApiError };
