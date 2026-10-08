// 保护需要登录的页面
export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  
  // 登录页和 API 不需要验证
  if (url.pathname === '/login.html' || url.pathname.startsWith('/api/')) {
    return next();
  }
  
  // 检查 session cookie
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/mlink_session=([a-f0-9]{64})/);
  
  if (!match) {
    // 未登录，重定向到登录页
    return Response.redirect(new URL('/login.html', request.url), 302);
  }
  
  const token = match[1];
  
  // 如果有 KV，验证 session
  if (env.SESSIONS) {
    const session = await env.SESSIONS.get(token);
    if (!session) {
      return Response.redirect(new URL('/login.html', request.url), 302);
    }
    const data = JSON.parse(session);
    if (data.exp < Date.now()) {
      await env.SESSIONS.delete(token);
      return Response.redirect(new URL('/login.html', request.url), 302);
    }
  }
  // 没有 KV 时，有 cookie 即视为已登录（简化模式）
  
  return next();
}
