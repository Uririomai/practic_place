const levels = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof levels;

const currentLevel: Level = (process.env.LOG_LEVEL as Level) ?? "info";

function log(level: Level, msg: string, ...args: unknown[]) {
  // ponytail: no external logger, just timestamped stdout
  if (levels[level] < levels[currentLevel]) return;
  const ts = new Date().toISOString();
  const line = args.length ? `${msg} ${args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")}` : msg;
  const out = level === "error" ? process.stderr : process.stdout;
  out.write(`${ts} [${level.toUpperCase()}] ${line}\n`);
}

export const logger = {
  debug: (msg: string, ...args: unknown[]) => log("debug", msg, ...args),
  info: (msg: string, ...args: unknown[]) => log("info", msg, ...args),
  warn: (msg: string, ...args: unknown[]) => log("warn", msg, ...args),
  error: (msg: string, ...args: unknown[]) => log("error", msg, ...args),
};