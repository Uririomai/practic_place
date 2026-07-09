# Запросы к бэкенду от фронтенда

Документ для бэкенд-разработчика. Описывает недостающие эндпоинты и необходимые изменения для полноценной интеграции с фронтендом.

---

## 1. Добавить CORS middleware

Фронтенд работает на `http://localhost:3000`, бэкенд на `http://localhost:3001`. Без CORS браузер блокирует запросы.

```bash
npm i cors
npm i -D @types/cors
```

```ts
// src/app.ts
import cors from "cors";

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
}));
```

---

## 2. Добавить `fio` в User response

Фронтенд отображает ФИО пользователя в шапке, сайдбаре, таблицах. Бэкенд не возвращает `fio`.

### Где нужно добавить

**POST `/auth/login` и POST `/auth/register`** — добавить `fio` в объект user:

```json
{
  "user": {
    "id": "cmrc53rh20000pa203wrgch3i",
    "email": "admin123@example.com",
    "fio": "Петров Пётр Петрович",
    "role": "ADMIN"
  },
  "token": "eyJ..."
}
```

**GET `/me`** — аналогично добавить `fio`.

### Варианты реализации

1. Добавить поле `fio` в таблицу `User` в Prisma schema
2. Или вернуть `fio` из связанной таблицы (если есть)

---

## 3. Добавить `GET /admin/users/:id/profile`

Агрегированный эндпоинт для профиля студента. Фронтенд использует его на странице `/admin/users/[userId]`.

### Запрос

```
GET /admin/users/:userId
Authorization: Bearer <admin_token>
```

### Ответ

```json
{
  "user": {
    "id": "user-1",
    "email": "student@example.com",
    "fio": "Иванов Иван Иванович",
    "role": "STUDENT",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "applications": [
    {
      "id": "app-1",
      "cohortId": "cohort-1",
      "cohort": { "id": "cohort-1", "name": "Практика 2024" },
      "roleId": "role-1",
      "role": { "id": "role-1", "name": "Frontend" },
      "status": "APPROVED",
      "surveyData": { "phone": "+7...", "group": "РИ-330930" },
      "testStatus": "approved",
      "testAnswer": "Ответ на тест...",
      "createdAt": "2024-01-15T00:00:00Z"
    }
  ],
  "documents": [
    {
      "id": "doc-1",
      "applicationId": "app-1",
      "cohortId": "cohort-1",
      "student_fio": "Иванов Иван Иванович",
      "group": "РИ-330930",
      "direction_code": "09.03.01",
      "direction_name": "Информатика",
      "program_name": "Программная инженерия",
      "specialty": "Программист",
      "practice_topic": "Разработка веб-приложения",
      "main_stage_tasks": "Задачи...",
      "review_activities": "",
      "review_characteristic": "",
      "review_employed": false,
      "review_next_practice": false,
      "review_employment_offer": false,
      "review_suggestions": "",
      "review_grade": "",
      "report_file_url": null,
      "report_admin_approved": false
    }
  ],
  "tasks": [
    {
      "id": "task-1",
      "applicationId": "app-1",
      "date": "2024-07-01T00:00:00Z",
      "title": "Настройка окружения",
      "description": "Установить Node.js, настроить проект",
      "artifactLink": "https://github.com/...",
      "updatedAt": "2024-07-01T14:30:00Z"
    }
  ],
  "cohorts": [
    {
      "id": "cohort-1",
      "name": "Практика 2024",
      "applicationStart": "2024-06-01T00:00:00Z",
      "applicationEnd": "2024-06-15T00:00:00Z",
      "practiceStart": "2024-07-01T00:00:00Z",
      "practiceEnd": "2024-08-31T00:00:00Z",
      "createdAt": "2024-05-01T00:00:00Z"
    }
  ]
}
```

---

## 4. Добавить `GET /cohort-participants`

Список участников когорты с ролями. Фронтенд использует это в админке для отображения задач всех студентов.

### Запрос

```
GET /cohort-participants?cohortId=cohort-1
Authorization: Bearer <admin_token>
```

### Ответ

```json
[
  {
    "userId": "user-1",
    "email": "student1@example.com",
    "fio": "Иванов Иван Иванович",
    "role": "Frontend"
  },
  {
    "userId": "user-2",
    "email": "student2@example.com",
    "fio": "Петрова Анна Сергеевна",
    "role": "Backend"
  }
]
```

---

## 5. Исправить `GET /applications` для админа

Сейчас `GET /applications` для админа возвращает заявки по `activeCohortId`. Фронтенд хочет фильтровать по списку когорт.

### Текущее поведение

```
GET /applications
→ Возвращает заявки для activeCohortId пользователя
```

### Нужное поведение

```
GET /applications?cohortIds=cohort-1,cohort-2
→ Возвращает заявки для указанных когорт
```

---

## 6. Исправить `POST /applications/:id/review`

Фронтенд отправляет `roleId` при одобрении и `comment` при отклонении в разных телах запроса.

### Текущее поведение

```
PATCH /applications/:id/review
Body: { status: "APPROVED" | "REJECTED", reviewComment?: string }
```

### Нужное поведение (адаптировать фронт)

Фронтенд будет адаптироваться под этот формат. Убедитесь, что:

1. При `status: "APPROVED"` — можно передать `roleId` для назначения роли
2. При `status: "REJECTED"` — передаётся `reviewComment`

