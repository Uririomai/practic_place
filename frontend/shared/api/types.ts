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
  status: ApplicationStatus;
  surveyData: Record<string, string>;
  reviewComment?: string;
  createdAt: string;
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
  question: string;
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
  userId: string;
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
  userId: string;
  cohortId: string;
  date: string;
  title: string;
  description: string;
  artifact_link: string;
  updated_at: string;
}

export interface CreateTaskCardDto {
  cohortId: string;
  date: string;
  title: string;
  description: string;
  artifact_link?: string;
}

export interface UpdateTaskCardDto {
  title?: string;
  description?: string;
  artifact_link?: string;
}

export interface UpdateStudentDocumentDto {
  cohortId: string;
  student_fio?: string;
  group?: string;
  direction_code?: string;
  direction_name?: string;
  program_name?: string;
  specialty?: string;
  practice_topic?: string;
  main_stage_tasks?: string;
}