import { env } from 'cloudflare:workers';

const encoder = new TextEncoder();
const COOKIE_NAME = 'rw_session';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function sessionSecret() {
  const secret = (env as unknown as { SESSION_SECRET?: string }).SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be configured before owner authentication is enabled');
  return secret;
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(sessionSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createSessionToken(ownerId: number) {
  const payload = `${ownerId}.${Date.now() + THIRTY_DAYS * 1000}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token: string): Promise<number | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, exp, signature] = parts;
  if (!Number(exp) || Number(exp) < Date.now()) return null;
  const expected = await sign(`${id}.${exp}`);
  return expected === signature ? Number(id) : null;
}

export async function getSessionOwner(request: Request): Promise<number | null> {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  try {
    return await verifySessionToken(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${THIRTY_DAYS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}
