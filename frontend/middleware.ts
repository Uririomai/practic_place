import { NextRequest, NextResponse } from 'next/server';

/** Декодировать role из JWT (STUDENT/ADMIN) */
function getRoleFromToken(tokenValue: string): "STUDENT" | "ADMIN" | null {
  // Поддержка мок-токенов (для работы с MSW)
  if (tokenValue === "mock-jwt-token-admin") return "ADMIN";
  if (tokenValue === "mock-jwt-token-student") return "STUDENT";

  // Реальный JWT от бэкенда
  try {
    const payload = JSON.parse(atob(tokenValue.split('.')[1]));
    return payload.role; // "STUDENT" или "ADMIN"
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  const { pathname } = request.nextUrl;

  // Публичные роуты
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/' ||
    pathname.startsWith('/apply') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // Если авторизован и на странице входа/регистрации — редирект в кабинет
  if (token && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    const role = getRoleFromToken(token.value);
    const redirectUrl = new URL(role === 'ADMIN' ? '/admin' : '/cabinet', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  const protectedRoutes = ['/cabinet', '/admin'];
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (!token && isProtected) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Проверка роли
  if (token) {
    const role = getRoleFromToken(token.value);

    // Админ не может зайти в лк студента
    if (role === 'ADMIN' && pathname.startsWith('/cabinet')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // Студент не может зайти в админку
    if (role === 'STUDENT' && pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/cabinet', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};