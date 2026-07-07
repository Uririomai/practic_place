# План API с ограничениями реализации

## 1. Когорты (Admin Only)

| Метод | Путь | Ограничения и логика |
| :--- | :--- | :--- |
| GET | `/cohorts` | Только для ADMIN. Получить список потоков. |
| POST | `/cohorts` | Только для ADMIN. Создать поток. |
| GET | `/cohorts/:id` | Только для ADMIN. Получить детали потока. |
| PATCH | `/cohorts/:id` | Только для ADMIN. Обновить поток. |
| DELETE | `/cohorts/:id` | Только для ADMIN. Удалить поток. Запретить удаление, если существуют связанные заявки. |

## 2. Роли в когорте (Admin Only)

| Метод | Путь | Ограничения и логика |
| :--- | :--- | :--- |
| GET | `/cohorts/:cohortId/roles` | Только для ADMIN. Получить список ролей когорты. |
| POST | `/cohorts/:cohortId/roles` | Только для ADMIN. Создать роль. |
| PATCH | `/cohorts/:cohortId/roles/:id` | Только для ADMIN. Изменить роль. |
| DELETE | `/cohorts/:cohortId/roles/:id` | Только для ADMIN. Запретить удаление, если существуют заявки с этой ролью. |

## 3. Поля анкеты

| Метод | Путь | Ограничения и логика |
| :--- | :--- | :--- |
| GET | `/cohorts/:cohortId/fields` | Доступно всем. Получить структуру анкеты для отображения формы. |
| POST | `/cohorts/:cohortId/fields` | Только для ADMIN. Добавить поле анкеты. |
| PATCH | `/cohorts/:cohortId/fields/:id` | Только для ADMIN. Изменить поле анкеты. |
| DELETE | `/cohorts/:cohortId/fields/:id` | Только для ADMIN. Удалить поле. Каскадно удалить связанные `ApplicationAnswer`. |
| PUT | `/cohorts/:cohortId/fields/order` | Только для ADMIN. Принимает массив ID и обновляет порядок полей. |

## 4. Тестовые задания (Admin Only)

| Метод | Путь | Ограничения и логика |
| :--- | :--- | :--- |
| GET | `/cohorts/:cohortId/test-tasks` | Только для ADMIN. Получить список тестовых заданий. |
| POST | `/cohorts/:cohortId/test-tasks` | Только для ADMIN. Создать тестовое задание. |
| PATCH | `/cohorts/:cohortId/test-tasks/:id` | Только для ADMIN. Изменить тестовое задание. |
| DELETE | `/cohorts/:cohortId/test-tasks/:id` | Только для ADMIN. Удалить тестовое задание. |

## 5. Заявки

| Метод | Путь | Ограничения и логика |
| :--- | :--- | :--- |
| POST | `/applications` | Студент. Можно создать только одну заявку на активную когорту. |
| GET | `/applications` | Студент — только свои заявки. ADMIN — все заявки, с возможностью фильтрации по `cohort_id` (query parameter). |
| GET | `/applications/:id` | Доступ: владелец заявки или ADMIN. |
| PATCH | `/applications/:id` | Студент. Разрешено только при `status == PENDING`. Можно изменить выбранную роль (`role_id`). |
| PATCH | `/applications/:id/review` | Только для ADMIN. Выполняет APPROVE/REJECT. При REJECT поле `review_comment` обязательно. |

## 6. Ответы на анкету

| Метод | Путь | Ограничения и логика |
| :--- | :--- | :--- |
| GET | `/applications/:id/answers` | Доступ: владелец заявки или ADMIN. Получить все ответы анкеты. |
| PUT | `/applications/:id/answers` | Только владелец. Атомарно сохранить все ответы (`[{ field_id, value }]`). Все `field_id` должны принадлежать когорте заявки. |

## 7. Данные для документов

| Метод | Путь | Ограничения и логика |
| :--- | :--- | :--- |
| GET | `/applications/:id/doc-data` | Доступ: владелец заявки или ADMIN. |
| PATCH | `/applications/:id/doc-data` | Только владелец. Обновить `student_fio`, `group`, `doc_fields`. Запретить изменение, если `status != PENDING`. |

## 8. Отчёт

| Метод | Путь | Ограничения и логика |
| :--- | :--- | :--- |
| PUT | `/applications/:id/report` | Только студент. Загрузить/обновить `report_file_url`. При обновлении сбрасывать `report_admin_approved = false`. |
| POST | `/applications/:id/report/approve` | Только для ADMIN. Одобрить отчёт. |
| POST | `/applications/:id/report/reject` | Только для ADMIN. Отклонить отчёт. |

## 9. Задачи практиканта

| Метод | Путь | Ограничения и логика |
| :--- | :--- | :--- |
| GET | `/applications/:id/tasks` | Доступ: владелец заявки или ADMIN. Получить список задач. |
| POST | `/applications/:id/tasks` | Только для ADMIN. Создать задачу. |
| PATCH | `/applications/:id/tasks/:taskId` | Только для ADMIN. Изменить `title`, `description`, `artifact_link`. |
| DELETE | `/applications/:id/tasks/:taskId` | Только для ADMIN. Удалить задачу. |

## 10. Профиль пользователя

| Метод | Путь | Ограничения и логика |
| :--- | :--- | :--- |
| GET | `/me` | Получить профиль текущего пользователя. |
| PATCH | `/me` | Только для ADMIN. Обновить профиль (например, `active_cohort_id`). Проверить существование указанной когорты. |
