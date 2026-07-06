"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="container flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-20 text-center">
      <div className="space-y-8">
        <h1 className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl lg:text-7xl">
          Платформа для организации учебной практики
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl lg:text-2xl">
          Современный сервис для студентов и руководителей практики.
          Подавайте заявки, заполняйте документы, отслеживайте задачи — всё в одном месте.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="px-8" asChild>
            <Link href="/register">Начать сейчас</Link>
          </Button>
          <Button variant="outline" size="lg" className="px-8" asChild>
            <Link href="/#features">Узнать больше</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}