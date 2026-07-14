"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Trash2, Upload } from "lucide-react";

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
}

export function DocumentTemplatesEditor({
  cohortId,
  initialTemplates,
  onSaved,
  onCancel,
}: DocumentTemplatesEditorProps) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!name.trim() || !slug.trim() || !file) {
      setError("Заполните название, slug и выберите файл");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const { api } = await import("@/shared/api/client");
      const result = await api.admin.createDocumentTemplate(cohortId, file, name.trim(), slug.trim());
      setTemplates([...templates, { id: result.id, name: result.name, slug: slug.trim() }]);
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

  const handleDelete = async (templateId: string) => {
    if (!confirm("Удалить шаблон?")) return;
    try {
      const { api } = await import("@/shared/api/client");
      await api.admin.deleteDocumentTemplate(cohortId, templateId);
      setTemplates(templates.filter((t) => t.id !== templateId));
    } catch {
      setError("Ошибка удаления");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {templates.length > 0 && (
          <div className="space-y-2">
            {templates.map((t) => (
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
          </div>
        )}

        <div className="rounded-lg border border-dashed p-4 space-y-3">
          <p className="text-sm font-medium">Добавить шаблон</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Название (Индивидуальное задание)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="slug (individual-task)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.pdf"
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
          <Button size="sm" onClick={handleAdd} disabled={uploading}>
            {uploading ? "Загрузка..." : "Добавить"}
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Готово
        </Button>
      </div>
    </div>
  );
}
