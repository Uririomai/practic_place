import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  const { pathname } = request.nextUrl;

  // Публичные роуты
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/apply') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  const protectedRoutes = ['/cabinet', '/admin'];
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (!token && isProtected) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Проверка роли для админ-роутов
  if (token && pathname.startsWith('/admin')) {
    try {
      const payload = JSON.parse(atob(token.value.split('.')[1]));
      if (payload.role !== 'admin') {
        const cabinetUrl = new URL('/cabinet', request.url);
        return NextResponse.redirect(cabinetUrl);
      }
    } catch {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};