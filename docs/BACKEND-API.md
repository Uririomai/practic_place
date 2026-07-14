# Backend API — Актуальная спецификация

> Источник: `GET /api-docs.json` на `localhost:3000` + анализ роутов.
> Дата обновления: 2026-07-13

---

## Общее

- **Base URL:** `/api` (через Next.js rewrites) или напрямую `http://localhost:3000`
- **Auth:** JWT Bearer token в заголовке `Authorization`
- **JWT payload:** `{ sub, email, role }` — role = `"STUDENT"` или `"ADMIN"`
- **Content-Type:** `application/json` (кроме multipart загрузок)
- **Формат дат:** ISO 8601 (`"2024-06-01T00:00:00.000Z"`)

---

## Auth (публичные)

| Метод | Путь | Тело запроса | Ответ |
|-------|------|-------------|-------|
| POST | `/auth/register` | `{ email, password }` | `{ user: { id, email }, token }` |
| POST | `/auth/login` | `{ email, password }` | `{ user: { id, email }, token }` |

> ⚠️ Ответ **не содержит** `fio` и `role` в объекте user. Роль определяется декодированием JWT.

---

## Profile

| Метод | Путь | Тело | Ответ |
|-------|------|------|-------|
| GET | `/me` | — | User (auth) |
| PATCH | `/me` | `{ activeCohortId: string }` | User с activeCohortId |

> PATCH `/me` — только для ADMIN. Меняет контекст активной когорты.

---

## Users

| Метод | Путь | Тело | Ответ | Доступ |
|-------|------|------|-------|--------|
| GET | `/users/:id` | — | User | auth |
| PATCH | `/users/:id` | `{ email?, profile? }` | User | auth (admin для email, own для profile) |
| DELETE | `/users/:id` | — | `{ ok: true }` | admin |
| GET | `/users/:id/profile` | — | Агрегат: user, applications, documents, tasks, cohorts, roles | auth |

---

## Cohorts

| Метод | Путь | Тело | Ответ | Доступ |
|-------|------|------|-------|--------|
| GET | `/cohorts` | — | Cohort[] | admin |
| GET | `/cohorts/active` | — | Cohort[] | public |
| POST | `/cohorts` | `{ name, applicationStart, applicationEnd, practiceStart, practiceEnd }` | Cohort | admin |
| GET | `/cohorts/:id` | — | Cohort | admin |
| PATCH | `/cohorts/:id` | частичный CohortInput | Cohort | admin |
| DELETE | `/cohorts/:id` | — | 204 | admin |

> ⚠️ DELETE `/cohorts/:id` — нельзя удалить когорту, если у неё есть заявки.

---

### Cohort Fields

| Метод | Путь | Тело | Ответ | Доступ |
|-------|------|------|-------|--------|
| GET | `/cohorts/:id/fields` | — | SurveyField[] | auth |
| POST | `/cohorts/:id/fields` | `{ label, type, options?, order? }` | SurveyField | admin |
| PUT | `/cohorts/:id/fields/order` | `{ items: [{ id, order }] }` | `{ ok: true }` | admin |
| PATCH | `/cohorts/:id/fields/:fieldId` | `{ label?, type?, options?, order? }` | SurveyField | admin |
| DELETE | `/cohorts/:id/fields/:fieldId` | — | 204 | admin |
| GET | `/cohorts/:id/fields/:fieldId` | — | SurveyField | auth |
| POST | `/cohorts/:id/fields/bulk` | `{ fields: [{ label, type, ... }] }` | SurveyField[] | admin |
| DELETE | `/cohorts/:id/fields` | — | 204 | admin |

> Типы полей: `TEXT`, `TEXTAREA`, `SELECT` (UPPERCASE).

---

### Cohort Roles

| Метод | Путь | Тело | Ответ | Доступ |
|-------|------|------|-------|--------|
| GET | `/cohorts/:id/roles` | — | CohortRole[] | admin |
| POST | `/cohorts/:id/roles` | `{ name }` | CohortRole | admin |
| PATCH | `/cohorts/:id/roles/:roleId` | `{ name }` | CohortRole | admin |
| DELETE | `/cohorts/:id/roles/:roleId` | — | 204 | admin |

> ⚠️ Уникальное ограничение: `(cohortId, name)` — нельзя создать две роли с одинаковым именем в одной когорте.
> При попытке создать дубликат бэкенд вернёт 400 с ошибкой unique constraint.

---

### Cohort Test Tasks

| Метод | Путь | Тело | Ответ | Доступ |
|-------|------|------|-------|--------|
| GET | `/cohorts/:id/test-tasks` | — | TestTask[] | auth (admin или студент с заявкой) |
| POST | `/cohorts/:id/test-tasks` | `{ roleId, content, publishedAt? }` | TestTask | admin |
| PATCH | `/cohorts/:id/test-tasks/:taskId` | `{ content?, roleId?, publishedAt? }` | TestTask | admin |
| DELETE | `/cohorts/:id/test-tasks/:taskId` | — | 204 | admin |

> ⚠️ На каждую роль — отдельное тестовое задание.
> `roleId` обязателен при создании. Задания возвращаются в порядке `publishedAt asc`.

---

### Cohort Document Templates

