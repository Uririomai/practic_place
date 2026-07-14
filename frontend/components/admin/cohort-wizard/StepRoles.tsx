"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

interface StepRolesProps {
  roles: { name: string }[];
  onChange: (roles: { name: string }[]) => void;
}

const PRESET_ROLES = [
  "Backend разработчик",
  "Frontend разработчик",
  "Аналитик",
  "ML инженер",
  "Дизайнер",
  "DevOps",
];

export function StepRoles({ roles, onChange }: StepRolesProps) {
  const [inputValue, setInputValue] = useState("");

  const addRole = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (roles.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...roles, { name: trimmed }]);
    setInputValue("");
  };

  const removeRole = (index: number) => {
    onChange(roles.filter((_, i) => i !== index));
  };

  const updateRole = (index: number, name: string) => {
    onChange(roles.map((r, i) => (i === index ? { name } : r)));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRole(inputValue);
    }
  };

  const availablePresets = PRESET_ROLES.filter(
    (preset) => !roles.some((r) => r.name.toLowerCase() === preset.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Бейджи быстрого добавления */}
      {availablePresets.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Быстрое добавление:</p>
          <div className="flex flex-wrap gap-2">
            {availablePresets.map((preset) => (
              <Badge
                key={preset}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => addRole(preset)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {preset}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Добавление кастомной роли */}
      <div className="flex gap-2">
        <Input
          placeholder="Введите название роли..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => addRole(inputValue)}
          disabled={!inputValue.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {/* Список ролей */}
      {roles.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Роли не добавлены. Добавьте хотя бы одну роль для продолжения.
        </p>
      ) : (
        <div className="space-y-2">
          {roles.map((role, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={role.name}
                onChange={(e) => updateRole(index, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRole(index)}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {roles.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Добавлено ролей: {roles.length}
        </p>
      )}
    </div>
  );
}
