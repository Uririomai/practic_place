"use client";

import { useAuth } from "@/shared/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== "admin") {
        router.replace("/cabinet");
      }
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

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <main className="md:pl-64">
        <div className="p-6 pt-16 md:pt-6">{children}</div>
      </main>
    </div>
  );
}
