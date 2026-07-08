# API Contract

## Auth эндпоинты

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| POST | /api/auth/register | Регистрация пользователя | ❌ |
| POST | /api/auth/login | Вход, возвращает JWT токен | ❌ |
| GET | /api/auth/me | Текущий пользователь | ✅ |

## Когорты

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| GET | /api/cohorts | Все когорты | ✅ Админ |
| GET | /api/cohorts/active | Активная когорта (open приём) | ❌ |
| POST | /api/cohorts | Создание когорты | ✅ Админ |
| PUT | /api/cohorts/:id | Обновление когорты | ✅ Админ |
| POST | /api/survey/fields | Создание полей анкеты | ✅ Админ |
| GET | /api/survey/fields?cohortId= | Поля анкеты | ❌ |

## Заявки

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| POST | /api/applications | Создание заявки | ✅ |
| GET | /api/applications/my | Мои заявки | ✅ |
| GET | /api/admin/applications?cohortId= | Все заявки когорты | ✅ Админ |
| PUT | /api/admin/applications/:id/approve | Одобрить (нужен roleId) | ✅ Админ |
| PUT | /api/admin/applications/:id/reject | Отклонить (нужен comment) | ✅ Админ |

## Тестовое задание

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| GET | /api/test-task?cohortId= | Тестовое задание (админ) | ✅ Админ |
| GET | /api/test-task/my?cohortId= | Мой тест (статус + ответ) | ✅ |
| POST | /api/test-task | Создание теста | ✅ Админ |
| POST | /api/test-task/submit | Отправка ответа | ✅ |
| GET | /api/test-task/status/:applicationId | Статус теста студента | ✅ Админ |

## Документы

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| GET | /api/student-document?cohortId= | Данные документов студента | ✅ |
| PUT | /api/student-document | Сохранение полей | ✅ |
| POST | /api/admin/student-document/review | Сохранить отзыв админом | ✅ Админ |
| GET | /api/admin/documents?cohortId= | Все документы когорты | ✅ Админ |
| POST | /api/documents/generate | Скачать docx | ✅ |
| POST | /api/documents/upload-report | Загрузить файл отчёта | ✅ |

## Задачи

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| GET | /api/task-cards?cohortId=&week= | Карточки задач | ✅ |
| POST | /api/task-cards | Создание карточки | ✅ |
| PUT | /api/task-cards/:id | Обновление карточки | ✅ |

## Коды ошибок

| Код | Описание | UI реакция |
|-----|----------|------------|
| 400 | Ошибка валидации | Подсвечивание полей |
| 401 | Не авторизован | Редирект на /login |
| 403 | Недостаточно прав | "Доступ запрещён" |
| 404 | Не найдено | "Запрашиваемый ресурс не найден" |
| 500 | Ошибка сервера | "Ошибка сервера, попробуйте позже" |

## Авторизация

JWT токен передаётся в заголовке `Authorization: Bearer <token>`.

Срок действия токена: 24 часа (по умолчанию).

## Файлы

Загрузка файлов через multipart/form-data:
- Обязательные поля: file, cohortId
- Поддерживаемые форматы: PDF, DOCX