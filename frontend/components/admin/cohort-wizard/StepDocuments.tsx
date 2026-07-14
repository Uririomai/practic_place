"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Trash2, Upload } from "lucide-react";

export interface LocalDocument {
  file: File;
  name: string;
  slug: string;
}

interface StepDocumentsProps {
  documents: LocalDocument[];
  onChange: (documents: LocalDocument[]) => void;
}

export function StepDocuments({ documents, onChange }: StepDocumentsProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  const handleAdd = () => {
    setError("");
    if (!name.trim() || !slug.trim() || !file) {
      setError("Заполните название, slug и выберите файл");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Файл слишком большой (максимум 10MB)");
      return;
    }

    onChange([...documents, { file, name: name.trim(), slug: slug.trim() }]);
    setName("");
    setSlug("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeDocument = (index: number) => {
    onChange(documents.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Загрузите шаблоны документов (.doc, .docx). Этот шаг можно пропустить и настроить позже.
      </p>

      {/* Список загруженных */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <Card key={index}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.slug}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDocument(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Форма добавления */}
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
            accept=".doc,.docx"
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
        <Button size="sm" onClick={handleAdd}>
          Добавить
        </Button>
      </div>
    </div>
  );
}
