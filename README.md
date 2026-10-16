# BC Aberto

Evolução do Banco Central Playground: um explorador de indicadores brasileiros para pessoas, aplicações e assistentes de IA. Projeto independente, sem vínculo com BCB, IBGE ou outros produtores.

## Executar

Requer Node.js 22 ou superior.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:3000. A porta pode ser alterada pela variável `PORT`. O servidor local escuta apenas no loopback. O painel anterior foi descontinuado e não é referência funcional, visual ou metodológica para esta versão. As fontes oficiais orientam a seleção e a interpretação das séries.

Pasta local: `C:\xampp\htdocs\bc` (não `teste2\bc`). O destino de implantação continua sendo a Vercel; Cloudflare e Turso não são necessários nesta versão e não foram provisionados.

## Primeira versão

- Interface responsiva com temas claro/escuro, busca por termos ou código SGS e filtros por tema.
- Detalhe do indicador com gráfico SVG, tabela acessível, períodos de 1M, 6M, 1A e 5A e link compartilhável por `?indicador=br-ipca-12m`.
- Exportação JSON e CSV com unidade, produtor, código SGS, URL consultada e horário de coleta.
- API REST versionada, especificação OpenAPI 3.1 e servidor MCP Streamable HTTP real, implementado com o SDK oficial.
- Sem chatbot, estimativas, projeções ou recomendação financeira.
- Inicial focada em indicadores, com navegação por assunto e explicações de o que mede, para que serve, como interpretar e cuidados. API e MCP também retornam esse conteúdo em `explanation`.
- Documentação e conexão MCP em `/desenvolvedores.html`; proveniência, séries e limitações em `/fontes.html`. Tema compartilhado nas três páginas.
- Hero com a imagem fornecida em `public/hero.png`: gráficos conceituais em verde e dourado, com texto sobreposto e fundo estendido até a borda direita no desktop; composição empilhada no celular. A imagem não representa dados reais.
- A página de Fontes usa `public/hero-fontes.png` com o mesmo tratamento responsivo do hero inicial. A arte é conceitual e não indica vínculo institucional.

Para séries mensais, os atalhos 1M, 6M e 1A incluem o início do mês de corte, preservando as observações mensais datadas no primeiro dia. O atalho 5A respeita o limite exato de cinco anos da API.

### Catálogo inicial

INCC, IGP-M e meta Selic aparecem em uma área de destaque, nessa ordem. A busca e os filtros atuam nos destaques e nos demais indicadores. `featured: true` no catálogo compartilhado identifica esses três destaques também na API e no MCP.

| Identificador | Série SGS | Unidade | Observação |
|---|---:|---|---|
| `br-incc-mensal` | 192 | % a.m. | FGV, variação mensal, não acumulado anual |
| `br-igpm-mensal` | 189 | % a.m. | FGV, variação mensal, não reajuste contratual calculado |
| `br-selic-meta` | 432 | % a.a. | Meta Copom, não taxa efetiva diária |
| `br-ipca-mensal` | 433 | % a.m. | Produzido pelo IBGE, distribuído pelo SGS |
| `br-ipca-12m` | 13522 | % em 12 meses | Acumulado publicado, não soma dos meses |
| `br-usd-ptax-venda` | 1 | R$/US$ | Referência de venda, não câmbio em tempo real |
| `br-cdi-diario` | 12 | % a.d. | Taxa diária original, sem anualização |
| `br-ibc-br` | 24363 | índice | Sem ajuste sazonal, não é o PIB |
| `br-eur-ptax-venda` | 21619 | R$/€ | Venda, não compra (21620) |
| `br-ipca15-mensal` | 7478 | % a.m. | Janela de coleta distinta do IPCA |
| `br-pib-trimestral` | 22099 | índice | Volume trimestral observado, sem ajuste sazonal |
| `br-balanca-comercial` | 22707 | US$ milhões | Saldo de bens no balanço de pagamentos |
| `br-reservas-internacionais` | 3546 | US$ milhões | Estoque mensal, não fluxo |
| `br-poupanca` | 195 | % a.m. | Observações diárias, taxa mensal por período |
| `br-juros-credito-pf` | 20716 | % a.a. | Média das novas operações para pessoas físicas |
| `br-credito-total` | 20539 | R$ milhões | Saldo de crédito nominal, não juros |
| `br-inadimplencia` | 21082 | % | Parcela do saldo com atraso superior a 90 dias |
| `br-desemprego` | 24369 | % | PNAD Contínua, trimestre móvel encerrado no mês |

Os metadados oficiais de cada série estão vinculados no catálogo. Para o IBC-Br, a base e as revisões devem ser consultadas na fonte: não se pressupõe uma base fixa neste projeto.

Os códigos, unidades e frequências são definidos a partir dos metadados oficiais de cada série. O crédito PF é o agregado total, não uma modalidade específica de consumo.

“Análise das Reservas” e “Comparativo” não são séries oficiais. O detalhe das reservas mostra uma leitura auxiliar identificada: diferença entre as duas últimas observações exibidas, na mesma unidade, sem inferir suficiência ou causa da variação. Selic, CDI e poupança têm um comparativo explicativo de papéis/unidades e atalhos para as séries; não há simulação de ganhos, ranking ou anualização automática.

## API

