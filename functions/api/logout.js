export async function onRequestPost({ request, env }) {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'mlink_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    }
  });
}
