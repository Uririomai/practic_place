import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { type Storage } from "./storage.js";

export class S3Storage implements Storage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "";
    if (!this.bucket) {
      throw new Error("S3_BUCKET env var required");
    }

    this.client = new S3Client({
      ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
      region: process.env.S3_REGION ?? "us-east-1",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  }

  private parseUri(uri: string): { bucket: string; key: string } {
    if (!uri.startsWith("s3://")) {
      throw new Error("Unsupported storage URI");
    }
    const withoutScheme = uri.slice(5); // "s3://"
    const slashIndex = withoutScheme.indexOf("/");
    // ponytail: no multi-bucket routing, bucket is fixed per instance
    return {
      bucket: withoutScheme.slice(0, slashIndex) || this.bucket,
      key: withoutScheme.slice(slashIndex + 1),
    };
  }

  async save(relativePath: string, data: Buffer): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: relativePath,
        Body: data,
      }),
    );
    return `s3://${this.bucket}/${relativePath}`;
  }

  async read(uri: string): Promise<Buffer> {
    const { bucket, key } = this.parseUri(uri);
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    // ponytail: transforms are streaming, concat into buffer
    return Buffer.from(await response.Body!.transformToByteArray());
  }

  async delete(uri: string): Promise<void> {
    const { bucket, key } = this.parseUri(uri);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }

  async exists(uri: string): Promise<boolean> {
    try {
      const { bucket, key } = this.parseUri(uri);
      await this.client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }
}