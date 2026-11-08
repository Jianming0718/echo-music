import { searchMusic } from './music.mjs';

const origins = new Set(['https://echo-music-free-player.stablepeace1.chatgpt.site', 'https://jianming0718.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000']);
const cache = new Map<string, { expires: number; value: unknown }>();
const buckets = new Map<string, { expires: number; count: number }>();
const keys = new Map<string, number>();

function limited(id: string, limit: number) {
  const now = Date.now();
  if (buckets.size > 1000) for (const [key, bucket] of buckets) if (bucket.expires < now) buckets.delete(key);
  let bucket = buckets.get(id);
  if (!bucket || bucket.expires < now) { bucket = { expires: now + 60000, count: 0 }; buckets.set(id, bucket); }
  return ++bucket.count > limit;
}

async function validKey(key: string) {
  if (!key.startsWith('sb_publishable_') || key.length > 300) return false;
  if ((keys.get(key) || 0) > Date.now()) return true;
  const project = Deno.env.get('SUPABASE_URL');
  if (!project) return false;
  const response = await fetch(project + '/auth/v1/settings', { headers: { apikey: key }, signal: AbortSignal.timeout(4000) });
  if (!response.ok) return false;
  await response.body?.cancel();
  if (keys.size > 8) keys.clear();
  keys.set(key, Date.now() + 1800000);
  return true;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'null', 'Access-Control-Allow-Headers': 'apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '3600', 'Vary': 'Origin', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
  if (!origins.has(origin)) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (limited('all', 120) || limited('ip:' + ip, 30)) return json({ error: 'RATE_LIMITED' }, 429);
  try {
    if (!await validKey(req.headers.get('apikey') || '')) return json({ error: 'INVALID_CLIENT_KEY' }, 401);
    const input = await req.text();
    if (input.length > 8000) return json({ error: 'INVALID_QUERY' }, 400);
    let data;
    try { data = JSON.parse(input); } catch { return json({ error: 'INVALID_QUERY' }, 400); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'INVALID_QUERY' }, 400);
    const q = typeof data.q === 'string' ? data.q.trim().replace(/\s+/g, ' ') : '';
    const filter = data.filter === 'videos' ? 'videos' : 'songs';
    const continuation = data.continuation;
    if (!q || q.length > 160 || (continuation !== undefined && (typeof continuation !== 'string' || continuation.length > 6000 || !/^[A-Za-z0-9_%=+\/-]+$/.test(continuation)))) return json({ error: 'INVALID_QUERY' }, 400);
    const key = JSON.stringify([q.toLowerCase(), filter, continuation || '']);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return json(cached.value);
    const value = await searchMusic({ q, filter, continuation });
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 300000, value });
    return json(value);
  } catch (error) {
    const timedOut = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
    return json({ error: timedOut ? 'SEARCH_TIMEOUT' : 'SEARCH_UNAVAILABLE' }, timedOut ? 504 : 502);
  }
});
