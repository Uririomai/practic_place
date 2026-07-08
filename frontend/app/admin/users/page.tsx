"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/shared/api/client";
import { User } from "@/shared/api/types";
import { Search } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Мок: показываем известных пользователей
    const mockUsers: User[] = [
      { id: "user-1", email: "student@example.com", fio: "Иванов Иван Иванович", role: "student", createdAt: "2024-01-01" },
      { id: "user-2", email: "petrova@example.com", fio: "Петрова Анна Сергеевна", role: "student", createdAt: "2024-01-15" },
      { id: "user-3", email: "sidorov@example.com", fio: "Сидоров Алексей Петрович", role: "student", createdAt: "2024-02-01" },
      { id: "user-4", email: "kozlova@example.com", fio: "Козлова Мария Ивановна", role: "student", createdAt: "2024-02-15" },
      { id: "admin-1", email: "admin@example.com", fio: "Петров Пётр Петрович", role: "admin", createdAt: "2024-01-01" },
    ];
    setUsers(mockUsers);
    setLoading(false);
  }, []);

  const filtered = users.filter((user) => {
    if (search) {
      const query = search.toLowerCase();
      return (
        user.fio.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по ФИО или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">ФИО</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Роль</th>
              <th className="px-4 py-3 text-left font-medium">Дата регистрации</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {user.fio || "—"}
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
                  {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
