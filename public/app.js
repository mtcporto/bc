const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const { toast, copy } = window.BCUI;
const state = { catalog: [], cards: new Map(), selected: null, result: null, range: 12, view: 'chart', topic: '', request: null };
const topicLabels = { Inflacao: 'Inflação', Cambio: 'Câmbio', Juros: 'Juros', Atividade: 'Atividade', 'Setor externo': 'Setor externo', Investimentos: 'Investimentos', Credito: 'Crédito', Emprego: 'Emprego' };
const frequencyLabels = { daily: 'Diária', monthly: 'Mensal', quarterly: 'Trimestral' };
const number = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(value);
const dateLabel = period => /^\d{4}-Q[1-4]$/.test(period) ? `${period.at(-1)}º tri. de ${period.slice(0, 4)}`
  : new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...(period.length === 7 ? { month: 'short', year: 'numeric' } : { day: '2-digit', month: 'short', year: 'numeric' }) }).format(new Date(`${period.length === 7 ? `${period}-01` : period}T12:00:00Z`));
const dateISO = date => date.toISOString().slice(0, 10);
const observationCount = count => `${count} ${count === 1 ? 'observação' : 'observações'}`;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || `Falha na consulta (HTTP ${response.status}).`);
  return body;
}

function queryUrl(id, months, extension = '') {
  const end = new Date();
  const start = new Date(end);
  // Calendar subtraction clamps month ends instead of rolling into the next month.
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(day, lastDay));
  if (state.selected?.frequency === 'monthly' && months < 60) start.setUTCDate(1);
  const query = new URLSearchParams({ start: dateISO(start), end: dateISO(end), limit: '2000' });
  return `/api/v1/indicators/${id}/observations${extension}?${query}`;
}

