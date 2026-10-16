const indicatorSchema = {
  type: 'object',
  required: ['id', 'name', 'code', 'topic', 'frequency', 'unit', 'publisher', 'description', 'methodology', 'source', 'explanation'],
  properties: {
    id: { type: 'string' }, name: { type: 'string' }, shortName: { type: 'string' },
    code: { type: 'integer' }, topic: { type: 'string' },
    frequency: { type: 'string', enum: ['daily', 'monthly', 'quarterly'] }, unit: { type: 'string' },
    publisher: { type: 'string' }, description: { type: 'string' }, methodology: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
    featured: { type: 'boolean', description: 'Indicador em destaque no painel.' },
    explanation: { type: 'object', required: ['measures', 'usefulness', 'reading', 'caution'], properties: {
      measures: { type: 'string' }, usefulness: { type: 'string' }, reading: { type: 'string' }, caution: { type: 'string' },
    } },
    source: { type: 'object', properties: {
      id: { type: 'string' }, name: { type: 'string' }, seriesCode: { type: 'integer' },
      metadataUrl: { type: 'string', format: 'uri' }, apiUrl: { type: 'string', format: 'uri' },
    } },
  },
};
const json = schema => ({ 'application/json': { schema } });
const id = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const query = [
  { name: 'start', in: 'query', description: 'Inicio inclusivo. Padrao: um ano para series diarias e cinco para mensais/trimestrais.', schema: { type: 'string', format: 'date' } },
  { name: 'end', in: 'query', description: 'Fim inclusivo, ate hoje (UTC). Intervalo maximo: cinco anos.', schema: { type: 'string', format: 'date' } },
  { name: 'limit', in: 'query', description: 'Ultimas N observacoes, ordenadas da mais antiga para a mais recente.', schema: { type: 'integer', minimum: 1, maximum: 2000, default: 60 } },
];
const error = { description: 'Erro explicito de validacao, indicador inexistente ou falha na fonte.', content: json({ type: 'object', required: ['error'], properties: { error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' } } } } }) };
const observations = {
  type: 'object', required: ['data', 'meta'],
  properties: {
    data: { type: 'array', items: { type: 'object', required: ['date', 'period', 'value', 'rawValue'], properties: {
      date: { type: 'string', format: 'date' }, period: { type: 'string', description: 'YYYY-MM para series mensais; YYYY-QN para trimestrais; YYYY-MM-DD para diarias. Data original da fonte preservada em date.' },
      value: { type: 'number' }, rawValue: { type: 'string' },
    } } },
    meta: { type: 'object', required: ['indicator', 'retrievedAt', 'sourceUrl', 'status', 'total', 'returned', 'truncated', 'coverage', 'query', 'cache', 'limitations'], properties: {
      indicator: { $ref: '#/components/schemas/Indicator' }, retrievedAt: { type: 'string', format: 'date-time' },
      sourceUrl: { type: 'string', format: 'uri' }, status: { enum: ['available', 'empty'] },
      total: { type: 'integer' }, returned: { type: 'integer' }, truncated: { type: 'boolean' },
      coverage: { type: 'object', properties: { first: { type: ['string', 'null'] }, last: { type: ['string', 'null'] } } },
      query: { type: 'object', properties: { start: { type: 'string', format: 'date' }, end: { type: 'string', format: 'date' }, limit: { type: 'integer' } } },
      cache: { type: 'object', properties: { hit: { type: 'boolean' }, ttlSeconds: { type: 'number' } } },
      limitations: { type: 'string' },
    } },
  },
};

export const openapi = {
  openapi: '3.1.0',
  info: { title: 'BC Aberto', version: '1.0.0', description: 'Catalogo curado de series oficiais via SGS/BCB com explicacoes. Sem autenticacao. Valores originais, sem estimativas ou aconselhamento financeiro. Cache de cinco minutos por instancia. Nao ha historico de revisoes.' },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/indicators': { get: { operationId: 'searchIndicators', summary: 'Descobrir indicadores', parameters: ['q', 'topic'].map(name => ({ name, in: 'query', schema: { type: 'string' } })), responses: { 200: { description: 'Catalogo filtrado', content: json({ type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Indicator' } }, meta: { type: 'object', properties: { total: { type: 'integer' }, version: { type: 'string' } } } } }) }, 400: error } } },
    '/indicators/{id}': { get: { operationId: 'getIndicator', summary: 'Metadados e metodologia', parameters: [id], responses: { 200: { description: 'Indicador', content: json({ type: 'object', properties: { data: { $ref: '#/components/schemas/Indicator' } } }) }, 400: error, 404: error } } },
    '/indicators/{id}/observations': { get: { operationId: 'getObservations', summary: 'Serie historica normalizada', parameters: [id, ...query], responses: { 200: { description: 'Observacoes e proveniencia; data vazio quando nao ha dados.', content: json({ $ref: '#/components/schemas/Observations' }) }, 400: error, 404: error, 502: error, 504: error } } },
    '/indicators/{id}/observations.csv': { get: { operationId: 'exportCsv', summary: 'Exportar com unidade e proveniencia em cada linha', parameters: [id, ...query], responses: { 200: { description: 'CSV UTF-8, separador virgula.', content: { 'text/csv': { schema: { type: 'string' } } } }, 400: error, 404: error, 502: error, 504: error } } },
  },
  components: { schemas: { Indicator: indicatorSchema, Observations: observations } },
};
