"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section id="about" className="bg-muted py-20">
      <div className="container mx-auto max-w-7xl px-4 text-center">
        <h2 className="mb-4 text-3xl font-bold">Готовы начать?</h2>
        <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
          Зарегистрируйтесь прямо сейчас и подайте заявку на практику.
          Платформа доступна бесплатно для всех студентов.
        </p>
        <Button size="lg" className="px-8" asChild>
          <Link href="/register">Подать заявку</Link>
        </Button>
      </div>
    </section>
  );
}