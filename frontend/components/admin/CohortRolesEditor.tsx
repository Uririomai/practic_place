"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CohortRole } from "@/shared/api/types";
import { Plus, Trash2 } from "lucide-react";

interface CohortRolesEditorProps {
  initialRoles: CohortRole[];
  onSave: (roles: { id?: string; name: string }[], deletedIds: string[]) => Promise<void>;
  onCancel: () => void;
}

export function CohortRolesEditor({ initialRoles, onSave, onCancel }: CohortRolesEditorProps) {
  const [roles, setRoles] = useState<{ id?: string; name: string }[]>(
    initialRoles.map((r) => ({ id: r.id, name: r.name }))
  );
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const addRole = () => {
    setRoles([...roles, { name: "" }]);
    setError("");
  };

  const removeRole = (index: number) => {
    const role = roles[index];
    if (role.id) {
      setDeletedIds((prev) => new Set(prev).add(role.id!));
    }
    setRoles(roles.filter((_, i) => i !== index));
  };

  const updateRole = (index: number, name: string) => {
    setRoles(roles.map((r, i) => (i === index ? { ...r, name } : r)));
  };

  const handleSave = async () => {
    const nonEmpty = roles.filter((r) => r.name.trim());
    // Проверка на дубликаты в редакторе
    const seen = new Set<string>();
    for (const r of nonEmpty) {
      const lower = r.name.trim().toLowerCase();
      if (seen.has(lower)) {
        setError(`Роль «${r.name}» добавлена дважды`);
        return;
      }
      seen.add(lower);
    }
    setError("");
    setSaving(true);
    try {
      await onSave(nonEmpty, Array.from(deletedIds));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка сохранения";
      alert(`Не удалось сохранить роли: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Роли/треки</h3>
        <Button size="sm" onClick={addRole}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить роль
        </Button>
      </div>

      {roles.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Роли не добавлены. Нажмите «Добавить роль» чтобы начать.
        </p>
      ) : (
        <div className="space-y-2">
          {roles.map((role, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Название роли (например: Frontend)"
                value={role.name}
                onChange={(e) => updateRole(index, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRole(index)}
                disabled={roles.length <= 1}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
