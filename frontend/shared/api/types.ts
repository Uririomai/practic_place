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
export interface User {
  id: string;
  email: string;
  fio?: string; // Опционально: бэкенд может не возвращать
  role: "student" | "admin";
  activeCohortId?: string;
  createdAt: string;
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

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

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
  review_activities: string;
  review_characteristic: string;
  review_employed: boolean;
  review_next_practice: boolean;
  review_employment_offer: boolean;
  review_suggestions: string;
  review_grade: string;
  report_file_url?: string;
  report_admin_approved: boolean;
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
  roles: { name: string }[];
}

export interface SaveTestTaskDto {
  content: string;
}

// Заявка с информацией о пользователе (для админки)
export interface AdminApplication extends ApplicationWithTest {
  user: Pick<User, 'id' | 'email' | 'fio'>;
  cohort: Pick<Cohort, 'id' | 'name'>;
  role?: CohortRole;
  surveyData?: Record<string, string>;
}

export interface AdminDocumentData extends StudentDocumentData {
  user: Pick<User, 'id' | 'email' | 'fio'>;
  cohort: Pick<Cohort, 'id' | 'name'>;
  role?: CohortRole;
}

export interface SaveReviewDto {
  review_activities: string;
  review_characteristic: string;
  review_employed: boolean;
  review_next_practice: boolean;
  review_employment_offer: boolean;
  review_suggestions: string;
  review_grade: string;
}

// ===== Student Profile =====

export interface StudentProfile {
  user: User;
  applications: AdminApplication[];
  documents: AdminDocumentData[];
  tasks: TaskCard[];
  cohorts: Cohort[];
}