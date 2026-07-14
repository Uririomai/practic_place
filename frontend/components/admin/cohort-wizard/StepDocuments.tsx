"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Upload, X } from "lucide-react";
import { VariableHints } from "../VariableHints";

export interface LocalDocument {
  file: File;
  name: string;
  slug: string;
}

interface StepDocumentsProps {
  documents: LocalDocument[];
  onChange: (documents: LocalDocument[]) => void;
  hintsOpen?: boolean;
  onToggleHints?: () => void;
}

const REQUIRED_TEMPLATES = [
  { slug: "iz", name: "Индивидуальное задание", description: "7 полей, заполняет студент", color: "bg-blue-100", iconColor: "text-blue-600" },
  { slug: "review", name: "Отзыв о практике", description: "7 полей, заполняет администратор", color: "bg-purple-100", iconColor: "text-purple-600" },
  { slug: "title", name: "Титульный лист", description: "Генерируется после одобрения отчёта", color: "bg-orange-100", iconColor: "text-orange-600" },
];

export function StepDocuments({ documents, onChange, hintsOpen = false, onToggleHints }: StepDocumentsProps) {
  const [additionalName, setAdditionalName] = useState("");
  const [additionalSlug, setAdditionalSlug] = useState("");
  const [additionalFile, setAdditionalFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const additionalInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 10 * 1024 * 1024;
  const findBySlug = (slug: string) => documents.find((d) => d.slug === slug);

  const handleUploadRequired = (slug: string, name: string, file: File) => {
    setError("");
    if (file.size > MAX_SIZE) { setError("Файл слишком большой (максимум 10MB)"); return; }
    const existing = findBySlug(slug);
    if (existing) {
      onChange(documents.map((d) => d.slug === slug ? { file, name, slug } : d));
    } else {
      onChange([...documents, { file, name, slug }]);
    }
  };

  const handleRemove = (slug: string) => {
    onChange(documents.filter((d) => d.slug !== slug));
  };

  const handleAddAdditional = () => {
    setError("");
    if (!additionalName.trim() || !additionalSlug.trim() || !additionalFile) {
      setError("Заполните название, slug и выберите файл"); return;
    }
    if (additionalFile.size > MAX_SIZE) { setError("Файл слишком большой (максимум 10MB)"); return; }
    onChange([...documents, { file: additionalFile, name: additionalName.trim(), slug: additionalSlug.trim() }]);
    setAdditionalName(""); setAdditionalSlug(""); setAdditionalFile(null);
    if (additionalInputRef.current) additionalInputRef.current.value = "";
  };

  const handleRemoveAdditional = (index: number) => {
    const additionalDocs = documents.filter((d) => !REQUIRED_TEMPLATES.some((rt) => rt.slug === d.slug));
    const toRemove = additionalDocs[index];
    if (toRemove) onChange(documents.filter((d) => d !== toRemove));
  };

  const additionalDocs = documents.filter((d) => !REQUIRED_TEMPLATES.some((rt) => rt.slug === d.slug));

  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-6 min-w-0">
        <p className="text-sm text-muted-foreground">
          Загрузите шаблоны документов (.docx). Этот шаг можно пропустить и настроить позже.
        </p>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Основные документы</h3>
            <Button variant="link" size="sm" onClick={onToggleHints} className="h-auto p-0">
              Подсказка по переменным
            </Button>
          </div>
          <div className="space-y-3">
            {REQUIRED_TEMPLATES.map((rt) => {
              const existing = findBySlug(rt.slug);
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
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{existing.file.name}</Badge>
                          <input type="file" accept=".docx" className="hidden" id={`replace-${rt.slug}`}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadRequired(rt.slug, rt.name, f); }} />
                          <Button variant="outline" size="sm" asChild>
                            <label htmlFor={`replace-${rt.slug}`} className="cursor-pointer">
                              <Upload className="h-3 w-3 mr-1" /> Заменить
                            </label>
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                            onClick={() => handleRemove(rt.slug)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">Не загружен</Badge>
                          <input type="file" accept=".docx" className="hidden" id={`upload-${rt.slug}`}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadRequired(rt.slug, rt.name, f); }} />
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

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Дополнительные документы</h3>
          <div className="space-y-2">
            {additionalDocs.map((doc, index) => (
              <Card key={doc.slug}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.slug}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                    onClick={() => handleRemoveAdditional(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            <div className="rounded-lg border border-dashed p-4 space-y-3">
              <p className="text-sm font-medium">Добавить дополнительный шаблон</p>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Название" value={additionalName} onChange={(e) => setAdditionalName(e.target.value)} />
                <Input placeholder="slug (например, certificate)" value={additionalSlug} onChange={(e) => setAdditionalSlug(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <input ref={additionalInputRef} type="file" accept=".docx"
                  onChange={(e) => setAdditionalFile(e.target.files?.[0] || null)} className="hidden" />
                <Button variant="outline" size="sm" type="button" onClick={() => additionalInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  {additionalFile ? additionalFile.name : "Выбрать файл"}
                </Button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button size="sm" onClick={handleAddAdditional}>Добавить</Button>
            </div>
          </div>
        </div>
      </div>

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
