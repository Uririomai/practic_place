"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/shared/api/client";
import { Cohort } from "@/shared/api/types";
import { Search } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  fio?: string;
  role: string;
  cohortIds: string[];
  cohortNames: string[];
  applicationStatus?: string;
  testStatus?: string;
  testAnswer?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.admin.getUsers().catch(() => ({ users: [], cohorts: [], roles: [] }));
        setCohorts(data.cohorts || []);

        // Формируем строки пользователей из ответа
        const rows: UserRow[] = (data.users || []).map((u: Record<string, unknown> & { id: string; email: string; role: string; applications?: Array<{ cohortId: string; cohort?: { name: string }; status?: string; testAnswer?: string; role?: { name: string } }> }) => {
          const apps = u.applications || [];
          const cohortIds = [...new Set(apps.map((a) => a.cohortId))];
          const cohortNames = cohortIds.map((cid) => {
            const app = apps.find((a) => a.cohortId === cid);
            return app?.cohort?.name || data.cohorts?.find((c: { id: string }) => c.id === cid)?.name || "—";
          });
          // Берём данные последней заявки
          const lastApp = apps.length > 0 ? apps[apps.length - 1] : null;
          return {
            id: u.id,
            email: u.email,
            fio: (u.profile as Record<string, unknown> | undefined)?.student_fio as string | undefined,
            role: u.role,
            cohortIds,
            cohortNames,
            applicationStatus: lastApp?.status,
            testAnswer: lastApp?.testAnswer,
          };
        });
        setUsers(rows);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = users.filter((user) => {
    if (selectedCohortId !== "all" && !user.cohortIds.includes(selectedCohortId)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (user.fio || "").toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Пользователи</h1>
        <p className="text-muted-foreground">
          Управление пользователями системы
        </p>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по ФИО или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedCohortId === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCohortId("all")}
          >
            Все когорты
          </Button>
          {cohorts.map((c) => (
            <Button
              key={c.id}
              variant={selectedCohortId === c.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCohortId(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">ФИО</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Роль</th>
              <th className="px-4 py-3 text-left font-medium">Когорты</th>
              <th className="px-4 py-3 text-left font-medium">Анкета</th>
              <th className="px-4 py-3 text-left font-medium">Тест</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Пользователей не найдено
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {user.fio || user.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.role === "admin" ? (
                      <Badge variant="destructive">Админ</Badge>
                    ) : (
                      <Badge variant="secondary">Студент</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.cohortNames.map((name) => (
                        <Badge key={name} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.applicationStatus?.toLowerCase() === "approved" && (
                      <Badge className="bg-green-500 hover:bg-green-600">Одобрена</Badge>
                    )}
                    {user.applicationStatus?.toLowerCase() === "rejected" && (
                      <Badge variant="destructive">Отклонена</Badge>
                    )}
                    {(!user.applicationStatus || (user.applicationStatus?.toLowerCase() !== "approved" && user.applicationStatus?.toLowerCase() !== "rejected")) && (
                      <Badge variant="secondary">Ожидание</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.testStatus?.toLowerCase() === "approved" && (
                      <Badge className="bg-green-500 hover:bg-green-600">Одобрен</Badge>
                    )}
                    {user.testStatus?.toLowerCase() === "rejected" && (
                      <Badge variant="destructive">Не прошёл</Badge>
                    )}
                    {user.testStatus?.toLowerCase() === "pending" && (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600">На проверке</Badge>
                    )}
                    {(!user.testStatus || user.testStatus?.toLowerCase() === "not_submitted") && user.testAnswer && (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600">Ожидает проверки</Badge>
                    )}
                    {!user.testStatus && !user.testAnswer && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