| Метод | Путь | Тело | Ответ | Доступ |
|-------|------|------|-------|--------|
| GET | `/cohorts/:id/document-templates` | — | DocumentTemplate[] | admin |
| POST | `/cohorts/:id/document-templates` | multipart: `file`, `name`, `slug`, `requirements?` | DocumentTemplate | admin |
| PATCH | `/cohorts/:id/document-templates/:templateId` | multipart: `file?`, `name?`, `slug?`, `requirements?` | DocumentTemplate | admin |
| DELETE | `/cohorts/:id/document-templates/:templateId` | — | 204 | admin |

---

## Applications

| Метод | Путь | Тело | Ответ | Доступ |
|-------|------|------|-------|--------|
| POST | `/applications` | `{ cohortId, roleId? }` | Application | auth |
| GET | `/applications` | — | Application[] | auth (студент — свои, админ — activeCohort) |
| GET | `/applications/:id` | — | Application с related data | auth (owner или admin) |
| PATCH | `/applications/:id/review` | `{ status: "APPROVED"\|"REJECTED", reviewComment? }` | Application | auth |
| PUT | `/applications/:id/answers` | `{ answers: [{ fieldId, value }] }` | Application с answers | auth (owner) |

> ⚠️ `POST /applications` принимает **только** `{ cohortId, roleId? }` — **без surveyData**.
> Анкета сохраняется отдельно через `PUT /applications/:id/answers`.

### Application Files

| Метод | Путь | Тело | Ответ | Доступ |
|-------|------|------|-------|--------|
| PUT | `/applications/:id/files/report` | multipart: `file` | ApplicationFile | auth (owner) |
| GET | `/applications/:id/files/report` | — | Binary stream | auth (owner с APPROVED, admin) |
| PATCH | `/applications/:id/files/report/status` | `{ status: "APPROVED"\|"REJECTED", comment? }` | ApplicationFile | admin |

### Application Documents

| Метод | Путь | Тело | Ответ | Доступ |
|-------|------|------|-------|--------|
| GET | `/applications/:id/documents` | — | `{ id, name, available, reason }[]` | auth (owner или admin) |
| GET | `/applications/:id/documents/:templateId` | — | Binary .docx stream | auth (owner или admin) |

### Application Tasks

| Метод | Путь | Тело | Ответ | Доступ |
|-------|------|------|-------|--------|
| GET | `/applications/:id/tasks` | — | TaskCard[] | auth (owner или admin) |
| POST | `/applications/:id/tasks` | `{ date, title, description, artifactLink? }` | TaskCard | auth (owner или admin) |
| PATCH | `/applications/:id/tasks/:taskId` | `{ title?, description?, artifactLink? }` | TaskCard | auth (owner или admin) |
| DELETE | `/applications/:id/tasks/:taskId` | — | 204 | admin |

---

## Health

| Метод | Путь | Ответ |
|-------|------|-------|
| GET | `/health` | `{ ok: true }` |

---

## Схемы (components/schemas)

```
User:              { id, email, role: "STUDENT"|"ADMIN", activeCohortId?, createdAt }
AuthResponse:      { user: { id, email }, token }
Cohort:            { id, name, applicationStart, applicationEnd, practiceStart, practiceEnd, createdAt }
CohortRole:        { id, cohortId, name }
SurveyField:       { id, cohortId, label, type: "TEXT"|"TEXTAREA"|"SELECT", options?, order }
Application:       { id, userId, cohortId, roleId?, status: "PENDING"|"APPROVED"|"REJECTED", reviewComment?, createdAt, user, cohort, role }
ApplicationAnswer: { id, applicationId, fieldId, value, field }
TaskCard:          { id, applicationId, date, title, description, artifactLink?, updatedAt }
TestTask:          { id, cohortId, roleId, content, publishedAt? }
```

> ⚠️ Отсутствующие в OpenAPI, но реально существующие поля в Prisma:
> - `Cohort.description` (String, default "")
> - `TestTask.roleId` (String, required)
> - `User.profile` (JSON)

---

## Ключевые расхождения с фронтендом

| Проблема | Фронтенд | Бэкенд |
|----------|----------|--------|
| Auth response | Ожидает `user.fio`, `user.role` | Возвращает только `id`, `email` |
| `GET /me` | Ожидает JSON | Редирект 301 на `/users/:id/profile` |
| Admin applications filter | `?cohortIds=...` | Фильтрует по `activeCohortId` (PATCH `/me`) |
| Survey submission | Один POST | Два шага: POST `/applications` + PUT `/answers` |
| Статусы | lowercase `"pending"` | UPPERCASE `"PENDING"`, `"APPROVED"`, `"REJECTED"` |
| TestTask в OpenAPI | — | Не содержит `roleId` (но есть в Prisma) |
| Cohort в OpenAPI | — | Не содержит `description` (но есть в Prisma) |

---

## Изменения 2026-07-13

- Обновлена дата обновления
- Исправлен Base URL: `localhost:3000` вместо `localhost:3001`
- Добавлено описание уникального ограничения для ролей `(cohortId, name)`
- Добавлено описание уникального ограничения для тестовых заданий по ролям
- Обновлены схемы: добавлен `TestTask.roleId` и `Cohort.description`
- Исправлены форматы дат (ISO 8601)
- Добавлено примечание о несоответствии OpenAPI и Prisma моделей
