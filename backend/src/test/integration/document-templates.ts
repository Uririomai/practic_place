import { describe, it, expect } from "vitest";
import { app, request, prisma, seedUsers, seedCohort } from "../integration.helpers.js";

// ===========================================================================
// Document Templates (GET only — POST/PATCH/DELETE need file upload)
// ===========================================================================
describe("GET /cohorts/:cohortId/document-templates", () => {
  it("lists templates for admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

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
      .get(`/cohorts/${cohort.id}/document-templates`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Title Page");
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .get(`/cohorts/${cohort.id}/document-templates`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it("returns empty array when no templates", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .get(`/cohorts/${cohort.id}/document-templates`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
