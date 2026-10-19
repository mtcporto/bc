import { get as httpsGet } from 'node:https';
import { getIndicator } from './catalog.js';

export class DataError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const isoDate = date => date.toISOString().slice(0, 10);

function yearsBefore(date, years) {
  const result = new Date(date);
  const month = result.getUTCMonth();
  result.setUTCFullYear(result.getUTCFullYear() - years);
  if (result.getUTCMonth() !== month) result.setUTCDate(0);
  return result;
}

function parseDate(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DataError(400, 'INVALID_DATE', `${field} deve usar YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || isoDate(date) !== value) {
    throw new DataError(400, 'INVALID_DATE', `${field} contem uma data inexistente.`);
  }
  return date;
}

export function validateQuery(indicator, input = {}, now = new Date()) {
  const allowed = ['start', 'end', 'limit'];
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) throw new DataError(400, 'INVALID_QUERY', `Parametro desconhecido: ${key}.`);
    if (!['string', 'number'].includes(typeof input[key])) throw new DataError(400, 'INVALID_QUERY', `Parametro invalido: ${key}.`);
  }
  const today = isoDate(now);
  const end = input.end === undefined ? today : input.end;
  const endDate = parseDate(end, 'end');
  if (end > today) throw new DataError(400, 'FUTURE_DATE', 'end nao pode estar no futuro.');
  const earliest = yearsBefore(endDate, 5);
  const defaultStart = yearsBefore(endDate, indicator.frequency === 'daily' ? 1 : 5);
  const start = input.start === undefined ? isoDate(defaultStart) : input.start;
  parseDate(start, 'start');
  if (start > end) throw new DataError(400, 'INVALID_RANGE', 'start deve ser anterior ou igual a end.');
  if (start < isoDate(earliest)) throw new DataError(400, 'RANGE_TOO_LARGE', 'Consulte no maximo cinco anos por requisicao.');
  const limit = input.limit === undefined ? 60 : Number(input.limit);
  if (!/^\d+$/.test(String(input.limit ?? 60)) || !Number.isInteger(limit) || limit < 1 || limit > 2000) {
    throw new DataError(400, 'INVALID_LIMIT', 'limit deve ser um inteiro entre 1 e 2000.');
  }
  return { start, end, limit };
}

function bcbDate(value) {
  return value.split('-').reverse().join('/');
}

export function normalizeRows(rows, indicator, query) {
  if (!Array.isArray(rows)) throw new DataError(502, 'INVALID_UPSTREAM_DATA', 'O BCB retornou um formato inesperado.');
  const periods = new Set();
  return rows.map(row => {
    if (typeof row?.data !== 'string' || !/^\d{2}\/\d{2}\/\d{4}$/.test(row.data)
      || typeof row.valor !== 'string' || !/^-?\d+(?:[.,]\d+)?$/.test(row.valor)) {
      throw new DataError(502, 'INVALID_UPSTREAM_DATA', 'O BCB retornou uma observacao invalida.');
    }
    const date = row.data.split('/').reverse().join('-');
    try { parseDate(date, 'data'); } catch {
      throw new DataError(502, 'INVALID_UPSTREAM_DATA', 'O BCB retornou uma data invalida.');
    }
    const value = Number(row.valor.replace(',', '.'));
    if (!Number.isFinite(value)) throw new DataError(502, 'INVALID_UPSTREAM_DATA', 'O BCB retornou um valor invalido.');
    const period = indicator.frequency === 'quarterly' ? `${date.slice(0, 4)}-Q${Math.ceil(Number(date.slice(5, 7)) / 3)}`
      : indicator.frequency === 'monthly' ? date.slice(0, 7) : date;
    if (periods.has(period)) throw new DataError(502, 'DUPLICATE_PERIOD', 'O BCB retornou periodos duplicados.');
    periods.add(period);
    return { date, period, value, rawValue: row.valor };
  }).filter(row => row.date >= query.start && row.date <= query.end)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Some runtimes intercept fetch() and rewrite absolute BCB URLs to relative
// /api/proxy URLs, which Node cannot parse. Use Node HTTPS as a narrow fallback.
function directBcbRequest(url) {
  if (url.protocol !== 'https:' || url.hostname !== 'api.bcb.gov.br') {
    throw new Error('Unexpected upstream host');
  }
  return new Promise((resolve, reject) => {
    const req = httpsGet(url, { headers: { Accept: 'application/json' }, timeout: 20000 }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: response.statusCode,
          ok: response.statusCode >= 200 && response.statusCode < 300,
          json: async () => JSON.parse(body),
        });
      });
    });
    req.on('timeout', () => {
      const error = new Error('BCB request timed out');
      error.name = 'TimeoutError';
      req.destroy(error);
    });
    req.on('error', reject);
  });
}

export function createDataService({ fetchImpl = fetch, now = () => new Date(), ttl = 300000,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxRetries = 2 } = {}) {
  const cache = new Map();
  const pending = new Map();

  async function observations(id, input = {}) {
    const indicator = getIndicator(id);
    if (!indicator) throw new DataError(404, 'INDICATOR_NOT_FOUND', 'Indicador nao encontrado.');
    const query = validateQuery(indicator, input, now());
    const key = `${id}:${query.start}:${query.end}`;
    const cached = cache.get(key);
    let entry;
    let cacheHit = false;
    if (cached && now().getTime() - cached.time < ttl) {
      entry = cached;
      cacheHit = true;
    } else {
      if (!pending.has(key)) {
        const request = (async () => {
          const url = new URL(indicator.source.apiUrl);
          url.search = new URLSearchParams({ formato: 'json', dataInicial: bcbDate(query.start), dataFinal: bcbDate(query.end) });
          let rows;
          try {
            let response;
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
              try {
                try {
                  response = await fetchImpl(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
                } catch (error) {
                  if (!(error.message || '').includes('Failed to parse URL from /api/proxy?')) throw error;
                  console.warn('BCB fetch proxy returned a relative URL; retrying via direct HTTPS');
                  response = await directBcbRequest(url);
                }
                if (![429, 502, 503, 504].includes(response.status) || attempt === maxRetries) break;
                console.warn('BCB transient HTTP error', { indicator: id, status: response.status, attempt: attempt + 1 });
              } catch (error) {
                if (attempt === maxRetries || error instanceof DataError) throw error;
                console.warn('BCB connection retry', { indicator: id, attempt: attempt + 1, error: error.name });
              }
              await sleep(250 * 2 ** attempt + Math.floor(Math.random() * 100));
            }
            if (response.status === 404) {
              const body = await response.json();
              // SGS uses this specific business error for valid intervals without observations.
              if (body?.erro?.statusCode === 404 && body.erro.detail === 'br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found') {
                rows = [];
              } else {
                throw new DataError(502, 'UPSTREAM_ERROR', 'BCB retornou um erro inesperado (HTTP 404).');
              }
            } else {
              if (!response.ok) throw new DataError(response.status === 504 ? 504 : 502, 'UPSTREAM_ERROR', `BCB indisponível (HTTP ${response.status}). Tente novamente.`);
              rows = await response.json();
            }
          } catch (error) {
            if (error instanceof DataError) throw error;
            console.error('BCB request failed:', { indicator: id, series: indicator.code, error: error.message, type: error.name });
            throw new DataError(error.name === 'TimeoutError' ? 504 : 502, 'UPSTREAM_UNAVAILABLE', 'Nao foi possivel consultar o BCB. Tente novamente.');
          }
          const data = normalizeRows(rows, indicator, query);
          const result = { data, time: now().getTime(), retrievedAt: now().toISOString(), requestUrl: url.href };
          if (cache.size >= 100) cache.delete(cache.keys().next().value);
          cache.set(key, result);
          return result;
        })();
        pending.set(key, request);
      }
      try { entry = await pending.get(key); } finally { pending.delete(key); }
    }
    const data = entry.data.slice(-query.limit);
    return {
      data,
      meta: {
        indicator, query, sourceUrl: entry.requestUrl, retrievedAt: entry.retrievedAt,
        cache: { hit: cacheHit, ttlSeconds: ttl / 1000 },
        total: entry.data.length, returned: data.length, truncated: entry.data.length > data.length,
        coverage: { first: data[0]?.period ?? null, last: data.at(-1)?.period ?? null },
        status: data.length ? 'available' : 'empty',
        limitations: 'Ultima observacao no periodo, nao tempo real. Dados sujeitos a revisao na fonte. Sem historico de revisoes. Cache em memoria por instancia.',
      },
    };
  }
  return { observations };
}

export const dataService = createDataService();

export function toCsv(result) {
  const quote = value => `"${String(value).replaceAll('"', '""')}"`;
  const { indicator, retrievedAt, sourceUrl } = result.meta;
  const rows = [['indicator', 'period', 'date', 'value', 'raw_value', 'unit', 'publisher', 'source_series', 'source_url', 'retrieved_at'],
    ...result.data.map(row => [indicator.id, row.period, row.date, row.value, row.rawValue, indicator.unit, indicator.publisher, indicator.code, sourceUrl, retrievedAt])];
  return rows.map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
}
