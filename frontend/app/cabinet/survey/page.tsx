"use client";

import { useEffect, useState } from "react";
import { SurveyForm } from "@/components/applications/SurveyForm";
import { SurveyField } from "@/shared/api/types";
import { api } from "@/shared/api/client";

export default function SurveyPage() {
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.survey
      .getFields()
      .then(setFields)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Анкета участника</h2>
        <p className="text-muted-foreground">
          Заполните данные для прохождения практики
        </p>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <SurveyForm cohortId="test-cohort-id" fields={fields} />
        </div>
      )}
    </div>
  );
}
