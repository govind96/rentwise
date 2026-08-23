import { env } from 'cloudflare:workers';
import { getSessionOwner } from '../../../lib/auth';

export async function GET(request: Request) {
  const ownerId = await getSessionOwner(request);
  if (!ownerId || !env.DB) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  const owner = await env.DB.prepare('SELECT email FROM owners WHERE id = ?').bind(ownerId).first<{ email: string }>();
  if (!owner) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  return Response.json({ email: owner.email });
}
