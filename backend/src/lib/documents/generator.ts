import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { storage } from "../storage/index.js";

type Engine = "docx";

function detectEngine(uri: string): Engine | null {
  if (uri.endsWith(".docx")) return "docx";
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

export async function generateDocument(
  templateUri: string,
  data: Record<string, unknown>,
): Promise<Buffer> {
  const engine = detectEngine(templateUri);

  if (!engine) {
    throw new Error(`Unsupported document type: ${templateUri}`);
  }

  if (engine === "docx") {
    const templateBuffer = await storage.read(templateUri);
    return generateDocx(templateBuffer, data);
  }

  throw new Error(`Engine not implemented: ${engine}`);
}