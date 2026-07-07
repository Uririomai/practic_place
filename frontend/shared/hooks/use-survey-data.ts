import { useState, useCallback } from "react";

const STORAGE_KEY = "survey-data";

export interface SurveyData {
  [fieldId: string]: string;
}

/**
 * Хук для хранения данных анкеты в localStorage.
 * Синхронизируется между вкладкой "Профиль" и формой анкеты.
 */
export function useSurveyData(cohortId: string) {
  const key = `${STORAGE_KEY}-${cohortId}`;

  const [data, setDataState] = useState<SurveyData>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const setData = useCallback(
    (newData: SurveyData) => {
      setDataState(newData);
      localStorage.setItem(key, JSON.stringify(newData));
    },
    [key]
  );

  const updateField = useCallback(
    (fieldId: string, value: string) => {
      setDataState((prev) => {
        const updated = { ...prev, [fieldId]: value };
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });
    },
    [key]
  );

  const getField = useCallback(
    (fieldId: string): string => data[fieldId] || "",
    [data]
  );

  const isEmpty = Object.values(data).every((v) => !v);

  return { data, setData, updateField, getField, isEmpty };
}
