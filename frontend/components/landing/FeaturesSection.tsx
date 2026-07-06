"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardList, CheckSquare, Users } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Документы",
    description: "Автоматическое заполнение и скачивание ИЗ, отзывов и титульных листов. Все необходимые формы в одном месте.",
  },
  {
    icon: ClipboardList,
    title: "Заявки",
    description: "Подавайте заявки на практику быстро и просто. Отслеживание статуса в реальном времени.",
  },
  {
    icon: CheckSquare,
    title: "Задачи",
    description: "Еженедельное планирование задач с удобной сеткой. Фиксируйте выполненные задачи.",
  },
  {
    icon: Users,
    title: "Координация",
    description: "Админ-панель для руководителей. Управление когортами, проверка заявок и документов.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="container mx-auto max-w-7xl px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold mb-4">Возможности платформы</h2>
        <p className="text-muted-foreground">Всё для эффективного прохождения практики</p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.title} className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <feature.icon className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}