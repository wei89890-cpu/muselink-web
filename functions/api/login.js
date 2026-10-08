// 用户配置：从环境变量读取，格式 USER1=user:pass,USER2=user:pass
// 或直接在这里硬编码（小团队用）
const USERS = {
  'admin': '123456789Wl-',
  // 在 Cloudflare Pages 设置环境变量 MUSELINK_USERS="user1:pass1,user2:pass2" 可覆盖
};

function getUsers(env) {
  if (env.MUSELINK_USERS) {
    const users = {};
    env.MUSELINK_USERS.split(',').forEach(pair => {
      const [u, p] = pair.split(':');
      if (u && p) users[u.trim()] = p.trim();
    });
    return users;
  }
  return USERS;
}

// 简单的 session token 生成
function makeToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();
    const users = getUsers(env);
    
    if (users[username] && users[username] === password) {
      const token = makeToken();
      // 存储 session（24小时有效）
      // 注意：需要 KV 绑定；如果没有 KV，用内存（仅单实例有效）
      const sessionData = JSON.stringify({ username, exp: Date.now() + 86400000 });
      
      // 尝试用 KV，如果没有则用 cookie 签名方式
      if (env.SESSIONS) {
        await env.SESSIONS.put(token, sessionData, { expirationTtl: 86400 });
      }
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `mlink_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${request.url.startsWith('https') ? '; Secure' : ''}`
        }
      });
    }
    
    return new Response(JSON.stringify({ ok: false, error: '用户名或密码错误' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: '请求错误' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
