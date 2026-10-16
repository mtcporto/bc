import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createApiHandler } from '../lib/http.js';
import { createDataService } from '../lib/data.js';
import { createMcpServer } from '../lib/mcp.js';
import { createApp } from '../proxy-server.js';
import v1Handler from '../api/indicators.js';
import mcpHandler from '../api/mcp.js';

const service = createDataService({
  now: () => new Date('2026-10-16T12:00:00Z'),
  fetchImpl: async () => new Response(JSON.stringify([{ data: '01/09/2026', valor: '0.82' }])),
});
let server;
let base;
before(async () => {
  const app = createApp();
  const fixture = express();
  fixture.use('/api/v1', createApiHandler(service));
  fixture.use(app);
  server = fixture.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('Vercel entrypoints export the real shared handlers', () => {
  assert.equal(typeof v1Handler, 'function');
  assert.equal(typeof mcpHandler, 'function');
});

test('Vercel explicit rewrite routes all API depths without relaxing public query validation', async () => {
  const app = express();
  app.use('/api/entrypoint', v1Handler);
  app.use(createApiHandler(service, { routeParameter: 'route' }));
  const routed = app.listen(0, '127.0.0.1');
  await new Promise(resolve => routed.once('listening', resolve));
  const origin = `http://127.0.0.1:${routed.address().port}`;
  try {
    for (const route of [
      '/indicators',
      '/indicators?q=432',
      '/indicators/br-ipca-mensal',
      '/indicators/br-ipca-mensal/observations?limit=1',
      '/indicators/br-ipca-mensal/observations.csv?limit=1',
      '/openapi.json',
    ]) {
      const source = new URL(`/api/v1${route}`, origin);
      const url = new URL('/api/indicators', origin);
      url.search = source.search;
      url.searchParams.set('route', source.pathname.slice('/api/v1/'.length));
      const response = await fetch(url);
      assert.equal(response.status, 200, route);
      if (route === '/indicators') assert.equal((await response.json()).data.length, 18);
      if (route === '/indicators?q=432') assert.equal((await response.json()).data[0].id, 'br-selic-meta');
    }
    for (const query of ['route=indicators&path=invalid', 'route=indicators&route=indicators', 'route=indicators&unknown=1', 'route=indicators&q=a&q=b']) {
      assert.equal((await fetch(`${origin}/api/indicators?${query}`)).status, 400, query);
    }
    const response = await fetch(`${origin}/api/entrypoint?route=indicators`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.length, 18);
  } finally {
    await new Promise((resolve, reject) => routed.close(error => error ? reject(error) : resolve()));
  }
});

test('catalog, detail, JSON, CSV and OpenAPI work over HTTP', async () => {
  const catalog = await (await fetch(`${base}/api/v1/indicators?q=ipca`)).json();
  assert.equal(catalog.meta.total, 3);
  const byCode = await (await fetch(`${base}/api/v1/indicators?q=432`)).json();
  assert.deepEqual(byCode.data.map(item => item.id), ['br-selic-meta']);
  const detail = await (await fetch(`${base}/api/v1/indicators/br-ipca-mensal`)).json();
  assert.equal(detail.data.code, 433);
  const data = await (await fetch(`${base}/api/v1/indicators/br-ipca-mensal/observations?limit=1`)).json();
  assert.equal(data.data[0].value, .82);
  const csv = await fetch(`${base}/api/v1/indicators/br-ipca-mensal/observations.csv`);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  assert.match(csv.headers.get('content-disposition'), /br-ipca-mensal\.csv/);
  assert.ok((await csv.text()).includes('"0.82"'));
  const openapi = await (await fetch(`${base}/api/v1/openapi.json`)).json();
  assert.equal(openapi.openapi, '3.1.0');
  assert.equal(Object.keys(openapi.paths).length, 4);
  assert.ok(openapi.components.schemas.Observations.properties.meta.properties.truncated);
});

test('invalid queries, duplicate values, unknown series/routes and methods have explicit errors', async () => {
  for (const [route, status] of [
    ['/indicators/unknown', 404], ['/unknown', 404],
    ['/indicators/br-ipca-mensal/observations?limit=-1', 400],
    ['/indicators/br-ipca-mensal/observations?limit=1&limit=2', 400],
    ['/indicators/br-ipca-mensal/observations?start=2026-02-30', 400],
    ['/indicators?url=https://example.com', 400],
    ['/indicators/br-ipca-mensal?limit=1', 400],
  ]) {
    const response = await fetch(`${base}/api/v1${route}`);
    assert.equal(response.status, status, route);
    assert.ok((await response.json()).error.code);
  }
  assert.equal((await fetch(`${base}/api/v1/indicators`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/api/v1/indicators`, { method: 'OPTIONS' })).status, 204);
});

test('highlighted indices are discoverable through REST and expose monthly observations and CSV', async () => {
  const catalog = await (await fetch(`${base}/api/v1/indicators`)).json();
  assert.deepEqual(catalog.data.filter(item => item.featured).map(item => item.shortName), ['INCC', 'IGP-M', 'Selic']);
  for (const [id, code] of [['br-incc-mensal', 192], ['br-igpm-mensal', 189]]) {
    const response = await fetch(`${base}/api/v1/indicators/${id}/observations?limit=1`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.meta.indicator.code, code);
    assert.equal(body.meta.indicator.unit, '% a.m.');
    assert.equal(body.meta.indicator.publisher, 'FGV');
    assert.equal(body.data[0].period, '2026-09');
    assert.ok((await (await fetch(`${base}/api/v1/indicators/${id}/observations.csv`)).text()).includes(`"${id}"`));
  }
});

test('only public files are served and legacy remains reachable', async () => {
  const response = await fetch(base);
  assert.match(await response.text(), /BC Aberto/);
  assert.match(await (await fetch(`${base}/legacy.html`)).text(), /versão legada/);
  for (const file of ['package.json', 'proxy-server.js', '.git/config', 'lib/catalog.js']) {
    assert.equal((await fetch(`${base}/${file}`)).status, 404, file);
  }
});

test('MCP initialize, tools/list and tools/call work through real Streamable HTTP SDK client', async () => {
  const client = new Client({ name: 'http-test', version: '1.0.0' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/api/mcp`)));
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(x => x.name).sort(), ['get_indicator', 'get_observations', 'search_indicators']);
    assert.ok(tools.every(x => x.annotations.readOnlyHint));
    const found = await client.callTool({ name: 'search_indicators', arguments: { q: 'inflação' } });
    assert.equal(found.structuredContent.data.length, 3);
    const metadata = await client.callTool({ name: 'get_indicator', arguments: { id: 'br-selic-meta' } });
    assert.equal(metadata.structuredContent.data.unit, '% a.a.');
    for (const id of ['br-incc-mensal', 'br-igpm-mensal']) {
      const highlighted = await client.callTool({ name: 'get_indicator', arguments: { id } });
      assert.equal(highlighted.structuredContent.data.featured, true);
      assert.equal(highlighted.structuredContent.data.unit, '% a.m.');
    }
    const missing = await client.callTool({ name: 'get_indicator', arguments: { id: 'does-not-exist' } });
    assert.equal(missing.isError, true);
    const invalid = await client.callTool({ name: 'get_observations', arguments: { id: 'br-ipca-mensal', start: '2026-02-30' } });
    assert.equal(invalid.isError, true);
  } finally { await client.close(); }
  assert.equal((await fetch(`${base}/api/mcp`)).status, 405);
});

