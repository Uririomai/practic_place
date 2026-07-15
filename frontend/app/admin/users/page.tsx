"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CohortFilter } from "@/components/admin/CohortFilter";
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

        const rows: UserRow[] = (data.users || []).map((u: Record<string, unknown> & { id: string; email: string; role: string; applications?: Array<{ cohortId: string; cohort?: { name: string } }> }) => {
          const apps = u.applications || [];
          const cohortIds = [...new Set(apps.map((a) => a.cohortId))];
          const cohortNames = cohortIds.map((cid) => {
            const app = apps.find((a) => a.cohortId === cid);
            return app?.cohort?.name || data.cohorts?.find((c: { id: string }) => c.id === cid)?.name || "—";
          });
          return {
            id: u.id,
            email: u.email,
            fio: (u.profile as Record<string, unknown> | undefined)?.student_fio as string | undefined,
            role: u.role,
            cohortIds,
            cohortNames,
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
        <p className="text-muted-foreground">Управление пользователями системы</p>
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
        <CohortFilter
          cohorts={[{ id: "all", name: "Все когорты", applicationStart: "", applicationEnd: "", practiceStart: "", practiceEnd: "" }, ...cohorts]}
          selectedId={selectedCohortId}
          onChange={setSelectedCohortId}
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">ФИО</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Когорты</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
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
                    <div className="flex flex-wrap gap-1">
                      {user.cohortNames.map((name) => (
                        <Badge key={name} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
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
