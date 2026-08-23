export async function POST() {
  return Response.json(
    { error: 'Owner accounts are not enabled in this MVP. Open /dashboard to use the no-login demo.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
