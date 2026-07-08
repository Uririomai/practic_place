import { useState, useEffect } from "react";

interface AutoFillFormOptions<T> {
  userId: string;
  cohortId: string;
  fields: string[];
}

export function useAutoFillForm<T extends Record<string, string>>(
  userId: string,
  cohortId: string,
  fields: string[]
): { defaultValues: T; loading: boolean } {
  const [defaultValues, setDefaultValues] = useState<T>({} as T);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !cohortId) return;

    // TODO: Fetch previous application data
    // const response = await apiClient.get(`/api/applications/my?cohortId=${cohortId}`);
    // Merge только заполненные поля
    setLoading(true);
    // mock
    setTimeout(() => {
      const mockValues = {} as T;
      setDefaultValues(mockValues);
      setLoading(false);
    }, 300);
  }, [userId, cohortId]);

  return { defaultValues, loading };
}