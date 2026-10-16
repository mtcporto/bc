async function loadSources() {
  const status = document.querySelector('#sources-status');
  const retry = document.querySelector('#sources-retry');
  retry.hidden = true;
  status.hidden = false;
  status.textContent = 'Carregando fontes…';
  status.classList.remove('error');
  try {
    const response = await fetch('/api/v1/indicators');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { data } = await response.json();
    const body = document.querySelector('#sources-body');
    body.replaceChildren();
    for (const indicator of data) {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      const link = document.createElement('a');
      link.href = `/?indicador=${indicator.id}#serie`;
      link.textContent = indicator.name;
      name.append(link);
      tr.append(name);
      for (const value of [indicator.publisher, `SGS ${indicator.code}`, indicator.unit, { daily: 'Diária', monthly: 'Mensal', quarterly: 'Trimestral' }[indicator.frequency]]) {
        const td = document.createElement('td');
        if (value === `SGS ${indicator.code}`) {
          const source = document.createElement('a');
          source.href = indicator.source.metadataUrl;
          source.target = '_blank';
          source.rel = 'noopener noreferrer';
          source.textContent = `${value} ↗`;
          td.append(source);
        } else td.textContent = value;
        tr.append(td);
      }
      body.append(tr);
    }
    status.textContent = `${data.length} séries no catálogo revisado.`;
  } catch (error) {
    console.error('Sources failed:', error);
    status.textContent = 'Não foi possível carregar a relação de fontes. Tente novamente ou consulte o catálogo da API.';
    status.classList.add('error');
    retry.hidden = false;
  }
}
document.querySelector('#sources-retry').addEventListener('click', loadSources);
loadSources();
