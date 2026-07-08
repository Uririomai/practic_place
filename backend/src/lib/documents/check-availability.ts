import type { Application, DocumentTemplate } from "@prisma/client";

type AvailabilityResult = {
  available: boolean;
  reason?: string;
};


export function checkDocumentAvailability(
  application: Application & {
    files: {
      type: string;
      status: string;
    }[];
  },
  template: DocumentTemplate,
): AvailabilityResult {

  const requirements =
    template.requirements as {
      requiresReport?: boolean;
    };


  if (requirements.requiresReport) {
    const report =
      application.files.find(
        (file) =>
          file.type === "REPORT",
      );


    if (!report) {
      return {
        available: false,
        reason: "Report is not uploaded",
      };
    }


    if (report.status !== "APPROVED") {
      return {
        available: false,
        reason: "Report is not approved",
      };
    }
  }


  return {
    available: true,
  };
}