```text
GET /api/v1/indicators
GET /api/v1/indicators?q=inflação&topic=Inflacao
GET /api/v1/indicators/br-ipca-12m
GET /api/v1/indicators/br-ipca-12m/observations?limit=12
GET /api/v1/indicators/br-ipca-12m/observations?start=2025-01-01&end=2025-12-31&limit=2000
GET /api/v1/indicators/br-ipca-12m/observations.csv?limit=12
GET /api/v1/openapi.json
```

`start` e `end` são datas inclusivas `YYYY-MM-DD`. `end` tem padrão de hoje em UTC e não aceita datas futuras. O início padrão é um ano antes para séries diárias e cinco para mensais ou trimestrais. São permitidos até cinco anos por consulta e `limit` de 1 a 2.000 (padrão 60). O resultado contém as últimas N observações do intervalo, em ordem cronológica crescente; `meta.truncated` informa se houve corte. Parâmetros inválidos ou repetidos são rejeitados.

O formato é `{ data: [{ date, period, value, rawValue }], meta: { indicator, query, sourceUrl, retrievedAt, cache, total, returned, truncated, coverage, status, limitations } }`.

- `date`: data original convertida para ISO. Em séries mensais não é data de publicação.
- `period`: `YYYY-MM` para mensais; `YYYY-QN` para trimestrais; `YYYY-MM-DD` para diárias. `date` mantém a referência original em ISO.
- `value`: número, sem arredondamento ou conversão de unidade.
- `rawValue`: texto original do BCB.
- `retrievedAt`: horário da consulta à fonte, não horário de publicação.
- Ausência de dados: `data: []`, `status: "empty"`, cobertura nula. Nunca se inventa zero.
- O erro de negócio específico `SGSNegocioException: Value(s) not found` que o BCB retorna com HTTP 404 em intervalos vazios é tratado como ausência de observações. Outros erros 404 da fonte permanecem falhas.
- Erros: `{ error: { code, message } }` e HTTP 400, 404, 405, 502 ou 504.

As cotações usam a última observação **disponível dentro do intervalo**, sem depender de publicação em um dia específico. Datas posteriores ao fim solicitado são excluídas mesmo se a fonte as devolver.

## MCP

Endpoint: `/api/mcp`. Três ferramentas somente de leitura:

- `search_indicators`: descobrir séries por assunto, termo ou tema.
- `get_indicator`: consultar fonte, unidade, frequência e metodologia.
- `get_observations`: consultar observações pelo mesmo serviço utilizado pela API.

Exemplo de `.vscode/mcp.json`:

```json
{
  "servers": {
    "bc-aberto": {
      "type": "http",
      "url": "http://127.0.0.1:3000/api/mcp"
    }
  }
}
```

Em produção, substitua o endereço local pelo domínio publicado. Outros clientes usam formatos de configuração diferentes. Transporte Streamable HTTP sem sessões e com respostas JSON; não oferece SSE, notificações iniciadas pelo servidor ou retomada de sessão. O cliente deve aceitar `application/json` e `text/event-stream`, conforme o protocolo. GET/DELETE retornam 405 deliberadamente. Não é um chatbot nem exige chave de modelo de IA.

## Arquitetura

```text
BCB/SGS → lib/data.js (validação, normalização e cache)
               ├── lib/http.js → API → public/app.js
               └── lib/mcp.js  → MCP
lib/catalog.js → identificadores, unidades e metadados compartilhados
```

Frontend em HTML/CSS/JavaScript sem bibliotecas externas ou CDN. A visualização SVG não exige licença de biblioteca de gráficos. O servidor local serve **somente `public/`**, não a raiz do repositório.

## Limitações operacionais e de cobertura

- Dezoito séries curadas, não todo o SGS. Ainda não há adaptador direto para IBGE, Tesouro ou outros órgãos. O painel carrega cards com até três requisições simultâneas para reduzir a pressão sobre a fonte.
- Cache em memória de cinco minutos, até 100 intervalos por instância. Requisições simultâneas idênticas compartilham a consulta. Serverless pode perder esse cache em cold starts.
- Timeout de 20 segundos para a fonte. Falhas não são armazenadas como sucesso; não há fallback para números antigos, estimados ou fictícios.
- Dados sujeitos a revisões na origem; não há armazenamento persistente ou histórico de revisões.
- Não há autenticação, rate limiting distribuído ou SLA. Antes de uma exposição de maior volume, definir proteção contra abuso e cache compartilhado. CORS aberto para leitura não equivale a controle de acesso.
- CSV UTF-8 com vírgula como separador e ponto decimal. O importador de planilhas deve reconhecer essa convenção. Cada linha contém proveniência.
- Código sob a licença ISC declarada pelo projeto. Dados têm suas próprias condições: consulte o [portal oficial do BCB](https://dadosabertos.bcb.gov.br/) e os metadados vinculados em cada série; não se presume que a licença do código cubra os dados.

## Verificação

```sh
npm test
npm run build
```

Testes determinísticos usam fixtures, sem depender da disponibilidade do BCB: unidades, datas, limites, cache, ausência de dados, falhas, HTTP, CSV e MCP com o cliente oficial. `build` verifica a sintaxe JavaScript e a presença dos arquivos estáticos; não transforma o frontend. Consultas reais e verificação visual são complementares, não substituem os testes.

Consulte [DEPLOY.md](./DEPLOY.md) para publicar na Vercel. Este README e DEPLOY.md são a referência para a versão atual.
