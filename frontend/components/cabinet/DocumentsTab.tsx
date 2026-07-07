"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { api } from "@/shared/api/client";
import { StudentDocumentData } from "@/shared/api/types";

type DocStatus = "ready" | "pending" | "not_ready";

interface DocumentCard {
  id: string;
  title: string;
  description: string;
  status: DocStatus;
  statusLabel: string;
}

export function DocumentsTab() {
  const [doc, setDoc] = useState<StudentDocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.studentDocument
      .get("test-cohort-id")
      .then(setDoc)
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, []);

  const documents: DocumentCard[] = [
    {
      id: "iz",
      title: "Индивидуальное задание",
      description: "Формируется на основе заполненных вами полей",
      status: doc?.practice_topic ? "ready" : "not_ready",
      statusLabel: doc?.practice_topic ? "Готово к скачиванию" : "Заполните данные",
    },
    {
      id: "review",
      title: "Отзыв о практике",
      description: "Заполняется администратором после завершения практики",
      status: doc?.review_characteristic ? "ready" : "pending",
      statusLabel: doc?.review_characteristic ? "Готово" : "Ожидает заполнения",
    },
    {
      id: "title",
      title: "Титульный лист",
      description: "Требуется загрузка отчёта и одобрение администратором",
      status: doc?.report_admin_approved ? "ready" : "not_ready",
      statusLabel: doc?.report_admin_approved ? "Готово" : "Ожидает отчёт",
    },
  ];

  const statusIcon = (status: DocStatus) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "not_ready":
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const statusBadge = (status: DocStatus) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Готово</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Ожидание</Badge>;
      case "not_ready":
        return <Badge variant="secondary">Не готово</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Документы</h2>
          <p className="text-muted-foreground">Документы по практике</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Документы</h2>
        <p className="text-muted-foreground">Документы по практике</p>
      </div>

      <div className="grid gap-4">
        {documents.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                {statusIcon(d.status)}
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-sm text-muted-foreground">{d.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(d.status)}
                {d.status === "ready" && (
                  <Button size="sm" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Скачать
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
