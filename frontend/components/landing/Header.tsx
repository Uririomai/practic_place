"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/shared/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  ClipboardList,
  FileStack,
  CalendarDays,
  LogOut,
  GraduationCap,
  Users,
} from "lucide-react";

function getInitials(fio?: string): string {
  const name = fio || "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

const studentLinks = [
  { href: "/cabinet/profile", label: "Профиль", icon: User },
  { href: "/cabinet/applications", label: "Заявки", icon: ClipboardList },
  { href: "/cabinet/documents", label: "Документы", icon: FileStack },
  { href: "/cabinet/tasks", label: "Задачи", icon: CalendarDays },
];

const adminLinks = [
  { href: "/admin/cohorts", label: "Когорты", icon: GraduationCap },
  { href: "/admin/applications", label: "Заявки", icon: ClipboardList },
  { href: "/admin/documents", label: "Документы", icon: FileStack },
  { href: "/admin/tasks", label: "Задачи", icon: CalendarDays },
  { href: "/admin/users", label: "Пользователи", icon: Users },
];

export function Header() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-2xl text-primary">
            Практика
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/#about">О проекте</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/#features">Возможности</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/#contact">Контакты</Link>
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            /* Авторизован — аватар + дропдаун */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full outline-none transition-opacity hover:opacity-80">
                  <span className="hidden text-sm font-medium md:inline">
                    {user.fio || user.email}
                  </span>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {getInitials(user.fio)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg">
                <DropdownMenuLabel>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(user.role === "admin" ? adminLinks : studentLinks).map((link) => {
                  const Icon = link.icon;
                  return (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href} className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Не авторизован — кнопки входа/регистрации */
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Войти</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Регистрация</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