test('MCP observations and REST share exactly the same data contract', async () => {
  const server = createMcpServer(service);
  const client = new Client({ name: 'fixture-test', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(a);
    await client.connect(b);
    const result = await client.callTool({ name: 'get_observations', arguments: { id: 'br-ipca-mensal', limit: 1 } });
    const rest = await service.observations('br-ipca-mensal', { limit: 1 });
    assert.deepEqual(result.structuredContent.data, rest.data);
    assert.deepEqual(result.structuredContent.meta.indicator, rest.meta.indicator);
    assert.equal(result.structuredContent.meta.status, 'available');
    assert.equal(result.structuredContent.meta.sourceUrl, rest.meta.sourceUrl);
    assert.equal(result.structuredContent.meta.retrievedAt, rest.meta.retrievedAt);
  } finally { await client.close(); await server.close(); }
});

test('home is focused on indicators; developer and source pages have their own navigation and assets', async () => {
  const home = await (await fetch(base)).text();
  assert.ok(!home.includes('id="desenvolvedores"'));
  assert.ok(!home.includes('id="fontes"'));
  assert.ok(!home.includes('signal-bars'));
  assert.ok(home.includes('id="explanation"'));
  assert.ok(!home.includes('/economia.svg'));
  assert.ok(!home.includes('/hero-dados.svg'));
  assert.ok(!home.includes('/legacy.html'));
  for (const page of ['desenvolvedores.html', 'fontes.html']) {
    const response = await fetch(`${base}/${page}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`href="/${page}" aria-current="page"`));
    assert.ok(html.includes('src="/site.js"'));
    assert.ok(!html.includes('src="/app.js"'));
    assert.ok(!html.includes('/legacy.html'));
    assert.ok(!html.includes('Revisão do painel antigo'));
  }
  for (const asset of ['site.js', 'developers.js', 'sources.js']) {
    assert.equal((await fetch(`${base}/${asset}`)).status, 200, asset);
  }
});

test('every catalog series is available through the same REST service with explanatory metadata', async () => {
  const { data } = await (await fetch(`${base}/api/v1/indicators`)).json();
  assert.equal(data.length, 18);
  for (const item of data) {
    const response = await fetch(`${base}/api/v1/indicators/${item.id}/observations?limit=1`);
    assert.equal(response.status, 200, item.id);
    const body = await response.json();
    assert.equal(body.meta.indicator.unit, item.unit);
    assert.deepEqual(body.meta.indicator.explanation, item.explanation);
    assert.equal(body.data[0].period, item.frequency === 'quarterly' ? '2026-Q3' : item.frequency === 'monthly' ? '2026-09' : '2026-09-01');
  }
});
