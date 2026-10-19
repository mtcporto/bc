export function createTursoCache({ url = process.env.TURSO_DATABASE_URL, token = process.env.TURSO_AUTH_TOKEN, fetchImpl = fetch } = {}) {
  if (!url || !token) return null;
  const endpoint = new URL(url.replace(/^libsql:\/\//, 'https://'));
  if (endpoint.protocol !== 'https:') throw new Error('Turso URL must use HTTPS or libsql');
  endpoint.pathname = '/v2/pipeline';
  endpoint.search = '';
  let initialized;
  async function execute(sql, args = []) {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql, args: args.map(value => ({ type: 'text', value: String(value) })) } }, { type: 'close' }] }),
    });
    if (!response.ok) throw new Error(`Turso HTTP ${response.status}`);
    const result = await response.json();
    const item = result.results?.[0];
    if (item?.type !== 'ok') throw new Error('Turso query failed');
    return item.response.result;
  }
  async function ensureTable() {
    if (!initialized) initialized = execute('CREATE TABLE IF NOT EXISTS indicator_cache (cache_key TEXT PRIMARY KEY, payload TEXT NOT NULL, retrieved_at TEXT NOT NULL)')
      .catch(error => { initialized = null; throw error; });
    await initialized;
  }
  return {
    async get(key) {
      await ensureTable();
      const result = await execute('SELECT payload FROM indicator_cache WHERE cache_key = ?', [key]);
      const value = result.rows?.[0]?.[0]?.value;
      return value ? JSON.parse(value) : null;
    },
    async set(key, value) {
      await ensureTable();
      await execute('INSERT INTO indicator_cache (cache_key, payload, retrieved_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, retrieved_at = excluded.retrieved_at', [key, JSON.stringify(value), value.retrievedAt]);
    },
  };
}
