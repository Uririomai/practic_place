import { FileStorage } from "./file-storage.js";
import { S3Storage } from "./s3-storage.js";

// ponytail: switch via STORAGE_TYPE env var, FileStorage is default
const storage = process.env.STORAGE_TYPE === "s3"
  ? new S3Storage()
  : new FileStorage();

export { storage };

export * from "./storage.js";
