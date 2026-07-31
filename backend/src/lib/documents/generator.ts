import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import AdmZip from "adm-zip";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { storage } from "../storage/index.js";

type Engine = "docx" | "typst";

function detectEngine(uri: string): Engine | null {
  if (uri.endsWith(".docx")) return "docx";
  if (uri.endsWith(".zip")) return "typst";
  return null;
}

/**
 * Препроцессинг XML документа для docxtemplater.
 * Удаляет <w:proofErr> — теги проверки орфографии Word,
 * которые разрывают {{...}} на несколько <w:r> и мешают docxtemplater
 * склеить их обратно.
 */
function fixDocxXml(xml: string): string {
  return xml.replace(/<w:proofErr[^>]*\/>/g, "");
}

function generateDocx(templateBuffer: Buffer, data: Record<string, unknown>): Buffer {
  const zip = new PizZip(templateBuffer);

  // Препроцессинг: удаляем <w:proofErr> из XML до того, как docxtemplater его прочитает
  const docXml: string | undefined = zip.file("word/document.xml")?.asText();
  if (docXml) {
    const fixedXml = fixDocxXml(docXml);
    zip.file("word/document.xml", fixedXml);
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    nullGetter: (part) => {
      // Для простых плейсхолдеров {{key}} без данных — показываем "key_не_заполнено"
      // Для циклов {#list} / условий — возвращаем пустую строку
      if (part.type === "placeholder" && !part.module) {
        return `${part.value}_не_заполнено`;
      }
      return "";
    },
  });

  doc.setData(data);
  doc.render();

  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
}

function generateTypst(templateBuffer: Buffer, data: Record<string, unknown>): Buffer {
  // ponytail: single tmp dir, cleaned up after compile
  const tmpDir = mkdtempSync(join(tmpdir(), "typst-"));
  try {
    const zip = new AdmZip(templateBuffer);
    zip.extractAllTo(tmpDir, true);

    // ponytail: look for main.typ, then first .typ in root
    let mainTyp = "main.typ";
    if (!existsSync(join(tmpDir, mainTyp))) {
      const entries = zip.getEntries().filter((e) => e.name.endsWith(".typ") && !e.name.includes("/"));
      if (entries.length === 0) throw new Error("No .typ file found in template zip");
      mainTyp = entries[0]!.name;
    }

    const mainPath = join(tmpDir, mainTyp);
    let content = readFileSync(mainPath, "utf-8");

    // ponytail: simple string replace for {{key}}, same delimiters as docx
    for (const [key, value] of Object.entries(data)) {
      const val = value === undefined || value === null ? `${key}_не_заполнено` : String(value);
      content = content.replaceAll(new RegExp(`\\{\\{${escapeRegex(key)}\\}}`, "g"), val);
    }

    // ponytail: catch remaining {{key}} -> replace with "key_не_заполнено"
    content = content.replace(/\{\{([^}]+)\}\}/g, (_, key) => `${key}_не_заполнено`);

    writeFileSync(mainPath, content, "utf-8");

    const outPath = join(tmpDir, "output.pdf");
    execSync(`typst compile "${mainPath}" "${outPath}"`, {
      cwd: tmpDir,
      stdio: "pipe",
      timeout: 30_000,
    });

    return readFileSync(outPath);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function generateDocument(
  templateUri: string,
  data: Record<string, unknown>,
): Promise<Buffer> {
  const engine = detectEngine(templateUri);

  if (!engine) {
    throw new Error(`Unsupported document type: ${templateUri}`);
  }

  const templateBuffer = await storage.read(templateUri);

  if (engine === "docx") {
    return generateDocx(templateBuffer, data);
  }

  if (engine === "typst") {
    return generateTypst(templateBuffer, data);
  }

  throw new Error(`Engine not implemented: ${engine}`);
}