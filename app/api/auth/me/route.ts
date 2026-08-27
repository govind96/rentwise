import { getOwnerContext } from '../../../lib/auth';

export async function GET(request: Request) {
  const owner = await getOwnerContext(request);
  if (!owner) return Response.json({ error: 'Sign in is required' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  return Response.json({ id: owner.id, email: owner.email, name: owner.name }, { headers: { 'Cache-Control': 'no-store' } });
}
