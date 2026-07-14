import {
	User,
	Cohort,
	SurveyField,
	Application,
	ApplicationWithTest,
	TestTask,
	UserTestTask,
	StudentDocumentData,
	ReviewData,
	TaskCard,
	CreateTaskCardDto,
	UpdateTaskCardDto,
	UpdateStudentDocumentDto,
	CohortParticipant,
	CohortStudent,
	CreateCohortDto,
	UpdateCohortDto,
	SaveSurveyFieldsDto,
	SaveCohortRolesDto,
	SaveTestTaskDto,
	AdminApplication,
	CohortRole,
	StudentProfile,
	DocumentTemplateAvailability,
	ApplicationFile,
	UserProfile,
} from './types'

class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message)
	}
}

// Тип функции fetch — можно заменить на мок
type FetchFn = typeof globalThis.fetch

// Базовый URL бэкенда
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL

/** Декодировать JWT и извлечь role (STUDENT/ADMIN) */
export function decodeTokenRole(token: string): 'student' | 'admin' {
	// Поддержка мок-токенов (для работы с MSW)
	if (token === 'mock-jwt-token-admin') return 'admin'
	if (token === 'mock-jwt-token-student') return 'student'

	// Реальный JWT от бэкенда
	try {
		const payload = JSON.parse(atob(token.split('.')[1]))
		return payload.role === 'ADMIN' ? 'admin' : 'student'
	} catch {
		return 'student'
	}
}

class ApiClient {
	private baseURL = BACKEND_URL
	private token: string | null = null
	private _fetchFn: FetchFn = globalThis.fetch.bind(globalThis)
	private _mockingEnabled = false

	setToken(token: string) {
		this.token = token
	}

	clearToken() {
		this.token = null
	}

	/** Заменить fetch-функцию (для мокирования) */
	setFetchFn(fn: FetchFn) {
		this._fetchFn = fn
		this._mockingEnabled = true
	}

	/** Вернуть оригинальный fetch */
	resetFetchFn() {
		this._fetchFn = globalThis.fetch.bind(globalThis)
		this._mockingEnabled = false
	}

	/** Проверяет, используются ли моки */
	get isUsingMocks(): boolean {
		return this._mockingEnabled
	}

	async request<T>(
		endpoint: string,
		options?: RequestInit & { responseType?: 'json' | 'blob' },
	): Promise<T> {
		const url = `${this.baseURL}${endpoint}`
		const headers = new Headers(options?.headers)
		const responseType = options?.responseType

		if (this.token) {
			headers.set('Authorization', `Bearer ${this.token}`)
		}

		const response = await this._fetchFn(url, {
			...options,
			headers,
		})

		return this.handleResponse<T>(response, responseType)
	}

	private async handleResponse<T>(
		response: Response,
		responseType?: 'json' | 'blob',
	): Promise<T> {
		if (!response.ok) {
			const error = await response
				.json()
				.catch(() => ({ message: 'Server error' }))
			throw new ApiError(error.message || error.error || 'Server error', response.status)
		}
		if (responseType === 'blob') {
			return response.blob() as Promise<T>
		}
		// Обработка пустых ответов (204 No Content и т.д.)
		const text = await response.text()
		if (!text || text.trim() === '') {
			return undefined as T
		}
		return JSON.parse(text)
	}
}

export const apiClient = new ApiClient()

