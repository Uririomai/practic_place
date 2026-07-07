"use client";

import { useEffect } from "react";

export function MswProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (process.env.NEXT_PUBLIC_API_MOCKING !== "true") {
      console.log("[MSW] Мокирование выключено (NEXT_PUBLIC_API_MOCKING != true)");
      return;
    }

    console.log("[MSW] Мокирование включено, загрузка fetch-interceptor...");

    import("../src/mocks/fetch-interceptor")
      .then(({ enableMocking }) => {
        enableMocking();
        console.log("[MSW] Mock API готов к работе");
      })
      .catch((err) => {
        console.error("[MSW] Ошибка загрузки:", err);
      });
  }, []);

  return <>{children}</>;
}
