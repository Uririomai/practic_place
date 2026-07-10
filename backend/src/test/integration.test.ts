import { afterAll, beforeEach } from "vitest";

import { cleanDb, stopDb } from "./integration.dbUtils.js";

import "./integration/applications.js"
import "./integration/auth.js"
import "./integration/cohorts.js"
import "./integration/document-templates.js"
import "./integration/documents-api.js"
import "./integration/documents.js"
import "./integration/fields.js"
import "./integration/files.js"
import "./integration/healthcheck.js"
import "./integration/initialAdmin.js"
import "./integration/profile.js"
import "./integration/roles.js"
import "./integration/tasks.js"
import "./integration/test-tasks.js"
import "./integration/users.js"



afterAll(async () => {
  await stopDb();
});

beforeEach(async () => {
  await cleanDb();
});
