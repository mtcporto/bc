const { copy } = window.BCUI;
let codeType = 'rest';
function renderExample() {
  const origin = window.location.origin;
  const mcp = codeType === 'mcp';
  document.querySelector('#dev-code').textContent = mcp ? JSON.stringify({
    servers: { 'bc-aberto': { type: 'http', url: `${origin}/api/mcp` } },
  }, null, 2) : `// JavaScript · sem chave de API\nconst response = await fetch(\n  "${origin}/api/v1/indicators/" +\n  "br-ipca-12m/observations?limit=12"\n);\nif (!response.ok) throw new Error("Falha na fonte");\nconst { data, meta } = await response.json();\nconsole.log(data, meta.indicator.unit);`;
  document.querySelector('#code-label').textContent = mcp ? 'VS CODE · CONFIGURAÇÃO MCP' : 'UMA CONSULTA. DADOS E PROVENIÊNCIA.';
  document.querySelector('#code-note').textContent = mcp ? 'Adicione em .vscode/mcp.json. Ferramentas: search_indicators, get_indicator e get_observations. Outros clientes podem exigir outro formato de configuração.' : 'Descubra os identificadores em /api/v1/indicators. As respostas incluem valores, unidades e explicações.';
  document.querySelector('#code-bottom').textContent = mcp ? 'Streamable HTTP · 3 ferramentas de leitura · sem sessões / SSE' : 'JSON · consultas reais, sem valores fictícios no exemplo';
  for (const button of document.querySelectorAll('[data-code]')) {
    const active = button.dataset.code === codeType;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}
for (const button of document.querySelectorAll('[data-code]')) button.addEventListener('click', () => { codeType = button.dataset.code; renderExample(); });
document.querySelector('#copy-example').addEventListener('click', () => copy(document.querySelector('#dev-code').textContent));
renderExample();
