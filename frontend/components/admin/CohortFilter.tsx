"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cohort } from "@/shared/api/types";
import { ChevronDown, X } from "lucide-react";

interface CohortFilterProps {
  cohorts: Cohort[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CohortFilter({ cohorts, selectedIds, onChange }: CohortFilterProps) {
  const [open, setOpen] = useState(false);

  const toggleCohort = (id: string) => {
    if (selectedIds.includes(id)) {
      // Не даём убрать последний 선택
      if (selectedIds.length === 1) return;
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCohorts = cohorts.filter((c) => selectedIds.includes(c.id));

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className="gap-2"
      >
        Когорта
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        {selectedIds.length > 1 && (
          <Badge variant="secondary" className="ml-1">
            {selectedIds.length}
          </Badge>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border bg-white shadow-lg">
            <div className="p-2">
              {cohorts.map((cohort) => (
                <button
                  key={cohort.id}
                  onClick={() => toggleCohort(cohort.id)}
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between"
                >
                  <span className="truncate">{cohort.name}</span>
                  {selectedIds.includes(cohort.id) && (
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      ✓
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {selectedCohorts.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedCohorts.map((cohort) => (
            <Badge key={cohort.id} variant="secondary" className="gap-1">
              {cohort.name}
              {selectedIds.length > 1 && (
                <button
                  onClick={() => toggleCohort(cohort.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