function chart(rows, compact = false) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const width = compact ? 100 : 680;
  const height = compact ? 40 : 245;
  const left = compact ? 1 : 53;
  const top = compact ? 3 : 16;
  const bottom = compact ? 3 : 35;
  const right = compact ? 1 : 16;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', compact ? 'sparkline' : 'history-chart');
  if (compact) svg.setAttribute('aria-hidden', 'true');
  else {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${observationCount(rows.length)} de ${state.selected.name}, de ${dateLabel(rows[0].period)} a ${dateLabel(rows.at(-1).period)}. Valores exatos na tabela.`);
  }
  const values = rows.map(row => row.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = max === min ? Math.max(Math.abs(max) * .03, .01) : (max - min) * .15;
  const low = min - padding;
  const high = max + padding;
  const first = Date.parse(rows[0].date);
  const last = Date.parse(rows.at(-1).date);
  const x = row => first === last ? (left + width - right) / 2 : left + (Date.parse(row.date) - first) / (last - first) * (width - left - right);
  const y = value => top + (high - value) / (high - low) * (height - top - bottom);
  const add = (tag, attrs, text) => {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    svg.append(node);
    return node;
  };
  if (!compact) {
    for (let i = 0; i < 4; i++) {
      const value = low + (high - low) * i / 3;
      add('line', { x1: left, x2: width - right, y1: y(value), y2: y(value), class: 'grid-line' });
      add('text', { x: left - 9, y: y(value) + 3, 'text-anchor': 'end', class: 'axis-label' }, new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, notation: 'compact' }).format(value));
    }
    const indexes = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])];
    for (const index of indexes) add('text', { x: x(rows[index]), y: height - 10, 'text-anchor': index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle', class: 'axis-label' }, dateLabel(rows[index].period));
  }
  const points = rows.map(row => `${x(row)},${y(row.value)}`).join(' ');
  if (!compact) add('polygon', { points: `${x(rows[0])},${height - bottom} ${points} ${x(rows.at(-1))},${height - bottom}`, fill: 'currentColor', opacity: '.06' });
  add('polyline', { points, fill: 'none', stroke: 'currentColor', 'stroke-width': compact ? 1.7 : 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  if (!compact || rows.length === 1) {
    for (const row of rows) {
      const dot = add('circle', { cx: x(row), cy: y(row.value), r: rows.length < 70 ? 2.5 : 1.3, fill: 'currentColor' });
      const title = document.createElementNS(ns, 'title');
      title.textContent = `${dateLabel(row.period)}: ${number(row.value)} ${state.selected.unit}`;
      dot.append(title);
    }
  }
  return svg;
}

function filteredCatalog() {
  const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = normalized($('#search').value).trim().split(/\s+/).filter(Boolean);
  return state.catalog.filter(item => (!state.topic || item.topic === state.topic)
    && terms.every(term => normalized([item.id, item.code, item.name, item.description, item.publisher, ...item.keywords].join(' ')).includes(term)));
}

function renderCards() {
  const visible = filteredCatalog();
  const grid = $('#indicator-grid');
  const featuredGrid = $('#featured-grid');
  grid.replaceChildren();
  featuredGrid.replaceChildren();
  const groups = new Map();
  for (const topic of new Set(visible.filter(item => !item.featured).map(item => item.topic))) {
    const section = element('section', 'topic-group');
    const heading = element('h4', 'topic-heading', topicLabels[topic] || topic);
    const body = element('div', 'indicator-grid');
    section.append(heading, body);
    grid.append(section);
    groups.set(topic, body);
  }
  for (const item of visible) {
    const result = state.cards.get(item.id);
    const last = result?.data?.at(-1);
    const card = element('button', `indicator-card${item.featured ? ' featured-card' : ''}${state.selected?.id === item.id ? ' selected' : ''}`);
    card.type = 'button';
    card.setAttribute('aria-pressed', String(state.selected?.id === item.id));
    card.setAttribute('aria-label', `${item.name}. ${last ? `${number(last.value)} ${item.unit}, referência ${dateLabel(last.period)}` : result?.error || 'Consultando dados'}. Explorar série.`);
    const top = element('div', 'card-top');
    top.append(element('span', 'card-topic', topicLabels[item.topic]), element('span', 'card-arrow', '↗'));
    const reading = element('div', 'card-reading');
    reading.title = `Últimas ${result?.data?.length || 0} observações · frequência ${frequencyLabels[item.frequency].toLowerCase()}`;
    const value = element('div', 'card-value', last ? number(last.value) : '—');
    value.append(element('span', 'card-unit', item.unit));
    reading.append(value);
    if (result?.data?.length) reading.append(chart(result.data, true));
    const bottom = element('div', 'card-bottom');
    bottom.append(element('span', '', `SGS ${item.code} · ${item.publisher}`), element('span', '', last ? `Ref.: ${dateLabel(last.period)}` : result?.error ? 'Fonte indisponível' : result ? 'Sem observações' : 'Consultando…'));
    card.append(top, element('div', 'card-name', item.name), reading, element('p', 'card-description', item.description));
    if (result?.error) card.append(element('p', 'card-error', 'Falha ao consultar. Abra a série para tentar novamente.'));
    card.append(bottom);
    card.addEventListener('click', () => selectIndicator(item.id, true));
    (item.featured ? featuredGrid : groups.get(item.topic)).append(card);
  }
  $('#featured-indicators').hidden = !visible.some(item => item.featured);
  $('#other-indicators').hidden = !visible.some(item => !item.featured);
  $('#total-indicators').textContent = String(state.catalog.length).padStart(2, '0');
  $('#catalog-count').textContent = `${visible.length} de ${state.catalog.length} indicadores`;
  if (state.catalog.length) {
    $('#catalog-status').hidden = visible.length > 0;
    $('#catalog-status').textContent = visible.length ? '' : 'Nenhum indicador encontrado. Tente outro termo ou tema.';
  }
}

function renderMetadata() {
  const item = state.selected;
  $('#detail-title').textContent = item.name;
  $('#detail-description').textContent = item.description;
  $('#methodology').textContent = item.methodology;
  $('#official-link').href = item.source.metadataUrl;
  $('#explanation').replaceChildren(...[
    ['O que mede', item.explanation.measures], ['Para que serve', item.explanation.usefulness],
    ['Como interpretar', item.explanation.reading], ['Não confunda', item.explanation.caution],
  ].map(([title, text]) => {
    const block = element('article', 'explanation-block');
    block.append(element('h3', '', title), element('p', '', text));
    return block;
  }));
  $('#period-guidance').textContent = item.frequency === 'quarterly' ? 'PIB trimestral: um intervalo curto pode não ter divulgação. Use 1A ou 5A para acompanhar o histórico.'
    : item.id === 'br-desemprego' ? 'Cada referência mensal representa o trimestre móvel encerrado naquele mês, não apenas aquele mês isolado.'
    : item.id === 'br-poupanca' ? 'Observação diária não significa rendimento diário: a unidade desta série é mensal e depende do aniversário do depósito.'
    : `Frequência ${frequencyLabels[item.frequency].toLowerCase()} · unidade original ${item.unit}. A referência é o período medido, não a data de publicação.`;
  $('#investment-guide').hidden = !['br-selic-meta', 'br-cdi-diario', 'br-poupanca'].includes(item.id);
  $('#investment-links').replaceChildren(...['br-selic-meta', 'br-cdi-diario', 'br-poupanca'].map(id => {
    const related = state.catalog.find(indicator => indicator.id === id);
    const button = element('button', 'comparison-item');
    button.type = 'button';
    button.append(element('strong', '', related.name), element('span', '', `${related.unit} · divulgação ${frequencyLabels[related.frequency].toLowerCase()}`), element('span', '', 'Consultar a série ↗'));
    button.addEventListener('click', () => selectIndicator(id, true));
    return button;
  }));
  $('#metadata').replaceChildren();
  for (const [label, value] of [
    ['Produzido por', item.publisher], ['Distribuído por', 'SGS / BCB'], ['Série oficial', `SGS ${item.code}`],
    ['Frequência', frequencyLabels[item.frequency]], ['Unidade original', item.unit], ['Identificador', item.id],
  ]) {
    const row = element('div', 'metadata-row');
    row.append(element('dt', '', label), element('dd', '', value));
    $('#metadata').append(row);
  }
}

function setView() {
  for (const view of ['chart', 'table', 'api']) $(`#${view}-view`).hidden = view !== state.view || !state.result?.data.length;
  for (const button of $$('[data-view]')) {
    const active = button.dataset.view === state.view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function renderResult() {
  const result = state.result;
  const rows = result.data;
  const last = rows.at(-1);
  $('#detail-value').replaceChildren(document.createTextNode(last ? number(last.value) : '—'), element('small', '', state.selected.unit));
  $('#detail-period').textContent = last ? `Referência: ${dateLabel(last.period)}` : '';
  $('#detail-status').textContent = rows.length ? '' : 'A fonte não tem observações neste intervalo. Experimente um período maior.';
  $('#detail-status').hidden = rows.length > 0;
  $('#chart-view').replaceChildren(...(rows.length ? [chart(rows)] : []));
  $('#table-body').replaceChildren(...[...rows].reverse().map(row => {
    const tr = element('tr');
    tr.append(element('td', '', dateLabel(row.period)), element('td', '', number(row.value)), element('td', '', state.selected.unit));
    return tr;
  }));
  const url = new URL(state.resultUrl, window.location.origin).href;
  $('#query-code').textContent = `GET ${url}`;
  $('#json-link').href = url;
  $('#json-link').hidden = false;
  $('#copy-query').disabled = false;
  $('#export-csv').disabled = !rows.length;
  $('#export-json').disabled = !rows.length;
  const retrieved = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(result.meta.retrievedAt));
  $('#coverage').textContent = `${observationCount(rows.length)} · consultado em ${retrieved}${result.meta.truncated ? ' · resultado limitado' : ''}`;
  $('#derived-reading').hidden = state.selected.id !== 'br-reservas-internacionais' || rows.length < 2;
  if (!$('#derived-reading').hidden) {
    const previous = rows.at(-2);
    const difference = last.value - previous.value;
    $('#derived-text').textContent = `Entre ${dateLabel(previous.period)} e ${dateLabel(last.period)}, o estoque passou de ${number(previous.value)} para ${number(last.value)} US$ milhões. Diferença calculada: ${difference > 0 ? '+' : ''}${number(difference)} US$ milhões (valor final menos anterior). Isso não permite atribuir a mudança apenas a compras ou vendas de moeda.`;
  }
  setView();
}

async function loadDetail() {
  state.request?.abort();
  const controller = new AbortController();
  state.request = controller;
  state.result = null;
  $('#derived-reading').hidden = true;
  $('#detail-status').textContent = 'Consultando a série oficial…';
  $('#detail-status').hidden = false;
  $('#detail-status').classList.remove('error');
  $('#detail-retry').hidden = true;
  $('#detail-value').textContent = '—';
  $('#detail-period').textContent = '';
  $('#coverage').textContent = '';
  for (const id of ['export-csv', 'export-json', 'copy-query']) $(`#${id}`).disabled = true;
  $('#json-link').hidden = true;
  setView();
  const url = queryUrl(state.selected.id, state.range);
  try {
    const result = await getJson(url, controller.signal);
    if (controller.signal.aborted) return;
    state.result = result;
    state.resultUrl = url;
    if (result.data.length && state.cards.get(state.selected.id)?.error) {
      state.cards.set(state.selected.id, result);
      renderCards();
    }
    renderResult();
  } catch (error) {
    if (controller.signal.aborted) return;
    console.error('Indicator query failed:', error);
    $('#detail-status').textContent = error.message;
    $('#detail-status').classList.add('error');
    $('#detail-retry').hidden = false;
  }
}

function selectIndicator(id, scroll = false, updateHistory = true) {
  const item = state.catalog.find(item => item.id === id);
  if (!item) { toast('Indicador não encontrado no catálogo.'); return; }
  state.selected = item;
  $('#serie').hidden = false;
  if (updateHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set('indicador', id);
    window.history.pushState({}, '', url);
  }
  renderCards();
  renderMetadata();
  loadDetail();
  if (scroll) {
    $('#serie').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    $('#detail-title').setAttribute('tabindex', '-1');
    $('#detail-title').focus({ preventScroll: true });
  }
}

async function loadCatalog() {
  $('#catalog-status').hidden = false;
  $('#catalog-status').textContent = 'Consultando o catálogo…';
  $('#catalog-status').classList.remove('error');
  $('#catalog-retry').hidden = true;
  try {
    const { data } = await getJson('/api/v1/indicators');
    state.catalog = data;
    $('#topic-filters').replaceChildren();
    for (const topic of ['', ...new Set(data.map(item => item.topic))]) {
      const button = element('button', `filter${state.topic === topic ? ' active' : ''}`, topic ? topicLabels[topic] || topic : 'Todos ');
      button.dataset.topic = topic;
      button.setAttribute('aria-pressed', String(state.topic === topic));
      if (!topic) {
        const count = element('span', '', String(data.length));
        count.id = 'total-indicators';
        button.append(count);
      }
      $('#topic-filters').append(button);
    }
    renderCards();
    const requested = new URLSearchParams(window.location.search).get('indicador');
    selectIndicator(data.some(item => item.id === requested) ? requested : 'br-ipca-12m', false, false);
    if (requested && !data.some(item => item.id === requested)) toast('O indicador do link não existe. Mostrando IPCA em 12 meses.');
    const queue = [...data];
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const item = queue.shift();
        try { state.cards.set(item.id, await getJson(`/api/v1/indicators/${item.id}/observations?limit=24`)); }
        catch (error) { console.error(`Card ${item.id}:`, error); state.cards.set(item.id, { error: error.message }); }
        renderCards();
      }
    }));
  } catch (error) {
    console.error('Catalog failed:', error);
    $('#catalog-status').textContent = `Não foi possível carregar o catálogo: ${error.message}`;
    $('#catalog-status').classList.add('error');
    $('#catalog-retry').hidden = false;
  }
}

