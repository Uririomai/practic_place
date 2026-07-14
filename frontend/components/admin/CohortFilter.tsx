"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Cohort } from "@/shared/api/types";
import { ChevronDown } from "lucide-react";

interface CohortFilterProps {
  cohorts: Cohort[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function CohortFilter({ cohorts, selectedId, onChange }: CohortFilterProps) {
  const [open, setOpen] = useState(false);

  const selectedCohort = cohorts.find((c) => c.id === selectedId);

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className="gap-2 min-w-[200px] justify-between"
      >
        <span className="truncate">
          {selectedCohort?.name || "Выберите когорту"}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border bg-white opacity-100 shadow-lg">
            <div className="p-2">
              {cohorts.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Нет когорт
                </div>
              )}
              {cohorts.map((cohort) => (
                <button
                  key={cohort.id}
                  onClick={() => {
                    onChange(cohort.id);
                    setOpen(false);
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between ${
                    cohort.id === selectedId ? "bg-muted font-medium" : ""
                  }`}
                >
                  <span className="truncate">{cohort.name}</span>
                  {cohort.id === selectedId && (
                    <span className="text-primary shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
