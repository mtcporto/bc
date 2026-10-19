# Cache persistente e sincronização Turso

## Configuração concluída externamente

A base `bc-aberto`, o token e as variáveis `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` já foram configurados pelo responsável pelo projeto na Vercel. O código não contém segredos.

## Configuração adicional necessária

Criar `CRON_SECRET` nas variáveis de ambiente de produção da Vercel (valor aleatório forte). A Vercel envia esse valor em `Authorization: Bearer <CRON_SECRET>` ao executar os cron jobs. Não publicar esse valor no frontend ou no GitHub.

## Funcionamento

- A tabela `indicator_cache` é criada automaticamente na primeira consulta.
- Respostas válidas do BCB são gravadas por indicador e janela de datas.
- Respostas recentes (TTL de 5 minutos) são servidas do cache; em falhas do BCB, respostas antigas são usadas e sinalizadas por `meta.cache.stale=true`.
- Se a janela mudar (por exemplo, no dia seguinte), o sistema pode recuperar o último snapshot do mesmo indicador, filtrando as observações pelo intervalo solicitado. **Isso não garante cobertura integral de qualquer intervalo**; a origem da resposta e a data de atualização continuam explícitas.
- Se o Turso falhar, a API ainda pode consultar o BCB; falhas de leitura/gravação são registradas.
- A interface informa quando os dados estão desatualizados.

## Sincronização

`api/sync.js` atualiza os 18 indicadores em 6 grupos de 3, usando chamadas autenticadas da Vercel Cron. O `vercel.json` agenda os grupos diariamente às 09:00–09:50 UTC, com intervalo de dez minutos. Cada execução tem o limite de duração definido em `vercel.json` (30 segundos). O endpoint não retorna dados confidenciais.

**Verificar a cota de cron jobs do plano Vercel antes do deploy**: alguns planos podem limitar a quantidade de cron jobs por projeto. Se o plano não aceitar seis agendamentos, a configuração deverá ser adaptada (por exemplo, usando um único agendador externo autenticado que acione os seis shards). Não assumir que o agendamento está ativo antes de confirmar na Vercel.

## Validação pré-merge

1. Executar `npm test` e `npm run build` em um checkout da branch.
2. Verificar o limite de cron jobs e o deploy de Preview.
3. Configurar `CRON_SECRET` na Vercel Production.
4. Fazer merge e confirmar que o GitHub acionou o deployment automático; **não executar `vercel --prod` após o push**.
5. Confirmar que `/api/v1/indicators/br-juros-credito-pf/observations?limit=24` retorna dados ou fallback com metadados.
6. Conferir logs e execuções do Cron no painel Vercel. A primeira execução precisa consultar o BCB com sucesso para popular o cache.
