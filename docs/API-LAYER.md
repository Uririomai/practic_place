# API Layer Architecture

## Назначение слоя

API-слоя отвечает за единый интерфейс связи с бекендом. Все HTTP-запросы осуществляются через один клиент с автоматической подстановкой токена и обработкой ошибок.

## Файлы

### `src/shared/api/client.ts`
Конфигурация:
- `baseURL` — берётся из `NEXT_PUBLIC_API_URL`
- `token` — хранится в памяти, подставляется в заголовок `Authorization: Bearer`
- `request()` — универсальный метод для GET/POST/PUT/DELETE
- Обработка: 401 → редирект на `/login`, 403 → сообщение "Доступ запрещён"

### `src/shared/api/types.ts`
TypeScript интерфейсы для всех сущностей:
- `User` — id, email, createdAt
- `Cohort` — id, name, даты начала/окончания приёма и практики
- `SurveyField` — поле анкеты (id, label, type, options, order)
- `Application` — заявка с surveyData и статусом
- `StudentDocumentData` — 15 полей для заполнения документов
- `TaskCard` — карточка задачи с датой, заголовком, артефактом

### `src/shared/hooks/use-api.ts`
Хук предоставляет:
- `data` — ответ сервера
- `loading` — флаг загрузки
- `error` — ошибка запроса
- `execute()` — запуск промиса с обработкой состояний

### `src/shared/hooks/use-auth.ts`
Хук управляет:
- `user` — текущий пользователь
- `token` — JWT токен
- `login()` — сохранение токена в localStorage
- `logout()` — очистка токена, редирект на `/login`

### `src/shared/hooks/use-test-status.ts`
Хук для отслеживания статуса теста:
- `status` — not_submitted/pending/approved/rejected
- `answer` — ответ студента
- `refresh()` — обновление статуса
- `submit(answer)` — отправка ответа на проверку

## Взаимодействие

API-клиент вызывается из бизнес-логики модулей. Компоненты используют хук `useApi` для получения данных. При ошибке 401 middleware перехватывает и редиректит.

## MSW Mock Server

### Установка
```bash
npm install -D msw whatwg-fetch
```

### Структура
```
src/mocks/
├── browser.ts   # MSW для клиента
├── server.ts    # MSW для Node.js (SSR/тесты)
├── handlers.ts  # Handlers для ручек
└── fixtures.ts  # Мок-данные
```

### Переключение моков
```bash
# .env.development
NEXT_PUBLIC_API_MOCKING=true

# .env.production
NEXT_PUBLIC_API_MOCKING=false
```

### Использование
```typescript
// handlers.ts
export const handlers = [
  rest.get('/api/cohorts/:cohortId', (req, res, ctx) => {
    return res(ctx.json(mockCohort));
  }),
];
```

## Лучшие практики

- Типы выносятся в `types.ts` — единый источник правды
- Ошибки обрабатываются в централизованном месте (не в каждом компоненте)
- Токен хранится в localStorage — для мобильных устройств удобнее, чем cookies
- MSW для мок-сервера (NEXT_PUBLIC_API_MOCKING=true)

## Интерцептор с оптимистичными обновлениями

- PUT/PATCH запросы с оптимистичным обновлением
- Перекрываем UI, отображаем "Сохраняется..."
- При ошибке: откатываем изменения и показываем toast