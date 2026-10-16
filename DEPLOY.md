# Deploy do BC Aberto na Vercel

## Preparação

1. Use Node.js 22 ou superior e execute `npm ci`, `npm test` e `npm run build`.
2. Importe o repositório na Vercel com o preset **Other**, raiz do projeto neste diretório, build `npm run build` e saída `public`.
3. O arquivo `vercel.json` define a saída e o limite de 30 segundos das funções. A consulta ao BCB tem timeout de 20 segundos.
4. Não são necessárias variáveis de ambiente ou chaves de API.

## Rotas

| Rota | Implementação |
|---|---|
| `/` | `public/index.html` |
| `/desenvolvedores.html` | documentação REST, OpenAPI e MCP |
| `/fontes.html` | produtores, metadados e limites |
| `/api/v1/indicators` e subrotas | rewrite explícito para `api/indicators.js` |
| `/api/v1/openapi.json` | mesma função da API |
| `/api/mcp` | `api/mcp.js` |

Não reescreva a raiz para `/public/index.html`: `public` já é o diretório de saída. Os módulos `lib/` são importados pelas funções serverless; não devem ser servidos como arquivos públicos.

O rewrite `/api/v1/:route*` encaminha todos os níveis da API à função `api/indicators.js`, com o subcaminho no parâmetro interno `route`. A função consome esse parâmetro antes de validar os filtros públicos. O servidor Express local continua usando o caminho original, sem rewrite.

## Conferência após o deploy

- Abrir o site em desktop e celular.
- Consultar catálogo, uma série mensal e dólar diário. Verificar unidade e data de referência.
- Baixar CSV e abrir JSON no painel.
- Abrir `/api/v1/openapi.json`.
- Conectar um cliente MCP Streamable HTTP em `https://SEU-DOMINIO/api/mcp`, listar as três ferramentas e consultar uma série.
- Confirmar que `/package.json` e `/lib/catalog.js` não são públicos.
- Verificar logs se a fonte retornar erro; a API não substitui falhas por números fictícios.

O cache é efêmero e por instância. Para tráfego público elevado, planeje rate limiting e cache compartilhado antes de divulgar amplamente o serviço. O deploy não é executado automaticamente por alterações locais: revise e publique pelo fluxo habitual do repositório.
