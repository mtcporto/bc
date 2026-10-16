import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, getIndicator, searchIndicators } from '../lib/catalog.js';
import { createDataService, validateQuery, normalizeRows, toCsv } from '../lib/data.js';

const now = () => new Date('2026-10-16T14:00:00Z');
const monthly = getIndicator('br-ipca-mensal');
const daily = getIndicator('br-usd-ptax-venda');
const rows = [{ data: '01/09/2026', valor: '0.82' }, { data: '01/08/2026', valor: '-0.32' }];
const fixture = extra => createDataService({
  now, fetchImpl: async () => new Response(JSON.stringify(rows)), ...extra,
});

test('catalog has eighteen unique stable IDs, original units and source links', () => {
  assert.equal(catalog.length, 18);
  assert.equal(new Set(catalog.map(x => x.id)).size, 18);
  assert.equal(getIndicator('br-selic-meta').code, 432);
  assert.equal(getIndicator('br-cdi-diario').unit, '% a.d.');
  assert.equal(getIndicator('br-ibc-br').code, 24363);
  for (const item of catalog) {
    assert.ok(item.source.metadataUrl.includes(String(item.code)));
    assert.deepEqual(Object.keys(item.explanation).sort(), ['caution', 'measures', 'reading', 'usefulness']);
    assert.ok(Object.values(item.explanation).every(value => typeof value === 'string' && value.length > 30));
  }
});

test('INCC, IGP-M and Selic are the only highlights and retain their units and order', () => {
  assert.deepEqual(catalog.filter(item => item.featured).map(item => [item.id, item.code, item.unit]), [
    ['br-incc-mensal', 192, '% a.m.'],
    ['br-igpm-mensal', 189, '% a.m.'],
    ['br-selic-meta', 432, '% a.a.'],
  ]);
  assert.equal(searchIndicators({ q: 'igpm' })[0].id, 'br-igpm-mensal');
  assert.equal(searchIndicators({ q: 'incc' })[0].id, 'br-incc-mensal');
});

test('search supports accents, topics and multi-word queries', () => {
  assert.equal(searchIndicators({ topic: 'Inflação' }).length, 5);
  assert.equal(searchIndicators({ q: 'dólar venda' })[0].id, daily.id);
  assert.equal(searchIndicators({ topic: 'Juros' }).length, 2);
  assert.equal(searchIndicators({ q: '432' })[0].id, 'br-selic-meta');
  assert.deepEqual(searchIndicators({ q: 'inexistente' }), []);
});

test('expanded coverage corrects legacy codes and distinguishes frequency from unit', () => {
  for (const [id, code, frequency, unit] of [
    ['br-eur-ptax-venda', 21619, 'daily', 'R$/€'],
    ['br-ipca15-mensal', 7478, 'monthly', '% a.m.'],
    ['br-pib-trimestral', 22099, 'quarterly', 'índice'],
    ['br-balanca-comercial', 22707, 'monthly', 'US$ milhões'],
    ['br-reservas-internacionais', 3546, 'monthly', 'US$ milhões'],
    ['br-poupanca', 195, 'daily', '% a.m.'],
    ['br-juros-credito-pf', 20716, 'monthly', '% a.a.'],
    ['br-credito-total', 20539, 'monthly', 'R$ milhões'],
    ['br-inadimplencia', 21082, 'monthly', '%'],
    ['br-desemprego', 24369, 'monthly', '%'],
  ]) {
    const indicator = getIndicator(id);
    assert.deepEqual([indicator.code, indicator.frequency, indicator.unit], [code, frequency, unit], id);
  }
  assert.ok(catalog.every(item => ![4385, 7456, 20727, 21620].includes(item.code)));
});

test('quarterly GDP uses quarter periods, retains source dates, sorts and rejects duplicate quarters', () => {
  const indicator = getIndicator('br-pib-trimestral');
  const query = { start: '2025-10-01', end: '2026-10-16' };
  const raw = [{ data: '01/04/2026', valor: '199.05' }, { data: '01/10/2025', valor: '192.94' }, { data: '01/01/2026', valor: '194.53' }];
  const data = normalizeRows(raw, indicator, query);
  assert.deepEqual(data.map(row => row.period), ['2025-Q4', '2026-Q1', '2026-Q2']);
  assert.equal(data[2].date, '2026-04-01');
  assert.equal(validateQuery(indicator, {}, now()).start, '2021-10-16');
  assert.throws(() => normalizeRows([...raw, { data: '01/06/2026', valor: '1' }], indicator, query), { code: 'DUPLICATE_PERIOD' });
});

test('query defaults are bounded and retain latest 60 observations', () => {
  assert.deepEqual(validateQuery(daily, {}, now()), { start: '2025-10-16', end: '2026-10-16', limit: 60 });
  assert.equal(validateQuery(monthly, {}, now()).start, '2021-10-16');
});

test('leap-day ranges clamp to the last valid day instead of rejecting the five-year chart', () => {
  const leapDay = new Date('2024-02-29T12:00:00Z');
  assert.equal(validateQuery(monthly, {}, leapDay).start, '2019-02-28');
  assert.equal(validateQuery(daily, {}, leapDay).start, '2023-02-28');
  assert.equal(validateQuery(monthly, { start: '2019-02-28' }, leapDay).start, '2019-02-28');
  assert.throws(() => validateQuery(monthly, { start: '2019-02-27' }, leapDay), { status: 400 });
});

