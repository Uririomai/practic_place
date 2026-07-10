import { describe, it, expect } from "vitest";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { prisma } from "../../lib/prisma.js";
import { storage } from "../../lib/storage/index.js";
import { generateDocument } from "../../lib/documents/generator.js";

function makeDocxTemplate(placeholders: string[]): Buffer {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);

  const text = placeholders.length > 0
    ? `<w:p><w:r><w:t>{{${placeholders.join("}} {{")}}}</w:t></w:r></w:p>`
    : `<w:p><w:r><w:t>no placeholders</w:t></w:r></w:p>`;

  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${text}</w:body>
</w:document>`);

  return zip.generate({ type: "nodebuffer" }) as Buffer;
}

function readDocxText(buf: Buffer): string {
  const zip = new PizZip(buf);
  return zip.file("word/document.xml")!.asText();
}


describe("DocumentGenerator", () => {
  it("substitutes {{placeholders}} in docx template", async () => {
    const templateBuf = makeDocxTemplate(["name", "group"]);

    const cohort = await prisma.cohort.create({
      data: {
        name: "Test Cohort Docs",
        applicationStart: new Date("2026-01-01"),
        applicationEnd: new Date("2026-12-31"),
        practiceStart: new Date("2026-06-01"),
        practiceEnd: new Date("2026-08-31"),
      },
    });

    const uri = await storage.save(
      `test/template-${cohort.id}.docx`,
      templateBuf,
    );

    const template = await prisma.documentTemplate.create({
      data: {
        cohortId: cohort.id,
        name: "Test Template",
        slug: "test-template",
        uri,
        requirements: {},
      },
    });

    const user = await prisma.user.create({
      data: {
        email: "student-docs@test.com",
        bcryptPassword: "hash",
        role: "STUDENT",
      },
    });

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        cohortId: cohort.id,
      },
    });

    await prisma.documentData.create({
      data: {
        applicationId: application.id,
        data: { name: "Иван Иванов", group: "ИС-41" },
      },
    });

    const docData = await prisma.documentData.findUniqueOrThrow({
      where: { applicationId: application.id },
    });

    const result = await generateDocument(
      template.uri,
      docData.data as Record<string, unknown>,
    );

    const xml = readDocxText(result);
    expect(xml).toContain("Иван Иванов");
    expect(xml).toContain("ИС-41");
  });

  it("rejects unsupported file type", async () => {
    await expect(
      generateDocument("file://template.pdf", { name: "test" }),
    ).rejects.toThrow("Unsupported document type");
  });

  it("handles empty data without crashing", async () => {
    const templateBuf = makeDocxTemplate(["x"]);
    const uri = await storage.save("test/empty-data.docx", templateBuf);

    const result = await generateDocument(uri, {});
    const zip = new PizZip(result);
    expect(zip.file("word/document.xml")).toBeTruthy();
  });

  it("handles template without any placeholders", async () => {
    const templateBuf = makeDocxTemplate([]);
    const uri = await storage.save("test/no-placeholders.docx", templateBuf);

    const result = await generateDocument(uri, { extra: "ignored" });
    const xml = readDocxText(result);
    expect(xml).toContain("no placeholders");
  });

  it("reads actual DocumentData from DB and generates valid docx", async () => {
    const cohort = await prisma.cohort.create({
      data: {
        name: "Scope Test",
        applicationStart: new Date("2026-01-01"),
        applicationEnd: new Date("2026-12-31"),
        practiceStart: new Date("2026-06-01"),
        practiceEnd: new Date("2026-08-31"),
      },
    });

    const uri = await storage.save(
      "test/scope-template.docx",
      makeDocxTemplate(["studentName", "course"]),
    );

    const template = await prisma.documentTemplate.create({
      data: {
        cohortId: cohort.id,
        name: "Scope Template",
        slug: "scope",
        uri,
        requirements: {},
      },
    });

    const user = await prisma.user.create({
      data: {
        email: "scope@test.com",
        bcryptPassword: "hash",
        role: "STUDENT",
      },
    });

    const app = await prisma.application.create({
      data: { userId: user.id, cohortId: cohort.id },
    });

    await prisma.documentData.create({
      data: {
        applicationId: app.id,
        data: { studentName: "Петр Петров", course: "3" },
      },
    });

    const docData = await prisma.documentData.findUniqueOrThrow({
      where: { applicationId: app.id },
    });

    const result = await generateDocument(
      template.uri,
      docData.data as Record<string, unknown>,
    );

    const xml = readDocxText(result);
    expect(xml).toContain("Петр Петров");
    expect(xml).toContain("3");

    const zip = new PizZip(result);
    expect(zip.file("word/document.xml")).toBeTruthy();
  });
});
