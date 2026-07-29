// Auth DTOs
export interface RegisterDto {
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Сущности

export interface UserProfile {
  student_fio?: string;
  group?: string;
  direction_code?: string;
  direction_name?: string;
  program_name?: string;
  specialty?: string;
  practice_topic?: string;
  main_stage_tasks?: string;
}

export interface User {
  id: string;
  email: string;
  fio?: string; // Опционально: бэкенд может не возвращать
  role: "student" | "admin";
  activeCohortId?: string;
  activeRole?: Pick<CohortRole, 'id' | 'name'>;
  createdAt: string;
  profile?: UserProfile;
}

export interface Cohort {
  id: string;
  name: string;
  applicationStart: string;
  applicationEnd: string;
  practiceStart: string;
  practiceEnd: string;
}

export interface SurveyField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  order: number;
  placeholder?: string;
  required?: boolean;
}

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'TEST_ASSIGNED';

export interface Application {
  id: string;
  userId: string;
  cohortId: string;
  roleId?: string;
  status: ApplicationStatus;
  reviewComment?: string;
  createdAt: string;
  cohort?: Pick<Cohort, 'id' | 'name'>;
  role?: Pick<CohortRole, 'id' | 'name'>;
  user?: Pick<User, 'id' | 'email'>;
}

// Заявка со статусом тестового задания
export interface ApplicationWithTest extends Application {
  testStatus: TestTaskStatus;
  testAnswer?: string;
  surveyData?: Record<string, string>;
}

export interface CohortRole {
  id: string;
  cohortId: string;
  name: string;
}

export type TestTaskStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

export interface TestTask {
  id: string;
  cohortId: string;
  roleId: string;
  content: string;
  publishedAt?: string;
}

export interface UserTestTask {
  status: TestTaskStatus;
  answer?: string;
  adminComment?: string;
  submittedAt?: string;
}

export interface StudentDocumentData {
  id: string;
  applicationId: string;
  cohortId: string;
  student_fio: string;
  group: string;
  direction_code: string;
  direction_name: string;
  program_name: string;
  specialty: string;
  practice_topic: string;
  main_stage_tasks: string;
}

// Отзыв — данные для генерации документа
export interface ReviewData {
  id: string;
  applicationId: string;
  review_activities: string;
  review_characteristic: string;
  review_employed: string;      // "да" / "нет"
  review_next_practice: string; // "да" / "нет"
  review_employment_offer: string; // "да" / "нет"
  review_suggestions: string;
  review_grade: string;
}

// Шаблон документа с информацией о доступности
export interface DocumentTemplateAvailability {
  id: string;
  name: string;
  slug: string;
  available: boolean;
  reason?: string;
}

// Файл заявки (отчёт)
export interface ApplicationFile {
  id: string;
  applicationId: string;
  type: string;
  storageUri: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;
  uploadedAt: string;
  reviewedAt?: string;
}

export interface TaskCard {
  id: string;
  applicationId: string;
  cohortId?: string; // Для фильтрации в StudentProfile
  userId?: string; // Для совместимости с UI
  date: string;
  title: string;
  description: string;
  artifactLink: string;
  updatedAt: string;
}

export interface CreateTaskCardDto {
  applicationId: string;
  date: string;
  title: string;
  description: string;
  artifactLink?: string;
}

export interface UpdateTaskCardDto {
  title?: string;
  description?: string;
  artifactLink?: string;
}

export interface UpdateStudentDocumentDto {
  student_fio?: string;
  group?: string;
  direction_code?: string;
  direction_name?: string;
  program_name?: string;
  specialty?: string;
  practice_topic?: string;
  main_stage_tasks?: string;
  // Отзыв
  review_activities?: string;
  review_characteristic?: string;
  review_employed?: boolean;
  review_next_practice?: boolean;
  review_employment_offer?: boolean;
  review_suggestions?: string;
  review_grade?: string;
}

// Участник когорты (GET /cohorts/:id/students)
export interface CohortStudent {
  user: {
    id: string;
    email: string;
    profile?: Record<string, string>;
  };
  application: {
    id: string;
    status: string;
    role?: {
      id: string;
      name: string;
    };
  };
  tasks: {
    id: string;
    date: string;
    title: string;
    description: string;
    artifactLink: string;
    updatedAt: string;
  }[];
}

// Участник когорты (для вкладки «Задачи» — режим «Показать всех»)
export interface CohortParticipant {
  userId: string;
  email: string;
  fio: string;
  role: string;
}

// ===== Admin DTOs =====

export interface CreateCohortDto {
  name: string;
  applicationStart: string;
  applicationEnd: string;
  practiceStart: string;
  practiceEnd: string;
}

export interface UpdateCohortDto {
  name?: string;
  applicationStart?: string;
  applicationEnd?: string;
  practiceStart?: string;
  practiceEnd?: string;
}

export interface SaveSurveyFieldsDto {
  fields: Omit<SurveyField, 'id'>[];
}

export interface SaveCohortRolesDto {
  roles: { id?: string; name: string }[];
}

export interface SaveTestTaskDto {
  roleId: string;
  content: string;
  publishedAt?: string;
}

// Заявка с информацией о пользователе (для админки)
export interface ApplicationAnswer {
  id: string;
  applicationId: string;
  fieldId: string;
  value: string;
  field: { id: string; label: string; type: string; order?: number };
}

export interface AdminApplication extends ApplicationWithTest {
  user: Pick<User, 'id' | 'email' | 'fio'>;
  cohort: Pick<Cohort, 'id' | 'name' | 'applicationStart' | 'applicationEnd' | 'practiceStart' | 'practiceEnd'>;
  role?: CohortRole;
  surveyData?: Record<string, string>;
  answers?: ApplicationAnswer[];
}

export interface AdminDocumentData {
  user: Pick<User, 'id' | 'email' | 'fio'>;
  applicationId: string;
  cohort: Pick<Cohort, 'id' | 'name'>;
  role?: CohortRole;
  // ИЗ — данные индивидуального задания
  iz?: StudentDocumentData;
  // Отзыв
  review?: ReviewData;
  // Отчёт
  report?: ApplicationFile;
  // Доступные документы
  documents?: DocumentTemplateAvailability[];
}

// ===== Student Profile =====

export interface StudentProfile {
  user: User;
  applications: AdminApplication[];
  documents: AdminDocumentData[];
  tasks: TaskCard[];
  cohorts: Cohort[];
}