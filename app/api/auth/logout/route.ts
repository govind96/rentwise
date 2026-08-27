export async function POST() {
  return Response.json({ signOutUrl: '/signout-with-chatgpt?return_to=/' }, { headers: { 'Cache-Control': 'no-store' } });
}
