import { describe, it, expect } from "vitest";
import { app, request, seedUsers, seedCohort } from "../integration.helpers.js";

// ===========================================================================
// Application Files (Report)
// ===========================================================================
async function seedApplication(studentToken: string) {
  const cohort = await seedCohort();
  const res = await request(app)
    .post("/applications")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ cohortId: cohort.id });
  return { cohort, applicationId: res.body.id };
}

describe("PUT /applications/:id/files/report", () => {
  it("uploads report as owner", async () => {
    const { studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .put(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${studentToken}`)
      .attach("file", Buffer.from("report content"), "report.pdf");

    expect(res.status).toBe(200);
    expect(res.body.type).toBe("REPORT");
    expect(res.body.storageUri).toBeTruthy();
  });

  it("forbids other student", async () => {
    const { studentToken, otherToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .put(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${otherToken}`)
      .attach("file", Buffer.from("x"), "x.pdf");

    expect(res.status).toBe(403);
  });

  it("returns 400 without file", async () => {
    const { studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .put(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(400);
  });
});

describe("PATCH /applications/:id/files/report/status", () => {
  it("approves report as admin", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    // Upload first
    await request(app)
      .put(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${studentToken}`)
      .attach("file", Buffer.from("content"), "report.pdf");

    const res = await request(app)
      .patch(`/applications/${applicationId}/files/report/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("APPROVED");
  });

  it("rejects report with comment", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    await request(app)
      .put(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${studentToken}`)
      .attach("file", Buffer.from("content"), "report.pdf");

    const res = await request(app)
      .patch(`/applications/${applicationId}/files/report/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "REJECTED", comment: "Fix formatting" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REJECTED");
    expect(res.body.comment).toBe("Fix formatting");
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    await request(app)
      .put(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${studentToken}`)
      .attach("file", Buffer.from("content"), "report.pdf");

    const res = await request(app)
      .patch(`/applications/${applicationId}/files/report/status`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ status: "APPROVED" });

    expect(res.status).toBe(403);
  });

  it("returns 404 when no report exists", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .patch(`/applications/${applicationId}/files/report/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED" });

    expect(res.status).toBe(404);
  });
});

describe("GET /applications/:id/files/report", () => {
  it("downloads approved report as owner", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    await request(app)
      .put(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${studentToken}`)
      .attach("file", Buffer.from("my report"), "report.pdf");

    // Approve
    await request(app)
      .patch(`/applications/${applicationId}/files/report/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED" });

    const res = await request(app)
      .get(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
  });

  it("forbids owner when report is not approved", async () => {
    const { studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    await request(app)
      .put(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${studentToken}`)
      .attach("file", Buffer.from("content"), "report.pdf");

    const res = await request(app)
      .get(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it("allows admin regardless of status", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    await request(app)
      .put(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${studentToken}`)
      .attach("file", Buffer.from("content"), "report.pdf");

    const res = await request(app)
      .get(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it("returns 404 when no report uploaded", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .get(`/applications/${applicationId}/files/report`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
