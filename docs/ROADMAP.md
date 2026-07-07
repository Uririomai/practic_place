# Дорожная карта проекта «Практика»

## Зависимости проекта

### Основные:
```bash
npm install next@14 react@18 react-dom@18 typescript@5
npm install tailwindcss@3 postcss autoprefixer
npm install zod react-hook-form
npm install date-fns
npm install @radix-ui/react-* (через shadcn/ui)
```

### shadcn/ui компоненты:
```bash
npx shadcn-ui@latest add button input form dialog sheet tabs table card badge select
npx shadcn-ui@latest add calendar popover command avatar dropdown-menu
```

### Dev зависимости:
```bash
npm install -D eslint prettier eslint-plugin-react eslint-plugin-react-hooks
npm install -D playwright @playwright/test
npm install -D @types/node @types/react
```

---

## ЭТАП 1: Auth + API-клиент ✅

### Задачи:
- [x] Главная лендинговая страница (`/`)
- [x] Header с навигацией (Главная, О проекте)
- [x] CTA-блоки с переходом к регистрации
- [x] Инициализация Next.js проекта
- [x] Установка зависимостей
- [x] API-клиент (client.ts)
- [x] Хук useAuth
- [x] LoginForm + RegisterForm
- [x] AuthGuard компонент
- [x] Middleware защиты роутов

**После выполнения:** Можно регистрироваться, входить в систему, лендинг привлекает новых пользователей

---

## ЭТАП 2: Когорты + публичная анкета ✅

### Задачи:
- [x] Страница `/apply/[cohortId]/survey`
- [x] Dynamic SurveyForm (из SurveyField)
- [x] Автоподстановка данных (hook use-auto-fill-form)
- [x] Кнопка отправки заявки
- [x] Страница `/apply/[cohortId]/test`
- [x] TestTaskView компонент
- [x] Skeleton loader для неопубликованного теста
- [x] TestStatusBadge (not_submitted/pending/approved/rejected)
- [x] Кнопка "Отправить заново" при rejected

**После выполнения:** Пользователь может подать заявку через публичную форму

---

## ЭТАП 2.5: Система мокирования API ✅

### Задачи:
- [x] MswProvider подключён к root layout
- [x] Fetch-interceptor через apiClient.setFetchFn (без service worker)
- [x] MSW handlers для auth, cohorts, survey, applications, test-task
- [x] Mock-данные (fixtures.ts): когорта, анкета, тест, заявки, документы, задачи
- [x] API-клиент расширен методами: survey, applications/my, studentDocument, taskCards
- [x] Переключение моков через NEXT_PUBLIC_API_MOCKING в .env
- [x] UI компоненты: dialog, sheet, badge, skeleton, textarea
- [x] shadcn/ui конфигурация (components.json)

**После выполнения:** Все запросы мокаются на клиенте, реальный бэкенд подключается выключением флага

---

## ЭТАП 3: Личный кабинет - сайдбар + вкладки ✅

### Задачи:
- [x] Layout для (cabinet) с auth guard
- [x] Sidebar компонент (256px, иконки + текст, навигация)
- [x] Мобильная адаптация (бургер-меню + выдвижной сайдбар)
- [x] Профиль пользователя (email, ID, дата, когорта)
- [x] Анкета в кабинете (SurveyForm + API-загрузка полей)
- [x] Тестовое задание в кабинете (TestTaskView + API)
- [x] Выход из аккаунта из сайдбара

**После выполнения:** Полноценный личный кабинет с навигацией

---

## ЭТАП 4: Личный кабинет - документы ✅

### Задачи:
- [x] Страница `/cabinet/documents`
- [x] DocumentsTab компонент (3 карточки: ИЗ, Отзыв, Титульный лист)
- [x] Статусы документов (готово/ожидание/не готово)
- [x] Кнопка «Скачать» для готовых документов
- [x] API: GET/PUT /api/student-document
- [x] Mock-данные для документов

**После выполнения:** Пользователь видит статус своих документов

---

## ЭТАП 5: Личный кабинет - задачи ✅

### Задачи:
- [x] Страница `/cabinet/tasks`
- [x] TasksTab компонент (недельная сетка пн-пт)
- [x] Навигация по неделям (← →)
- [x] Модалка создания/редактирования карточки (Dialog)
- [x] Поля: название, описание, ссылка на артефакт
- [x] API: GET/POST/PUT /api/task-cards
- [x] Mock-данные для карточек задач

**После выполнения:** Пользователь может заполнять задачи по неделям

---

## ЭТАП 6: Админ-панель - когорты ⬜

### Задачи:
- [ ] Layout для (admin) с CohortSelector
- [ ] CohortContext + sessionStorage
- [ ] CohortSelector компонент
- [ ] CohortForm
- [ ] SurveyFieldsEditor
- [ ] API: CRUD /api/cohorts

**После выполнения:** Админ может создавать когорты

---

## ЭТАП 7: Админ-панель - заявки ⬜

### Задачи:
- [ ] Страница `/admin/applications`
- [ ] Таблица заявок с пагинацией
- [ ] ApplicationReview модальное окно
- [ ] Inline role selector + PATCH endpoint
- [ ] Approve/Reject с комментарием
- [ ] Undo toast после смены роли

**После выполнения:** Админ может одобрить/отклонить заявки

---

## ЭТАП 8: Админ-панель - документы ⬜

### Задачи:
- [ ] Страница `/admin/documents`
- [ ] DocumentApprovalTable
- [ ] Пагинация 25 + поиск по ФИО
- [ ] Virtual scroll для 100+ студентов
- [ ] Review форма админом
- [ ] Галочка "можно скачивать" для титульного листа

**После выполнения:** Админ видит готовность документов всех студентов

---

## ЭТАП 9: Админ-панель - задачи ⬜

### Задачи:
- [ ] Страница `/admin/tasks`
- [ ] TaskCardList (все задачи)
- [ ] Группировка по студентам
- [ ] Время обновления в карточках
- [ ] Пагинация для больших списков

**После выполнения:** Админ видит все задачи студентов

---

## ЭТАП 10: Финальная доработка ⬜

### Задачи:
- [ ] Accessibility (aria-label, keyboard nav)
- [ ] Тесты (Playwright)
- [ ] Лоадеры и skeleton'ы
- [ ] Error boundaries
- [ ] ESLint/Prettier configs
- [ ] README для frontend
- [ ] Build и deploy (Docker)

**После выполнения:** MVP готов, работает стабильно

---

## Легенда

- ⬜ Не начато
- 🔄 В работе
- ✅ Готово
- ⏭ Пропущено

**Статус:** ЭТАПЫ 1-5 готовы. Следующий: ЭТАП 6 (Админ-панель - когорты)