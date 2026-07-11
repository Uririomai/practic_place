 # Practice — Backend

 REST API для управления практикой студентов: заявки, задачи, генерация документов.

 ## Запуск

 ### Docker (рекомендуется)

 ```sh
 # dev — hot-reload, swagger включён, БД пересоздаётся при изменении schema.prisma
 npm run compose:dev:up

 # prod — финальная сборка, миграции из migrations/
 npm run compose:prod:up

 # test — разовый прогон тестов на чистой БД
 npm run compose:test
 ```

 Сервер на `http://localhost:3000`, Swagger UI на `/api-docs`.

 ### Вручную

 ```sh
 cp .env.example .env
 npm install
 npx prisma generate
 npx prisma db push
 npm run dev
 ```

 Нужен запущенный PostgreSQL по адресу из `DATABASE_URL` в `.env`.

 ## Переменные окружения

 | Var | По умолчанию | Зачем |
 |-----|-------------|-------|
 | `DATABASE_URL` | — | Строка подключения к PostgreSQL |
 | `JWT_SECRET` | — | Ключ подписи токенов |
 | `PORT` | `3000` | HTTP порт |
 | `SWAGGER_ENABLED` | `false` | Включить `/api-docs` (в dev включён) |
 | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | Админ создаётся при первом запуске |
 | `STORAGE_TYPE` | `file` | `file` или `s3` |
 | `S3_*` | — | Настройки S3 (см. `.env.example`) |

