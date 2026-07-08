"use client";

import { useState, useRef, useEffect } from "react";
import { CohortRole } from "@/shared/api/types";

interface InlineRoleSelectProps {
  applicationId: string;
  currentRoleId?: string;
  roles: CohortRole[];
  onChange: (applicationId: string, roleId: string) => Promise<void>;
}

export function InlineRoleSelect({
  applicationId,
  currentRoleId,
  roles,
  onChange,
}: InlineRoleSelectProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const currentRole = roles.find((r) => r.id === currentRoleId);

  useEffect(() => {
    if (editing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [editing]);

  const handleChange = async (roleId: string) => {
    if (roleId === currentRoleId) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onChange(applicationId, roleId);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="px-2 py-1 text-sm rounded hover:bg-muted cursor-pointer"
        disabled={saving}
      >
        {currentRole?.name || "—"}
      </button>
    );
  }

  return (
    <select
      ref={selectRef}
      defaultValue={currentRoleId || ""}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={() => setEditing(false)}
      className="rounded border border-primary px-2 py-1 text-sm bg-background"
      disabled={saving}
    >
      <option value="">Без роли</option>
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name}
        </option>
      ))}
    </select>
  );
}
