"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SurveyForm } from "@/components/applications/SurveyForm";
import { SurveyField } from "@/shared/api/types";
import { api } from "@/shared/api/client";

export default function SurveyPage() {
  const params = useParams();
  const cohortId = params.cohortId as string;
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.survey.getFields(cohortId)
      .then(setFields)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [cohortId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl py-10 px-4">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Назад
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Анкета участника</h1>
          <p className="mt-2 text-muted-foreground">
            Заполните данные для прохождения практики
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
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
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          {!loading && !error && (
            <SurveyForm cohortId={cohortId} fields={fields} />
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href={`/apply/${cohortId}/test`}
            className="text-sm text-primary hover:underline"
          >
            Перейти к тестовому заданию →
          </Link>
        </div>
      </div>
    </div>
  );
}
