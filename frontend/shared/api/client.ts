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
  ApproveApplicationDto,
  RejectApplicationDto,
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
    list: () => apiClient.request<Cohort[]>("/api/cohorts"),
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
    getMy: () => apiClient.request<ApplicationWithTest[]>("/api/applications/my"),
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

  cohortParticipants: {
    list: (cohortId: string) =>
      apiClient.request<CohortParticipant[]>(`/api/cohort-participants?cohortId=${cohortId}`),
  },

  // ===== Admin API =====
  admin: {
    // Когорты
    createCohort: (data: CreateCohortDto) =>
      apiClient.request<Cohort>("/api/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    updateCohort: (id: string, data: UpdateCohortDto) =>
      apiClient.request<Cohort>(`/api/cohorts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    deleteCohort: (id: string) =>
      apiClient.request<void>(`/api/cohorts/${id}`, {
        method: "DELETE",
      }),

    // Поля анкеты когорты
    saveSurveyFields: (cohortId: string, data: SaveSurveyFieldsDto) =>
      apiClient.request<SurveyField[]>(`/api/cohorts/${cohortId}/survey-fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // Роли когорты
    getRoles: (cohortId: string) =>
      apiClient.request<CohortRole[]>(`/api/cohorts/${cohortId}/roles`),
    saveRoles: (cohortId: string, data: SaveCohortRolesDto) =>
      apiClient.request<CohortRole[]>(`/api/cohorts/${cohortId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // Тестовое задание когорты
    getTestTask: (cohortId: string) =>
      apiClient.request<TestTask>(`/api/cohorts/${cohortId}/test-task`),
    saveTestTask: (cohortId: string, data: SaveTestTaskDto) =>
      apiClient.request<TestTask>(`/api/cohorts/${cohortId}/test-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // Заявки когорты
    getApplications: (cohortIds?: string[]) => {
      const params = cohortIds?.length ? `?cohortIds=${cohortIds.join(",")}` : "";
      return apiClient.request<AdminApplication[]>(`/api/admin/applications${params}`);
    },
    approveApplication: (id: string, data: ApproveApplicationDto) =>
      apiClient.request<AdminApplication>(`/api/admin/applications/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    rejectApplication: (id: string, data: RejectApplicationDto) =>
      apiClient.request<AdminApplication>(`/api/admin/applications/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    updateApplicationRole: (id: string, roleId: string) =>
      apiClient.request<AdminApplication>(`/api/admin/applications/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      }),

    // Документы когорты
    getDocuments: (cohortIds?: string[]) => {
      const params = cohortIds?.length ? `?cohortIds=${cohortIds.join(",")}` : "";
      return apiClient.request<AdminDocumentData[]>(`/api/admin/documents${params}`);
    },
    saveReview: (documentId: string, data: SaveReviewDto) =>
      apiClient.request<AdminDocumentData>(`/api/admin/student-document/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, ...data }),
      }),

    // Отчёт
    approveReport: (documentId: string) =>
      apiClient.request<AdminDocumentData>(`/api/admin/student-document/${documentId}/report/approve`, {
        method: "PUT",
      }),
    rejectReport: (documentId: string) =>
      apiClient.request<AdminDocumentData>(`/api/admin/student-document/${documentId}/report/reject`, {
        method: "PUT",
      }),

    // Профиль студента
    getUserProfile: (userId: string) =>
      apiClient.request<StudentProfile>(`/api/admin/users/${userId}/profile`),
  },
};

export { ApiClient, ApiError };
