export async function POST() {
  return Response.json({ signInUrl: '/signin-with-chatgpt?return_to=/dashboard' }, { headers: { 'Cache-Control': 'no-store' } });
}
