export interface Storage {
  save(
    path: string,
    data: Buffer,
  ): Promise<string>;

  read(
    uri: string,
  ): Promise<Buffer>;

  delete(
    uri: string,
  ): Promise<void>;

  exists(
    uri: string,
  ): Promise<boolean>;
}
