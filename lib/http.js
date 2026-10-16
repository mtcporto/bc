import { searchIndicators, getIndicator } from './catalog.js';
import { dataService, DataError, toCsv } from './data.js';
import { openapi } from './openapi.js';

export function createApiHandler(service = dataService) {
  return async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, OPTIONS');
      return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } });
    }
    try {
      const url = new URL(req.originalUrl || req.url, 'http://localhost');
      const route = url.pathname.replace(/^\/api\/v1/, '').replace(/\/$/, '');
      for (const key of url.searchParams.keys()) {
        if (url.searchParams.getAll(key).length > 1) throw new DataError(400, 'INVALID_QUERY', `Parametro repetido: ${key}.`);
      }
      const params = Object.fromEntries(url.searchParams);
      if (route === '/openapi.json') return res.json(openapi);
      if (route === '/indicators') {
        if (Object.keys(params).some(key => !['q', 'topic'].includes(key))) throw new DataError(400, 'INVALID_QUERY', 'Use somente q e topic no catalogo.');
        const data = searchIndicators(params);
        return res.json({ data, meta: { total: data.length, version: '1' } });
      }
      const match = route.match(/^\/indicators\/([a-z0-9-]+)(?:\/(observations|observations\.csv))?$/);
      if (!match) throw new DataError(404, 'NOT_FOUND', 'Rota nao encontrada.');
      const indicator = getIndicator(match[1]);
      if (!indicator) throw new DataError(404, 'INDICATOR_NOT_FOUND', 'Indicador nao encontrado.');
      if (!match[2]) {
        if (Object.keys(params).length) throw new DataError(400, 'INVALID_QUERY', 'Metadados nao aceitam parametros.');
        return res.json({ data: indicator });
      }
      const result = await service.observations(indicator.id, params);
      res.setHeader('Cache-Control', 'no-store');
      if (match[2].endsWith('.csv')) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${indicator.id}.csv"`);
        return res.send(toCsv(result));
      }
      return res.json(result);
    } catch (error) {
      console.error('API request failed:', error.message);
      const known = error instanceof DataError;
      return res.status(known ? error.status : 500).json({
        error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : 'Erro interno ao processar a consulta.' },
      });
    }
  };
}

export default createApiHandler();
