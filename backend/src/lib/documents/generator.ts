import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { storage } from "../storage/index.js";

type Engine = "docx";

function detectEngine(uri: string): Engine | null {
  if (uri.endsWith(".docx")) return "docx";
  return null;
}

function generateDocx(templateBuffer: Buffer, data: Record<string, unknown>): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
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

  // ponytail: only docx supported, add engines here when needed
  if (engine === "docx") {
    const templateBuffer = await storage.read(templateUri);
    return generateDocx(templateBuffer, data);
  }

  throw new Error(`Engine not implemented: ${engine}`);
}