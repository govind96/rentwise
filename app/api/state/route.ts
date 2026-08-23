export async function GET() {
  return Response.json({ tenants: [], maintenance: [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST() {
  return Response.json(
    { error: 'The public demo is isolated in each visitor\'s browser.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}
