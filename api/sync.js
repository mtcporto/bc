import { catalog } from '../lib/catalog.js';
import { createDataService } from '../lib/data.js';
import { createTursoCache } from '../lib/turso-cache.js';

// Six daily Vercel cron invocations, three indicators each, to fit the function deadline.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (!process.env.CRON_SECRET) return res.status(503).json({ error: 'CRON_NOT_CONFIGURED' });
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  const shard = Number(new URL(req.url, 'https://localhost').searchParams.get('shard'));
  if (!Number.isInteger(shard) || shard < 0 || shard > 5) return res.status(400).json({ error: 'INVALID_SHARD' });
  const cache = createTursoCache();
  if (!cache) return res.status(503).json({ error: 'TURSO_NOT_CONFIGURED' });
  const service = createDataService({ persistentCache: cache, ttl: 0, maxRetries: 0 });
  const ids = catalog.slice(shard * 3, shard * 3 + 3).map(item => item.id);
  const results = await Promise.all(ids.map(async id => {
    try {
      const result = await service.observations(id);
      if (result.meta.cache.stale) throw new Error('Source unavailable; retained prior snapshot');
      return { id, ok: true, observations: result.meta.total };
    } catch (error) {
      console.error('BCB scheduled sync failed', { indicator: id, error: error.message });
      return { id, ok: false };
    }
  }));
  return res.status(results.every(item => item.ok) ? 200 : 207).json({ shard, results });
}