test('invalid dates, repeated arrays, range, limits and future dates fail explicitly', () => {
  for (const input of [
    { start: '2026-02-30' }, { start: '2026-13-01' }, { end: '2026-10-17' },
    { start: '2020-01-01' }, { start: '2026-10-17' }, { limit: 0 }, { limit: 2001 },
    { limit: '1e2' }, { limit: '' }, { limit: ['2'] }, { start: '2026-1-01' },
    { format: 'csv' }, { end: '' }, { start: null },
  ]) assert.throws(() => validateQuery(daily, input, now()), { status: 400 });
});

test('normalization sorts, parses decimals, preserves raw data and monthly periods', () => {
  assert.deepEqual(normalizeRows(rows, monthly, { start: '2026-08-01', end: '2026-10-16' }), [
    { date: '2026-08-01', period: '2026-08', value: -.32, rawValue: '-0.32' },
    { date: '2026-09-01', period: '2026-09', value: .82, rawValue: '0.82' },
  ]);
});

test('future observations are excluded and daily dates are preserved', () => {
  const data = normalizeRows([{ data: '15/10/2026', valor: '5,0521' }, { data: '04/11/2026', valor: '99' }], daily, { start: '2026-10-01', end: '2026-10-16' });
  assert.deepEqual(data, [{ date: '2026-10-15', period: '2026-10-15', value: 5.0521, rawValue: '5,0521' }]);
});

test('malformed upstream data and duplicate periods are rejected, not defaulted to zero', () => {
  for (const value of [
    null, {}, [{ data: '01/09/2026', valor: '' }], [{ data: '01/09/2026', valor: 'NaN' }],
    [{ data: '31/02/2026', valor: '2' }], [{ data: '01/09/2026', valor: 2 }], [...rows, rows[0]],
  ]) assert.throws(() => normalizeRows(value, monthly, { start: '2026-01-01', end: '2026-10-16' }), { status: 502 });
});

test('latest available observation survives weekends, holidays and no publication today', async () => {
  const service = fixture({ fetchImpl: async url => {
    assert.equal(url.searchParams.get('dataFinal'), '16/10/2026');
    assert.equal(url.searchParams.get('dataInicial'), '16/10/2025');
    return new Response(JSON.stringify([{ data: '13/10/2026', valor: '5.0' }]));
  } });
  const result = await service.observations(daily.id, { limit: 1 });
  assert.equal(result.data.at(-1).date, '2026-10-13');
  assert.equal(result.data.at(-1).value, 5);
});

test('cache coalesces requests, shares different limits, expires and preserves retrieval time', async () => {
  let calls = 0;
  let time = now();
  const service = fixture({ now: () => time, fetchImpl: async () => { calls++; return new Response(JSON.stringify(rows)); } });
  const [a, b] = await Promise.all([service.observations(monthly.id), service.observations(monthly.id)]);
  assert.equal(calls, 1);
  assert.deepEqual(a.data, b.data);
  const smaller = await service.observations(monthly.id, { limit: 1 });
  assert.equal(smaller.meta.cache.hit, true);
  assert.equal(smaller.meta.retrievedAt, a.meta.retrievedAt);
  assert.equal(smaller.meta.truncated, true);
  assert.equal(smaller.meta.total, 2);
  assert.equal(smaller.data[0].period, '2026-09');
  time = new Date(time.getTime() + 300001);
  await service.observations(monthly.id);
  assert.equal(calls, 2);
});

test('failures are not cached; retry fetches again', async () => {
  let calls = 0;
  const service = fixture({ fetchImpl: async () => ++calls === 1 ? new Response('unavailable', { status: 503 }) : new Response(JSON.stringify(rows)) });
  await assert.rejects(service.observations(monthly.id), { status: 502, code: 'UPSTREAM_ERROR' });
  assert.equal((await service.observations(monthly.id)).data.length, 2);
  assert.equal(calls, 2);
});

test('empty interval has null coverage and explicit status, never an invented latest value', async () => {
  const result = await fixture({ fetchImpl: async () => new Response('[]') }).observations(monthly.id);
  assert.deepEqual(result.data, []);
  assert.equal(result.meta.status, 'empty');
  assert.deepEqual(result.meta.coverage, { first: null, last: null });
});

test('official SGS no-values 404 is empty; unrelated 404 errors remain errors', async () => {
  const body = { erro: { statusCode: 404, detail: 'br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found' } };
  const empty = await fixture({ fetchImpl: async () => new Response(JSON.stringify(body), { status: 404 }) }).observations(daily.id);
  assert.equal(empty.meta.status, 'empty');
  assert.deepEqual(empty.data, []);
  await assert.rejects(fixture({ fetchImpl: async () => new Response(JSON.stringify({ erro: { statusCode: 404, detail: 'Not found' } }), { status: 404 }) }).observations(daily.id), { status: 502, code: 'UPSTREAM_ERROR' });
});

test('network errors, invalid JSON and timeout surface as data errors', async () => {
  for (const fetchImpl of [
    async () => { throw new TypeError('network error'); },
    async () => new Response('<html>'),
    async () => { throw new DOMException('timed out', 'TimeoutError'); },
  ]) await assert.rejects(fixture({ fetchImpl }).observations(monthly.id), error => [502, 504].includes(error.status));
});

test('unknown indicators fail before any upstream call', async () => {
  await assert.rejects(fixture().observations('unknown'), { status: 404 });
});

test('CSV retains raw values, numeric values, unit and provenance per row', async () => {
  const result = await fixture().observations(monthly.id);
  const csv = toCsv(result);
  assert.equal(csv.split('\r\n').length, 4);
  assert.ok(csv.includes('"raw_value"'));
  assert.ok(csv.includes('"-0.32","-0.32","% a.m.","IBGE","433"'));
  assert.ok(csv.includes(result.meta.sourceUrl));
});
