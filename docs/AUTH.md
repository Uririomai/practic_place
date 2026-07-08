# Auth Module

## Назначение модуля

Модуль авторизации реализует регистрацию и вход пользователей. После входа пользователь получает JWT токен, который хранится в localStorage. Middleware защищает роуты.

## Архитектура

### JWT Token

Payload содержит:
- `userId` — идентификатор пользователя
- `role` — "admin" или "student"
- `exp` — время истечения (Unix timestamp)
- `iat` — время создания

### Middleware защиты

Проверка:
1. Токен из cookies (сервер) или localStorage (клиент)
2. JWT decode (не verify, токен уже валидный)
3. Проверка роли для админ роутов
4. Refresh: тихое обновление если токен истёк

### Поток авторизации

1. Login → JWT → localStorage + AuthContext
2. Защищённый роут → проверка middleware
3. 401/403 → редирект + toast уведомление
4. Logout → очистка токена + редирект

## Файлы

### `src/modules/auth/components/LoginForm.tsx`
- React Hook Form + Zod валидация
- Видимые сообщения об ошибках под полями
- Состояние загрузки на кнопке

### `src/modules/auth/components/RegisterForm.tsx`
- Подтверждение пароля + индикатор сложности
- Автовход после регистрации
- Валидация формата email

### `src/modules/auth/components/AuthGuard.tsx`
- Обёртка layout для защищённых страниц
- Спиннер загрузки во время проверки токена

## Страницы

- `/page.tsx` — лендинг (публичный вход в систему)
- `/app/(auth)/login/page.tsx` — страница входа
- `/app/(auth)/register/page.tsx` — регистрация

### Landing page

- **Header**: навигация (О проекте, Возможности) + CTA (Войти/Регистрация)
- **HeroSection**: главный заголовок + призыв к действию
- **FeaturesSection**: 4 карточки возможностей
- **CTASection**: финальный блок с кнопкой регистрации
- **Footer**: копирайт + ссылки

## Лучшие практики

- Проверка роли из JWT payload в middleware
- Тихий refresh в интерцепторе (refresh token в httpOnly cookie)
- localStorage для токена (требование ТЗ)
- Чёткие сообщения об ошибках для пользователей

## Security

### Защита от XSS

- Блокируем ввод опасных символов на фронтенде
- Server-side валидация обязательна (забота бекенда)
- JWT payload не доверяем — всегда проверяем на бекенде