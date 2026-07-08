import fs from "node:fs/promises";
import path from "node:path";
import { type Storage } from "./storage.js";


export class FileStorage implements Storage {
  private readonly root: string;

  constructor(root?: string) {
    this.root =
      root ??
      process.env.STORAGE_PATH ??
      path.join(process.cwd(), "storage");
  }


  private resolve(relativePath: string) {
    return path.join(this.root, relativePath);
  }


  private uriToPath(uri: string) {
    if (!uri.startsWith("file://")) {
      throw new Error("Unsupported storage URI");
    }

    return uri.replace("file://", "");
  }


  async save(
    relativePath: string,
    data: Buffer,
  ): Promise<string> {
    const filepath = this.resolve(relativePath);

    await fs.mkdir(
      path.dirname(filepath),
      {
        recursive: true,
      },
    );

    await fs.writeFile(
      filepath,
      data,
    );

    return `file://${filepath}`;
  }


  async read(
    uri: string,
  ): Promise<Buffer> {
    return fs.readFile(
      this.uriToPath(uri),
    );
  }


  async delete(
    uri: string,
  ): Promise<void> {
    await fs.unlink(
      this.uriToPath(uri),
    );
  }


  async exists(
    uri: string,
  ): Promise<boolean> {
    try {
      await fs.access(
        this.uriToPath(uri),
      );

      return true;
    } catch {
      return false;
    }
  }
}
