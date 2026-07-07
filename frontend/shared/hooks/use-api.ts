import { useState, useEffect } from "react";
import { apiClient } from "@/shared/api/client";

interface UseApiOptions {
  skip?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiRequestResult {
  request: (options: { method: string; body?: string }) => Promise<any>;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(url: string, options?: UseApiOptions): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options?.skip) return;

    apiClient
      .request<T>(url)
      .then(setData)
      .catch((err) => setError(err.message || "Request failed"))
      .finally(() => setLoading(false));
  }, [url, options?.skip]);

  return { data, loading, error };
}

export function useApiRequest(): UseApiRequestResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async (options: { method: string; body?: string }) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.request(options.method, { body: options.body });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { request, loading, error };
}