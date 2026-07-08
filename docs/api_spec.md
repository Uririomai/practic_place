# Спецификация API сервиса "Практика"

## 1. Когорты (Admin Only)
| Метод | Путь | Назначение | Логика и ограничения | Ответ |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/cohorts` | Список всех потоков | Только ADMIN. | 200 |
| POST | `/cohorts` | Создание когорты | Только ADMIN. | 201 |
| GET | `/cohorts/:id` | Детали когорты | Только ADMIN. | 200 |
| PATCH | `/cohorts/:id` | Редактирование | Только ADMIN. | 200 |
| DELETE | `/cohorts/:id` | Удаление | Только ADMIN. Запрещено, если есть связанные `Application`. | 204/403 |

## 2. Роли (Admin Only)
| Метод | Путь | Назначение | Логика и ограничения | Ответ |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/cohorts/:cohortId/roles` | Список ролей | Только ADMIN. | 200 |
| POST | `/cohorts/:cohortId/roles` | Добавление роли | Только ADMIN. | 201 |
| PATCH | `/cohorts/:cohortId/roles/:id` | Обновление | Только ADMIN. | 200 |
| DELETE | `/cohorts/:cohortId/roles/:id` | Удаление | Запрещено, если есть `Application` с этой ролью. | 204/403 |

## 3. Анкетирование
| Метод | Путь | Назначение | Логика и ограничения | Ответ |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/cohorts/:cohortId/fields` | Получить структуру | Публично (для подачи заявки). | 200 |
| POST | `/cohorts/:cohortId/fields` | Добавить поле | Только ADMIN. | 201 |
| PUT | `/cohorts/:cohortId/fields/order` | Сортировка | Только ADMIN. Массив ID для обновления `order`. | 200 |
| DELETE | `/cohorts/:cohortId/fields/:id` | Удаление поля | Только ADMIN. Каскадное удаление `ApplicationAnswer`. | 204 |

## 4. Тестовые задания
| Метод | Путь | Назначение | Логика и ограничения | Ответ |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/cohorts/:cohortId/test-tasks` | Список заданий | Только ADMIN. | 200 |
| POST | `/cohorts/:cohortId/test-tasks` | Создание | Только ADMIN. | 201 |
| PATCH | `/cohorts/:cohortId/test-tasks/:id` | Редактирование | Только ADMIN. | 200 |

## 5. Заявки (Applications)
| Метод | Путь | Назначение | Логика и ограничения | Ответ |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/applications` | Создание заявки | Студент. Ограничение: 1 заявка на 1 активную когорту. | 201 |
| GET | `/applications` | Список заявок | Студент: свои. ADMIN: фильтр по `cohortId` обязателен. | 200 |
| PATCH | `/applications/:id/review` | Вердикт (Approve/Reject) | Только ADMIN. При `REJECT` поле `review_comment` обязательно. | 200 |

## 6. Данные для документов и отчеты
| Метод | Путь | Назначение | Логика и ограничения | Ответ |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/applications/:id/doc-data` | Чтение данных | Владелец или ADMIN. | 200 |
| PATCH | `/applications/:id/doc-data` | Заполнение доков | Только студент. Запрещено, если `status != PENDING`. | 200 |
| PUT | `/applications/:id/report` | Загрузка отчета | Только студент. Сбрасывает `report_admin_approved` на `false`. | 200 |
| POST | `/applications/:id/report/approve` | Допуск к титульнику | Только ADMIN. | 200 |

## 7. Задачи (TaskCards)
| Метод | Путь | Назначение | Логика и ограничения | Ответ |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/applications/:id/tasks` | Список задач | Владелец или ADMIN. | 200 |
| POST | `/applications/:id/tasks` | Добавление задачи | Только ADMIN (согласно ТЗ, п. 10.3). | 201 |
| PATCH | `/applications/:id/tasks/:taskId` | Обновление задачи | Только ADMIN. Фиксирует `updated_at`. | 200 |

## 8. Профиль и контекст
| Метод | Путь | Назначение | Логика и ограничения | Ответ |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/me` | Текущий профиль | Авторизованный пользователь. | 200 |
| PATCH | `/me` | Смена когорты админом | Только ADMIN. Валидация `active_cohort_id` в БД. | 200 |