// API методы
export const api = {
	auth: {
		login: (data: { email: string; password: string }) =>
			apiClient.request<{ token: string; user: User }>('/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
		register: (data: { email: string; password: string }) =>
			apiClient.request<{ token: string; user: User }>('/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
		me: () => apiClient.request<User>('/me'),
		updateActiveCohort: (activeCohortId: string) =>
			apiClient.request<User>('/me', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ activeCohortId }),
			}),
	},

	users: {
		getMe: () => apiClient.request<User>('/me'),
		getProfile: (userId: string) =>
			apiClient.request<StudentProfile>(`/users/${userId}/profile`),
		updateProfile: (userId: string, profile: UserProfile) =>
			apiClient.request<User>(`/users/${userId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ profile }),
			}),
		setActiveCohort: (activeCohortId: string) =>
			apiClient.request<User>(`/me`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ activeCohortId }),
			}),
	},

	cohorts: {
		list: () => apiClient.request<Cohort[]>('/cohorts'),
		active: () => apiClient.request<Cohort[]>('/cohorts/active'),
		get: (cohortId: string) =>
			apiClient.request<Cohort>(`/cohorts/${cohortId}`),
		getStudents: (cohortId: string) =>
			apiClient.request<CohortStudent[]>(`/cohorts/${cohortId}/students`),
	},

	survey: {
		getFields: async (cohortId: string) => {
			const fields = await apiClient.request<SurveyField[]>(
				`/cohorts/${cohortId}/fields`,
			)
			return fields.map(f => ({
				...f,
				type: f.type.toLowerCase() as SurveyField['type'],
				options: Array.isArray(f.options) ? f.options : [],
			}))
		},
	},

	applications: {
		submit: (data: { cohortId: string }) =>
			apiClient.request<Application>('/applications', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
		getMy: () => apiClient.request<ApplicationWithTest[]>('/applications'),
		getAnswers: (applicationId: string) =>
			apiClient.request<{ fieldId: string; value: string }[]>(
				`/applications/${applicationId}/answers`,
			),
		saveAnswers: (
			applicationId: string,
			answers: { fieldId: string; value: string }[],
		) =>
			apiClient.request<{ fieldId: string; value: string }[]>(
				`/applications/${applicationId}/answers`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ answers }),
				},
			),
	},

	testTask: {
		get: (cohortId: string) =>
			apiClient.request<TestTask[]>(`/cohorts/${cohortId}/test-tasks`),
		getMy: (applicationId: string) =>
			apiClient.request<UserTestTask>(`/applications/${applicationId}/answers`),
		submit: (
			applicationId: string,
			answers: { fieldId: string; value: string }[],
		) =>
			apiClient.request<{ status: string }>(
				`/applications/${applicationId}/answers`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ answers }),
				},
			),
		submitAnswer: (cohortId: string, answer: string) =>
			apiClient.request<{ status: string }>(
				`/cohorts/${cohortId}/test-tasks/submit`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ answer }),
				},
			),
		submitTestAnswer: (applicationId: string, testAnswer: string) =>
			apiClient.request<{ status: string }>(
				`/applications/${applicationId}/test-answer`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ testAnswer }),
				},
			),
	},

	studentDocument: {
		get: (applicationId: string) =>
			apiClient.request<StudentDocumentData>(
				`/applications/${applicationId}/doc-data`,
			),
		save: (applicationId: string, data: UpdateStudentDocumentDto) =>
			apiClient.request<StudentDocumentData>(
				`/applications/${applicationId}/doc-data`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data),
				},
			),
	},

	// Отзыв
	review: {
		get: (applicationId: string) =>
			apiClient.request<ReviewData>(`/applications/${applicationId}/review`),
		save: (applicationId: string, data: Partial<ReviewData>) =>
			apiClient.request<ReviewData>(`/applications/${applicationId}/review`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
	},

	// Новые эндпоинты документов (реальный бэкенд)
	documents: {
		// Список доступных документов с шаблонами
		list: (applicationId: string) =>
			apiClient.request<DocumentTemplateAvailability[]>(
				`/applications/${applicationId}/documents`,
			),

		// Скачивание документа по шаблону
		download: (applicationId: string, templateId: string) =>
			apiClient.request<Blob>(
				`/applications/${applicationId}/documents/${templateId}`,
				{
					responseType: 'blob',
				},
			),

		// Скачивание отчёта
		downloadReport: (applicationId: string) =>
			apiClient.request<Blob>(`/applications/${applicationId}/files/report`, {
				responseType: 'blob',
			}),

		// Загрузка отчёта (multipart)
		uploadReport: (applicationId: string, file: File) => {
			const formData = new FormData()
			formData.append('file', file)
			return apiClient.request<ApplicationFile>(
				`/applications/${applicationId}/files/report`,
				{
					method: 'PUT',
					body: formData,
					// НЕ устанавливать Content-Type — браузер сам поставит multipart/form-data с boundary
				},
			)
		},
	},

	taskCards: {
		list: (params: { cohortId?: string; date?: string }) =>
			apiClient.request<TaskCard[]>(
				`/tasks?${params.cohortId ? `cohortId=${params.cohortId}&` : ''}${params.date ? `date=${params.date}&` : ''}`.replace(
					/&$/,
					'',
				),
			),
		listByApplication: (applicationId: string) =>
			apiClient.request<TaskCard[]>(`/applications/${applicationId}/tasks`),
		create: (applicationId: string, data: CreateTaskCardDto) =>
			apiClient.request<TaskCard>(`/applications/${applicationId}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
		update: (applicationId: string, taskId: string, data: UpdateTaskCardDto) =>
			apiClient.request<TaskCard>(
				`/applications/${applicationId}/tasks/${taskId}`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data),
				},
			),
		delete: (applicationId: string, taskId: string) =>
			apiClient.request<void>(
				`/applications/${applicationId}/tasks/${taskId}`,
				{
					method: 'DELETE',
				},
			),
	},

	cohortParticipants: {
		list: (cohortId: string) =>
			apiClient.request<CohortParticipant[]>(
				`/cohort-participants?cohortId=${cohortId}`,
			),
	},

	// ===== Admin API =====
	admin: {
		// Когорты
		createCohort: (data: CreateCohortDto) =>
			apiClient.request<Cohort>('/cohorts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
		updateCohort: (id: string, data: UpdateCohortDto) =>
			apiClient.request<Cohort>(`/cohorts/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
		deleteCohort: (id: string) =>
			apiClient.request<void>(`/cohorts/${id}`, {
				method: 'DELETE',
			}),

		// Поля анкеты когорты
		// Бэкенд возвращает заглавные типы (TEXT), фронтенд ожидает строчные (text)
		getSurveyFields: async (cohortId: string) => {
			const fields = await apiClient.request<SurveyField[]>(
				`/cohorts/${cohortId}/fields`,
			)
			return fields.map(f => ({
				...f,
				type: f.type.toLowerCase() as SurveyField['type'],
			}))
		},
		// Удалить все поля анкеты
		deleteAllSurveyFields: (cohortId: string) =>
			apiClient.request<void>(`/cohorts/${cohortId}/fields`, {
				method: 'DELETE',
			}),
		// Бэкенд принимает одно поле за запрос: { label, type, options?, order? }
		// Prisma enum использует заглавные: TEXT, TEXTAREA, SELECT
		saveSurveyFields: async (cohortId: string, data: SaveSurveyFieldsDto) => {
			// Сначала удаляем все существующие поля
			await apiClient.request<void>(`/cohorts/${cohortId}/fields`, {
				method: 'DELETE',
			})
			// Затем создаём новые
			const results: SurveyField[] = []
			for (const field of data.fields) {
				const created = await apiClient.request<SurveyField>(
					`/cohorts/${cohortId}/fields`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ ...field, type: field.type.toUpperCase() }),
					},
				)
				results.push(created)
			}
			return results
		},

		// Роли когорты
		getRoles: (cohortId: string) =>
			apiClient.request<CohortRole[]>(`/cohorts/${cohortId}/roles`),
		// Бэкенд принимает одну роль за раз: { name }
		saveRoles: async (cohortId: string, data: SaveCohortRolesDto) => {
			const results: CohortRole[] = []
			for (const role of data.roles) {
				const created = await apiClient.request<CohortRole>(
					`/cohorts/${cohortId}/roles`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ name: role.name }),
					},
				)
				results.push(created)
			}
			return results
		},
		deleteRole: (cohortId: string, roleId: string) =>
			apiClient.request<void>(`/cohorts/${cohortId}/roles/${roleId}`, {
				method: 'DELETE',
			}),

		// Тестовое задание когорты
		getTestTask: (cohortId: string) =>
			apiClient.request<TestTask[]>(`/cohorts/${cohortId}/test-tasks`),
		saveTestTask: (cohortId: string, data: SaveTestTaskDto) =>
			apiClient.request<TestTask>(`/cohorts/${cohortId}/test-tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
		updateTestTask: (cohortId: string, taskId: string, data: Partial<SaveTestTaskDto>) =>
			apiClient.request<TestTask>(`/cohorts/${cohortId}/test-tasks/${taskId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
		deleteTestTask: (cohortId: string, taskId: string) =>
			apiClient.request<void>(`/cohorts/${cohortId}/test-tasks/${taskId}`, {
				method: 'DELETE',
			}),

		// Шаблоны документов когорты
		getDocumentTemplates: (cohortId: string) =>
			apiClient.request<
				{
					id: string
					name: string
					slug: string
					uri: string
					requirements: Record<string, unknown>
				}[]
			>(`/cohorts/${cohortId}/document-templates`),
		createDocumentTemplate: (
			cohortId: string,
			file: File,
			name: string,
			slug: string,
			requirements?: Record<string, unknown>,
		) => {
			const formData = new FormData()
			formData.append('file', file)
			formData.append('name', name)
			formData.append('slug', slug)
			if (requirements)
				formData.append('requirements', JSON.stringify(requirements))
			return apiClient.request<{ id: string; name: string }>(
				`/cohorts/${cohortId}/document-templates`,
				{ method: 'POST', body: formData },
			)
		},
		deleteDocumentTemplate: (cohortId: string, templateId: string) =>
			apiClient.request<void>(
				`/cohorts/${cohortId}/document-templates/${templateId}`,
				{
					method: 'DELETE',
				},
			),
		updateDocumentTemplate: (
			cohortId: string,
			templateId: string,
			file?: File,
			name?: string,
			slug?: string,
		) => {
			const formData = new FormData()
			if (file) formData.append('file', file)
			if (name) formData.append('name', name)
			if (slug) formData.append('slug', slug)
			return apiClient.request<{ id: string; name: string }>(
				`/cohorts/${cohortId}/document-templates/${templateId}`,
				{ method: 'PATCH', body: formData },
			)
		},

		// Эндпоинт для моков - использует question как legacy-поле
		saveTestTaskLegacy: (cohortId: string, question: string) =>
			apiClient.request<TestTask>(`/cohorts/${cohortId}/test-tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question }),
			}),

		// Заявки
		getApplications: (cohortIds?: string[]) => {
			const params = cohortIds?.length
				? `?cohortIds=${cohortIds.join(',')}`
				: ''
			return apiClient.request<AdminApplication[]>(`/applications${params}`)
		},
		getApplication: (id: string) =>
			apiClient.request<
				AdminApplication & {
					answers?: {
						fieldId: string
						value: string
						field: { id: string; label: string; type: string }
					}[]
				}
			>(`/applications/${id}`),
		reviewApplication: (
			id: string,
			data: {
				status: 'APPROVED' | 'REJECTED'
				roleId?: string
				reviewComment?: string
			},
		) =>
			apiClient.request<AdminApplication>(`/applications/${id}/review`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
		assignTest: (id: string, roleId: string) =>
			apiClient.request<AdminApplication>(`/applications/${id}/assign-test`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleId }),
			}),
		reviewTestTask: (
			id: string,
			data: {
				status: 'APPROVED' | 'REJECTED'
				reviewComment?: string
			},
		) =>
			apiClient.request<AdminApplication>(`/applications/${id}/review`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),

		// Документы — загружаем заявки с файлами
		getApplicationsWithFiles: async () => {
			const apps = await apiClient.request<Application[]>(`/applications`)
			// Для каждой заявки загружаем детали с файлами
			const detailed = await Promise.all(
				apps.map(async app => {
					try {
						const full = await apiClient.request<
							Application & { files?: ApplicationFile[] }
						>(`/applications/${app.id}`)
						return full
					} catch {
						return { ...app, files: [] } as Application & {
							files: ApplicationFile[]
						}
					}
				}),
			)
			return detailed
		},

		// Отчёт — PATCH /applications/:id/files/report/status
		approveReport: (applicationId: string) =>
			apiClient.request<ApplicationFile>(
				`/applications/${applicationId}/files/report/status`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: 'APPROVED' }),
				},
			),
		rejectReport: (applicationId: string, comment?: string) =>
			apiClient.request<ApplicationFile>(
				`/applications/${applicationId}/files/report/status`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: 'REJECTED', comment }),
				},
			),

		// Профиль студента (пока мок, ждём эндпоинт от бэка)
		getUserProfile: (userId: string) =>
			apiClient.request<StudentProfile>(`/users/${userId}/profile`),

		// Все пользователи с когортами и ролями
		getUsers: () => apiClient.request<{ users: User[]; cohorts: Cohort[]; roles: CohortRole[] }>('/users'),
	},
}

export { ApiClient, ApiError }
