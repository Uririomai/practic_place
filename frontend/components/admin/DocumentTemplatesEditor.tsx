"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Upload, CheckCircle2, XCircle, X } from "lucide-react";
import { api } from "@/shared/api/client";
import { VariableHints } from "./VariableHints";

interface Template {
  id: string;
  name: string;
  slug: string;
}

interface DocumentTemplatesEditorProps {
  cohortId: string;
  initialTemplates: Template[];
  onSaved: () => void;
  onCancel: () => void;
  hintsOpen?: boolean;
  onToggleHints?: () => void;
}

// Предопределённые типы документов
const REQUIRED_TEMPLATES = [
  {
    slug: "iz",
    name: "Индивидуальное задание",
    description: "7 полей, заполняет студент",
    color: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    slug: "review",
    name: "Отзыв о практике",
    description: "7 полей, заполняет администратор",
    color: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    slug: "title",
    name: "Титульный лист",
    description: "Генерируется после одобрения отчёта",
    color: "bg-orange-100",
    iconColor: "text-orange-600",
  },
];

export function DocumentTemplatesEditor({
  cohortId,
  initialTemplates,
  onSaved,
  onCancel,
  hintsOpen = false,
  onToggleHints,
}: DocumentTemplatesEditorProps) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Поиск шаблона по slug
  const findTemplate = (s: string) => templates.find((t) => t.slug === s);

  // Загрузка шаблона (создание или обновление)
  const handleUpload = async (targetSlug: string, targetName: string, f?: File) => {
    const uploadFile = f || file;
    if (!uploadFile) {
      setError("Выберите файл");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const existing = findTemplate(targetSlug);
      if (existing) {
        // Обновляем существующий
        await api.admin.updateDocumentTemplate(cohortId, existing.id, uploadFile, targetName, targetSlug);
      } else {
        // Создаём новый
        await api.admin.createDocumentTemplate(cohortId, uploadFile, targetName, targetSlug);
      }
      // Перезагружаем шаблоны
      const updated = await api.admin.getDocumentTemplates(cohortId);
      setTemplates(updated);
      setName("");
      setSlug("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError("Ошибка загрузки шаблона");
    } finally {
      setUploading(false);
    }
  };

  // Удаление шаблона
  const handleDelete = async (templateId: string) => {
    if (!confirm("Удалить шаблон?")) return;
    try {
      await api.admin.deleteDocumentTemplate(cohortId, templateId);
      setTemplates(templates.filter((t) => t.id !== templateId));
    } catch {
      setError("Ошибка удаления");
    }
  };

  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-6 min-w-0">
      {/* Обязательные шаблоны */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Основные документы</h3>
          <Button variant="link" size="sm" onClick={onToggleHints} className="h-auto p-0">
            Подсказка по переменным
          </Button>
        </div>
        <div className="space-y-3">
          {REQUIRED_TEMPLATES.map((rt) => {
            const existing = findTemplate(rt.slug);
            return (
              <Card key={rt.slug}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${rt.color}`}>
                      <FileText className={`h-5 w-5 ${rt.iconColor}`} />
                    </div>
                    <div>
                      <p className="font-medium">{rt.name}</p>
                      <p className="text-xs text-muted-foreground">{rt.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {existing ? (
                      <>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Загружен</Badge>
                        <input
                          type="file"
                          accept=".docx,.zip"
                          className="hidden"
                          id={`replace-${rt.slug}`}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(rt.slug, rt.name, f);
                          }}
                        />
                        <Button variant="outline" size="sm" asChild>
                          <label htmlFor={`replace-${rt.slug}`} className="cursor-pointer">
                            <Upload className="h-3 w-3 mr-1" /> Заменить
                          </label>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(existing.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary">Не загружен</Badge>
                        <input
                          type="file"
                          accept=".docx,.zip"
                          className="hidden"
                          id={`upload-${rt.slug}`}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(rt.slug, rt.name, f);
                          }}
                        />
                        <Button variant="outline" size="sm" asChild>
                          <label htmlFor={`upload-${rt.slug}`} className="cursor-pointer">
                            <Upload className="h-3 w-3 mr-1" /> Загрузить
                          </label>
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Дополнительные шаблоны */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Дополнительные документы</h3>
        <div className="space-y-2">
          {templates
            .filter((t) => !REQUIRED_TEMPLATES.some((rt) => rt.slug === t.slug))
            .map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.slug}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

          {/* Форма добавления */}
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <p className="text-sm font-medium">Добавить дополнительный шаблон</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Название"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="slug (например, certificate)"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.zip"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {file ? file.name : "Выбрать файл"}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              size="sm"
              onClick={() => {
                if (!name.trim() || !slug.trim()) {
                  setError("Заполните название и slug");
                  return;
                }
                handleUpload(slug.trim(), name.trim());
              }}
              disabled={uploading}
            >
              {uploading ? "Загрузка..." : "Добавить"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSaved}>Готово</Button>
      </div>
    </div>

      {/* Подсказка по переменным — справа */}
      {hintsOpen && (
        <div className="w-72 shrink-0 border rounded-lg bg-background p-3 space-y-2 flex flex-col max-h-[600px]">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="font-medium text-sm">Переменные</h3>
            <Button variant="ghost" size="sm" onClick={onToggleHints} className="h-6 w-6 p-0">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground shrink-0">Нажмите на ключ, чтобы скопировать</p>
          <VariableHints open={hintsOpen} onClose={onToggleHints!} />
        </div>
      )}
    </div>
  );
}
