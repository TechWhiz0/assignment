import dns from "node:dns/promises";
import net from "node:net";

const PRIVATE_HOST = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export class UrlGuardError extends Error {
  code = "UNSAFE_URL";
  constructor(message: string) {
    super(message);
    this.name = "UrlGuardError";
  }
}

function isPrivateHost(host: string): boolean {
  return PRIVATE_HOST.some((r) => r.test(host));
}

export function parseHttpUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new UrlGuardError("Invalid company URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new UrlGuardError("Only http and https URLs are allowed");
  }
  return u;
}

export async function assertSafeUrl(raw: string): Promise<URL> {
  const u = parseHttpUrl(raw);
  const allowLocal = process.env.ALLOW_LOCAL_URLS === "1";
  if (isPrivateHost(u.hostname) && !allowLocal) {
    throw new UrlGuardError("Private and loopback addresses are blocked");
  }
  if (allowLocal) return u;
  try {
    const resolved = await dns.lookup(u.hostname, { all: true });
    for (const rec of resolved) {
      if (isPrivateHost(rec.address) || (net.isIP(rec.address) && isPrivateHost(rec.address))) {
        throw new UrlGuardError("URL resolves to a private address");
      }
    }
  } catch (err) {
    if (err instanceof UrlGuardError) throw err;
  }
  return u;
}
