import { describe, it, expect } from "vitest";
import { app, request, prisma, seedUsers, seedCohort } from "../integration.helpers.js";

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

    const { storage } = await import("../../lib/storage/index.js");
    const uri = await storage.save(`test-templates/sample-${Date.now()}`, Buffer.from("sample doc content"));

    const template = await prisma.documentTemplate.create({
      data: {
        cohortId: cohort.id,
        name: "Sample",
        slug: "sample",
        uri,
        requirements: {},
      },
    });

    const res = await request(app)
      .get(`/applications/${applicationId}/documents/${template.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toBe("sample doc content");
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
