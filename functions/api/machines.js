// 机器管理 API
// GET: 获取机器列表
// POST: 添加机器 {id, name}
// DELETE: 删除机器 ?id=xxx

const DEFAULT_MACHINES = [
  { id: 'muse', name: 'muse' },
  { id: 'muse-1', name: 'muse-1' },
  { id: 'muse-2', name: 'muse-2' },
  { id: 'muse-3', name: 'muse-3' },
];

async function getMachines(env) {
  if (env.MACHINES_KV) {
    const data = await env.MACHINES_KV.get('machines');
    if (data) return JSON.parse(data);
  }
  // 从环境变量读取
  if (env.MUSELINK_MACHINES) {
    try {
      return JSON.parse(env.MUSELINK_MACHINES);
    } catch (e) {}
  }
  return DEFAULT_MACHINES;
}

async function saveMachines(env, machines) {
  if (env.MACHINES_KV) {
    await env.MACHINES_KV.put('machines', JSON.stringify(machines));
    return true;
  }
  return false; // 没有 KV 时无法持久化
}

export async function onRequestGet({ env }) {
  const machines = await getMachines(env);
  return new Response(JSON.stringify({ ok: true, machines }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const { id, name } = await request.json();
    if (!id || !name) {
      return new Response(JSON.stringify({ ok: false, error: '需要 id 和 name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const machines = await getMachines(env);
    if (machines.find(m => m.id === id)) {
      return new Response(JSON.stringify({ ok: false, error: '机器已存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    machines.push({ id, name });
    const saved = await saveMachines(env, machines);
    return new Response(JSON.stringify({ 
      ok: true, 
      machines,
      persistent: saved,
      warning: saved ? undefined : '未配置 KV，重启后失效'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: '请求错误' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ ok: false, error: '需要 id 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const machines = await getMachines(env);
  const filtered = machines.filter(m => m.id !== id);
  if (filtered.length === machines.length) {
    return new Response(JSON.stringify({ ok: false, error: '机器不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const saved = await saveMachines(env, machines);
  return new Response(JSON.stringify({ 
    ok: true, 
    machines: filtered,
    persistent: saved
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