```json
// Одобрение с ролью
PATCH /applications/app-1/review
{
  "status": "APPROVED",
  "roleId": "role-1"
}

// Отклонение с комментарием
PATCH /applications/app-1/review
{
  "status": "REJECTED",
  "reviewComment": "Не хватает опыта"
}
```

---

## 7. Добавить `GET /applications/:id/test-status`

Статус тестового задания для конкретной заявки. Фронтенд использует это во вкладке "Тест" в профиле студента.

### Запрос

```
GET /applications/:id/test-status
Authorization: Bearer <token>
```

### Ответ

```json
{
  "status": "approved",
  "answer": "Мой ответ на тест...",
  "submittedAt": "2024-07-05T10:00:00Z"
}
```

Возможные статусы: `not_submitted`, `pending`, `approved`, `rejected`

---

## 8. Исправить `GET /cohorts/:id/test-tasks`

Фронтенд ожидает массив тестов, бэкенд возвращает массив. Это уже совпадает, но убедитесь, что:

1. Возвращается `content` (не `question`)
2. Поле `publishedAt` есть в ответе

---

## 9. Добавить `GET /admin/documents` с фильтрацией

Фронтенд хочет получать документы с фильтрацией по когортам.

### Запрос

```
GET /admin/documents?cohortIds=cohort-1,cohort-2
Authorization: Bearer <admin_token>
```

### Ответ

```json
[
  {
    "id": "doc-1",
    "userId": "user-1",
    "cohortId": "cohort-1",
    "user": { "id": "user-1", "email": "...", "fio": "..." },
    "cohort": { "id": "cohort-1", "name": "..." },
    "student_fio": "...",
    "group": "...",
    "direction_code": "...",
    "direction_name": "...",
    "program_name": "...",
    "specialty": "...",
    "practice_topic": "...",
    "main_stage_tasks": "...",
    "review_activities": "...",
    "review_characteristic": "...",
    "review_employed": false,
    "review_next_practice": false,
    "review_employment_offer": false,
    "review_suggestions": "...",
    "review_grade": "...",
    "report_file_url": null,
    "report_admin_approved": false
  }
]
```

---

## 10. Добавить `GET /admin/applications` с фильтрацией

Аналогично документам — фильтрация по списку когорт.

### Запрос

```
GET /admin/applications?cohortIds=cohort-1,cohort-2
Authorization: Bearer <admin_token>
```

### Ответ

```json
[
  {
    "id": "app-1",
    "userId": "user-1",
    "cohortId": "cohort-1",
    "user": { "id": "user-1", "email": "...", "fio": "..." },
    "cohort": { "id": "cohort-1", "name": "..." },
    "roleId": "role-1",
    "role": { "id": "role-1", "name": "Frontend" },
    "status": "APPROVED",
    "reviewComment": null,
    "testStatus": "approved",
    "testAnswer": "...",
    "surveyData": { "phone": "+7...", "group": "РИ-330930" },
    "createdAt": "2024-01-15T00:00:00Z"
  }
]
```

---

## Сводная таблица

| # | Эндпоинт | Тип | Приоритет |
|---|----------|-----|-----------|
| 1 | CORS middleware | Настройка | 🔴 Критично |
| 2 | `fio` в User | Изменение | 🔴 Критично |
| 3 | `GET /admin/users/:id/profile` | Новый | 🔴 Критично |
| 4 | `GET /cohort-participants` | Новый | 🟡 Важно |
| 5 | `GET /applications?cohortIds=` | Изменение | 🟡 Важно |
| 6 | `PATCH /applications/:id/review` | Уточнение | 🟡 Важно |
| 7 | `GET /applications/:id/test-status` | Новый | 🟢 Желательно |
| 8 | `GET /cohorts/:id/test-tasks` | Проверка | 🟢 Желательно |
| 9 | `GET /admin/documents?cohortIds=` | Изменение | 🟡 Важно |
| 10 | `GET /admin/applications?cohortIds=` | Изменение | 🟡 Важно |

---

## Новые эндпоинты бэкенда (требуют адаптации фронта)

### File Upload/Download

Бэкенд поддерживает загрузку файлов через multer:

| Метод | Путь | Описание |
|-------|------|----------|
| PUT | `/applications/:id/files/report` | Загрузка отчёта (multipart/form-data) |
| GET | `/applications/:id/files/report` | Скачивание отчёта |
| PATCH | `/applications/:id/files/report/status` | Одобрение/отклонение отчёта |

### Document Templates

Бэкенд поддерживает шаблоны документов:

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/cohorts/:id/document-templates` | Список шаблонов |
| POST | `/cohorts/:id/document-templates` | Создание шаблона |
| PATCH | `/cohorts/:id/document-templates/:id` | Обновление шаблона |
| DELETE | `/cohorts/:id/document-templates/:id` | Удаление шаблона |

### Document Generation

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/applications/:id/documents` | Список доступных документов |
| GET | `/applications/:id/documents/:templateId` | Скачивание документа |

---

## Статус

- [ ] CORS middleware
- [ ] `fio` в User response
- [ ] `GET /admin/users/:id/profile`
- [ ] `GET /cohort-participants`
- [ ] `GET /applications?cohortIds=`
- [ ] `PATCH /applications/:id/review` (roleId + comment)
- [ ] `GET /applications/:id/test-status`
- [ ] `GET /admin/documents?cohortIds=`
- [ ] `GET /admin/applications?cohortIds=`
- [ ] Адаптировать фронт для file upload/download
- [ ] Адаптировать фронт для document templates
- [ ] Адаптировать фронт для document generation
