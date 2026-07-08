"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface MockContextValue {
  ready: boolean;
}

const MockContext = createContext<MockContextValue>({ ready: false });

export function useMockReady() {
  return useContext(MockContext).ready;
}

export function MswProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (process.env.NEXT_PUBLIC_API_MOCKING !== "true") {
      console.log("[MSW] Мокирование выключено (NEXT_PUBLIC_API_MOCKING != true)");
      setReady(true); // Мок не нужен — можно продолжать
      return;
    }

    console.log("[MSW] Мокирование включено, загрузка fetch-interceptor...");

    import("../src/mocks/fetch-interceptor")
      .then(({ enableMocking }) => {
        enableMocking();
        console.log("[MSW] Mock API готов к работе");
        setReady(true);
      })
      .catch((err) => {
        console.error("[MSW] Ошибка загрузки:", err);
        setReady(true); // Даже при ошибке — разблокируем приложение
      });
  }, []);

  return (
    <MockContext.Provider value={{ ready }}>
      {children}
    </MockContext.Provider>
  );
}
