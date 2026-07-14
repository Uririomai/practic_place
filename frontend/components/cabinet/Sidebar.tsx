"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/shared/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import {
  User,
  ClipboardList,
  FileStack,
  CalendarDays,
  LogOut,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";

const navItems = [
  { href: "/cabinet/profile", label: "Профиль", icon: User },
  { href: "/cabinet/applications", label: "Заявки", icon: ClipboardList },
  { href: "/cabinet/documents", label: "Документы", icon: FileStack },
  { href: "/cabinet/tasks", label: "Задачи", icon: CalendarDays },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  // Активная когорта
  const activeCohort = useMemo(() => {
    if (!user?.cohorts || !user.activeCohortId) return null;
    return user.cohorts.find((c) => c.id === user.activeCohortId);
  }, [user?.cohorts, user?.activeCohortId]);

  // Прогресс практики (дни)
  const practiceProgress = useMemo(() => {
    if (!activeCohort) return null;
    const now = new Date();
    const start = new Date(activeCohort.practiceStart);
    const end = new Date(activeCohort.practiceEnd);
    const total = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    const passed = Math.max(0, Math.min(total, Math.ceil((now.getTime() - start.getTime()) / 86400000)));
    return { total, passed, percent: total > 0 ? Math.round((passed / total) * 100) : 0 };
  }, [activeCohort]);

  const navContent = (
    <>
      {/* Логотип */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">Практика</span>
      </div>

      {/* Активная когорта */}
      {activeCohort && (
        <div className="mx-3 mt-3 rounded-lg border bg-primary/5 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Текущая практика</p>
          <p className="text-sm font-semibold truncate">{activeCohort.name}</p>
          {user?.activeRole && (
            <Badge variant="outline" className="mt-1 text-[10px]">{user.activeRole.name}</Badge>
          )}
          {practiceProgress && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>{new Date(activeCohort.practiceStart).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — {new Date(activeCohort.practiceEnd).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>
                <span>{practiceProgress.passed}/{practiceProgress.total} дн.</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${practiceProgress.percent}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Навигация */}
      <nav className="flex-1 space-y-1 px-3 mt-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Подвал: пользователь + выход */}
      <div className="border-t px-3 py-4">
        <div className="mb-3 px-3">
          <p className="truncate text-sm font-medium">{user?.email || "—"}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Выйти
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Бургер-кнопка для мобилки */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border bg-background p-2 shadow-md md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Оверлей для мобилки */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Десктоп сайдбар */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col border-r bg-card">
        {navContent}
      </aside>

      {/* Мобильный сайдбар */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-5 rounded-sm p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        {navContent}
      </aside>
    </>
  );
}
