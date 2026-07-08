import {
  User,
  Cohort,
  SurveyField,
  Application,
  ApplicationWithTest,
  TestTask,
  UserTestTask,
  StudentDocumentData,
  TaskCard,
  CreateTaskCardDto,
  UpdateTaskCardDto,
  UpdateStudentDocumentDto,
  CohortParticipant,
  CreateCohortDto,
  UpdateCohortDto,
  SaveSurveyFieldsDto,
  SaveCohortRolesDto,
  SaveTestTaskDto,
  AdminApplication,
  AdminDocumentData,
  CohortRole,
  SaveReviewDto,
  StudentProfile,
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

// Базовый URL бэкенда
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class ApiClient {
  private baseURL = BACKEND_URL;
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

  /** Проверяет, используются ли моки */
  get isUsingMocks(): boolean {
    return this._fetchFn !== globalThis.fetch.bind(globalThis);
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Если используются моки, не добавляем baseURL
    const url = this.isUsingMocks ? endpoint : `${this.baseURL}${endpoint}`;
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
      apiClient.request<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    register: (data: { email: string; password: string }) =>
      apiClient.request<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    me: () => apiClient.request<User>("/me"),
  },

  cohorts: {
    list: () => apiClient.request<Cohort[]>("/cohorts"),
    get: (cohortId: string) =>
      apiClient.request<Cohort>(`/cohorts/${cohortId}`),
  },

  survey: {
    getFields: (cohortId: string) =>
      apiClient.request<SurveyField[]>(`/cohorts/${cohortId}/fields`),
  },

  applications: {
    submit: (data: { cohortId: string; surveyData: Record<string, string> }) =>
      apiClient.request<Application>("/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    getMy: () => apiClient.request<ApplicationWithTest[]>("/applications"),
    getAnswers: (applicationId: string) =>
      apiClient.request<{ fieldId: string; value: string }[]>(`/applications/${applicationId}/answers`),
    saveAnswers: (applicationId: string, answers: { fieldId: string; value: string }[]) =>
      apiClient.request<{ fieldId: string; value: string }[]>(`/applications/${applicationId}/answers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      }),
  },

  testTask: {
    get: (cohortId: string) =>
      apiClient.request<TestTask[]>(`/cohorts/${cohortId}/test-tasks`),
    getMy: (applicationId: string) =>
      apiClient.request<UserTestTask>(`/applications/${applicationId}/answers`),
    submit: (applicationId: string, answers: { fieldId: string; value: string }[]) =>
      apiClient.request<{ status: string }>(`/applications/${applicationId}/answers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      }),
    submitAnswer: (cohortId: string, answer: string) =>
      apiClient.request<{ status: string }>(`/cohorts/${cohortId}/test-tasks/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      }),
  },

  studentDocument: {
    get: (applicationId: string) =>
      apiClient.request<StudentDocumentData>(`/applications/${applicationId}/doc-data`),
    save: (applicationId: string, data: UpdateStudentDocumentDto) =>
      apiClient.request<StudentDocumentData>(`/applications/${applicationId}/doc-data`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  },

  taskCards: {
    list: (params: { cohortId?: string; date?: string }) =>
      apiClient.request<TaskCard[]>(`/tasks?${params.cohortId ? `cohortId=${params.cohortId}&` : ""}${params.date ? `date=${params.date}&` : ""}`.replace(/&$/, "")),
    listByApplication: (applicationId: string) =>
      apiClient.request<TaskCard[]>(`/applications/${applicationId}/tasks`),
    create: (applicationId: string, data: CreateTaskCardDto) =>
      apiClient.request<TaskCard>(`/applications/${applicationId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    update: (applicationId: string, taskId: string, data: UpdateTaskCardDto) =>
      apiClient.request<TaskCard>(`/applications/${applicationId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    delete: (applicationId: string, taskId: string) =>
      apiClient.request<void>(`/applications/${applicationId}/tasks/${taskId}`, {
        method: "DELETE",
      }),
  },

  cohortParticipants: {
    list: (cohortId: string) =>
      apiClient.request<CohortParticipant[]>(`/cohort-participants?cohortId=${cohortId}`),
  },

  // ===== Admin API =====
  admin: {
    // Когорты
    createCohort: (data: CreateCohortDto) =>
      apiClient.request<Cohort>("/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    updateCohort: (id: string, data: UpdateCohortDto) =>
      apiClient.request<Cohort>(`/cohorts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    deleteCohort: (id: string) =>
      apiClient.request<void>(`/cohorts/${id}`, {
        method: "DELETE",
      }),

    // Поля анкеты когорты
    getSurveyFields: (cohortId: string) =>
      apiClient.request<SurveyField[]>(`/cohorts/${cohortId}/fields`),
    saveSurveyFields: (cohortId: string, data: SaveSurveyFieldsDto) =>
      apiClient.request<SurveyField[]>(`/cohorts/${cohortId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // Роли когорты
    getRoles: (cohortId: string) =>
      apiClient.request<CohortRole[]>(`/cohorts/${cohortId}/roles`),
    saveRoles: (cohortId: string, data: SaveCohortRolesDto) =>
      apiClient.request<CohortRole[]>(`/cohorts/${cohortId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // Тестовое задание когорты
    getTestTask: (cohortId: string) =>
      apiClient.request<TestTask[]>(`/cohorts/${cohortId}/test-tasks`),
    saveTestTask: (cohortId: string, data: SaveTestTaskDto) =>
      apiClient.request<TestTask>(`/cohorts/${cohortId}/test-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

  // Эндпоинт для моков - использует question как legacy-поле
  saveTestTaskLegacy: (cohortId: string, question: string) =>
      apiClient.request<TestTask>(`/cohorts/${cohortId}/test-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      }),

    // Заявки
    getApplications: (cohortIds?: string[]) => {
      const params = cohortIds?.length ? `?cohortIds=${cohortIds.join(",")}` : "";
      return apiClient.request<AdminApplication[]>(`/applications${params}`);
    },
    reviewApplication: (id: string, data: { status: "APPROVED" | "REJECTED"; roleId?: string; reviewComment?: string }) =>
      apiClient.request<AdminApplication>(`/applications/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // Документы
    getDocuments: (cohortIds?: string[]) => {
      const params = cohortIds?.length ? `?cohortIds=${cohortIds.join(",")}` : "";
      return apiClient.request<AdminDocumentData[]>(`/applications${params}`);
    },
    saveReview: (applicationId: string, data: SaveReviewDto) =>
      apiClient.request<AdminDocumentData>(`/applications/${applicationId}/doc-data`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // Отчёт
    approveReport: (applicationId: string) =>
      apiClient.request<AdminDocumentData>(`/applications/${applicationId}/report/approve`, {
        method: "POST",
      }),
    rejectReport: (applicationId: string) =>
      apiClient.request<AdminDocumentData>(`/applications/${applicationId}/report/reject`, {
        method: "POST",
      }),

    // Профиль студента (пока мок, ждём эндпоинт от бэка)
    getUserProfile: (userId: string) =>
      apiClient.request<StudentProfile>(`/admin/users/${userId}/profile`),
  },
};

export { ApiClient, ApiError };