$('#search').addEventListener('input', renderCards);
$('#topic-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-topic]');
  if (!button) return;
  state.topic = button.dataset.topic;
  for (const filter of $$('[data-topic]')) {
    const active = filter === button;
    filter.classList.toggle('active', active);
    filter.setAttribute('aria-pressed', String(active));
  }
  renderCards();
});
for (const button of $$('[data-range]')) button.addEventListener('click', () => {
  state.range = Number(button.dataset.range);
  for (const range of $$('[data-range]')) {
    range.classList.toggle('active', range === button);
    range.setAttribute('aria-pressed', String(range === button));
  }
  loadDetail();
});
for (const button of $$('[data-view]')) button.addEventListener('click', () => { state.view = button.dataset.view; setView(); });
$('#copy-query').addEventListener('click', () => copy(new URL(state.resultUrl, window.location.origin).href));
$('#detail-retry').addEventListener('click', loadDetail);
$('#catalog-retry').addEventListener('click', loadCatalog);
$('#export-csv').addEventListener('click', () => {
  const url = state.resultUrl.replace('/observations?', '/observations.csv?');
  const filename = `${state.selected.id}.csv`;
  // Fetch first so an upstream error never downloads as a success-shaped CSV.
  fetch(url).then(async response => {
    if (!response.ok) { const body = await response.json(); throw new Error(body.error?.message || 'Falha na exportação.'); }
    download(await response.blob(), filename);
  }).catch(error => { console.error('CSV export failed:', error); toast(error.message); });
});
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = element('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#export-json').addEventListener('click', () => download(new Blob([JSON.stringify(state.result, null, 2)], { type: 'application/json' }), `${state.selected.id}.json`));
window.addEventListener('popstate', () => {
  const id = new URLSearchParams(window.location.search).get('indicador') || 'br-ipca-12m';
  selectIndicator(id, false, false);
});
loadCatalog();
