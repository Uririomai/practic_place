"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
        <p className="text-sm text-muted-foreground">
          © 2024 Платформа «Практика». Все права защищены.
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/#about" className="text-sm text-muted-foreground hover:text-foreground">
            О проекте
          </Link>
          <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground">
            Возможности
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Войти
          </Link>
        </nav>
      </div>
    </footer>
  );
}