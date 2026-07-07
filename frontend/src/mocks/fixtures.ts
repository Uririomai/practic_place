import {
  Cohort,
  SurveyField,
  TestTask,
  UserTestTask,
  Application,
  StudentDocumentData,
  TaskCard,
} from "@/shared/api/types";

export const mockCohort: Cohort = {
  id: "test-cohort-id",
  name: "Тестовая когорта летней практики 2024",
  applicationStart: "2024-06-01",
  applicationEnd: "2024-06-15",
  practiceStart: "2024-07-01",
  practiceEnd: "2024-08-31",
};

export const mockSurveyFields: SurveyField[] = [
  {
    id: "fio",
    label: "ФИО",
    type: "text",
    placeholder: "Иванов Иван Иванович",
    required: true,
    order: 1,
  },
  {
    id: "group",
    label: "Группа",
    type: "text",
    placeholder: "РИ-330930",
    required: true,
    order: 2,
  },
  {
    id: "course",
    label: "Курс",
    type: "select",
    options: ["1", "2", "3", "4"],
    required: true,
    order: 3,
  },
  {
    id: "desired_role",
    label: "Желаемая роль",
    type: "select",
    options: ["Frontend", "Backend", "Аналитик", "Дизайнер"],
    required: true,
    order: 4,
  },
  {
    id: "tech_stack",
    label: "Используемые технологии",
    type: "textarea",
    placeholder: "React, Node.js, TypeScript...",
    required: true,
    order: 5,
  },
];

export const mockTestTask: TestTask = {
  id: "test-task-1",
  cohortId: "test-cohort-id",
  question: `Опишите основные этапы разработки веб-приложения с использованием React и Node.js.

Какие инструменты и подходы вы бы использовали для организации студенческой практики в университете?`,
  publishedAt: "2024-06-01T00:00:00Z",
};

export const mockUserTestTask: UserTestTask = {
  status: "not_submitted",
  answer: "",
};

export const mockApplications: Application[] = [
  {
    id: "app-1",
    userId: "user-1",
    cohortId: "test-cohort-id",
    status: "pending",
    surveyData: {
      fio: "Иванов Иван Иванович",
      group: "РИ-330930",
      course: "3",
      desired_role: "Frontend",
      tech_stack: "React, TypeScript, Next.js",
    },
    createdAt: "2024-06-01T00:00:00Z",
  },
];

export const mockStudentDocument: StudentDocumentData = {
  id: "doc-1",
  userId: "user-1",
  cohortId: "test-cohort-id",
  student_fio: "Иванов Иван Иванович",
  group: "РИ-330930",
  direction_code: "09.03.04",
  direction_name: "Программная инженерия",
  program_name: "Программная инженерия",
  specialty: "Программная инженерия",
  practice_topic: "Разработка веб-приложения для организации практики",
  main_stage_tasks: "Исследование, проектирование, разработка, тестирование",
  review_activities: "",
  review_characteristic: "",
  review_employed: false,
  review_next_practice: false,
  review_employment_offer: false,
  review_suggestions: "",
  review_grade: "",
  report_admin_approved: false,
};

export const mockTaskCards: TaskCard[] = [
  {
    id: "task-1",
    userId: "user-1",
    cohortId: "test-cohort-id",
    date: "2024-07-01",
    title: "Знакомство с проектом",
    description: "Изучение документации, настройка окружения",
    artifact_link: "https://github.com/example/repo",
    updated_at: "2024-07-01T14:00:00Z",
  },
  {
    id: "task-2",
    userId: "user-1",
    cohortId: "test-cohort-id",
    date: "2024-07-02",
    title: "Проектирование базы данных",
    description: "Создание ER-диаграммы, определение сущностей",
    artifact_link: "",
    updated_at: "2024-07-02T16:30:00Z",
  },
];