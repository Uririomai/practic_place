"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CabinetPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cabinet/profile");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Загрузка...</p>
      </div>
    </div>
  );
}
