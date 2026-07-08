"use client";

import { useAuth } from "@/shared/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/cabinet/Sidebar";

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64">
        <div className="p-6 pt-16 md:pt-6">{children}</div>
      </main>
    </div>
  );
}
