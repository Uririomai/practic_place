import { describe, it, expect } from "vitest";
import PizZip from "pizzip";
import { app, request, prisma, seedUsers, seedCohort } from "../integration.helpers.js";

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

// ===========================================================================
// Documents API
// ===========================================================================
async function seedApplication(studentToken: string) {
  const cohort = await seedCohort();
  const res = await request(app)
    .post("/applications")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ cohortId: cohort.id });
  return { cohort, applicationId: res.body.id };
}

describe("GET /applications/:id/documents", () => {
  it("returns document list for owner", async () => {
    const { studentToken } = await seedUsers();
    const { cohort, applicationId } = await seedApplication(studentToken);

    await prisma.documentTemplate.create({
      data: {
        cohortId: cohort.id,
        name: "Title Page",
        slug: "title-page",
        uri: "file:///dev/null",
        requirements: {},
      },
    });

    const res = await request(app)
      .get(`/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Title Page");
    expect(res.body[0].available).toBe(true);
  });

  it("shows document as unavailable when report required but not uploaded", async () => {
    const { studentToken } = await seedUsers();
    const { cohort, applicationId } = await seedApplication(studentToken);

    await prisma.documentTemplate.create({
      data: {
        cohortId: cohort.id,
        name: "Requires Report",
        slug: "with-report",
        uri: "file:///dev/null",
        requirements: { requiresReport: true },
      },
    });

    const res = await request(app)
      .get(`/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body[0].available).toBe(false);
    expect(res.body[0].reason).toBeTruthy();
  });

  it("forbids other student", async () => {
    const { studentToken, otherToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .get(`/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});

describe("GET /applications/:id/documents/:templateId", () => {
  it("downloads available document", async () => {
    const { studentToken } = await seedUsers();
    const { cohort, applicationId } = await seedApplication(studentToken);

    const templateBuf = makeDocxTemplate(["name"]);
    const { storage } = await import("../../lib/storage/index.js");
    const uri = await storage.save(`test-templates/sample-${Date.now()}.docx`, templateBuf);

    const template = await prisma.documentTemplate.create({
      data: {
        cohortId: cohort.id,
        name: "Sample",
        slug: "sample",
        uri,
        requirements: {},
      },
    });

    await prisma.documentData.create({
      data: {
        applicationId,
        data: { name: "Alice" },
      },
    });

    const res = await request(app)
      .get(`/applications/${applicationId}/documents/${template.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    // ponytail: just verify non-empty binary response, full docx generation tested in documents.ts
    expect(res.body).toBeTruthy();
    expect(res.headers['content-type']).toContain('openxmlformats');
  });

  it("returns 403 when document unavailable (report required)", async () => {
    const { studentToken } = await seedUsers();
    const { cohort, applicationId } = await seedApplication(studentToken);

    const { storage } = await import("../../lib/storage/index.js");
    const uri = await storage.save(`test-templates/unavailable-${Date.now()}`, Buffer.from("x"));

    const template = await prisma.documentTemplate.create({
      data: {
        cohortId: cohort.id,
        name: "Needs Report",
        slug: "needs-report",
        uri,
        requirements: { requiresReport: true },
      },
    });

    const res = await request(app)
      .get(`/applications/${applicationId}/documents/${template.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing template", async () => {
    const { studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .get(`/applications/${applicationId}/documents/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(404);
  });
});
