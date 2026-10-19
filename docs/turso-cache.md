# Cache persistente do BC Aberto (Turso)

O cache Turso é **opcional**. Sem as duas variáveis abaixo, a API continua consultando o BCB normalmente e usa apenas cache em memória.

## Configuração

1. Criar uma base Turso dedicada ao BC Aberto (por exemplo, `bc-aberto`) e um token de acesso.
2. Configurar **somente no servidor** (Vercel Environment Variables, e no ambiente local quando necessário):
   - `TURSO_DATABASE_URL=libsql://<database>-<organization>.turso.io`
   - `TURSO_AUTH_TOKEN=<token>`
3. Publicar a alteração e realizar uma consulta. A tabela `indicator_cache` é criada automaticamente na primeira operação.
4. Confirmar nos logs que não há falhas `Turso cache read failed` ou `Turso cache write failed`.

Não inserir o token em arquivos versionados nem no frontend. O endpoint de pipeline usa HTTPS e parâmetros SQL.

## Semântica

- Cache por indicador e intervalo exato (início e fim), independentemente de `limit`.
- Cache fresco: 5 minutos, conforme TTL existente.
- Cache expirado: tenta consultar o BCB; se falhar, devolve último resultado válido com `meta.status='stale'` e `meta.cache.stale=true`.
- O cache vazio é legítimo quando o BCB informa que não há observações para o intervalo.
- Se o Turso estiver indisponível, o sistema ainda pode consultar o BCB diretamente.

## Limitações / próximos passos

- **A base ainda precisa ser provisionada e as variáveis configuradas.** Este PR não cria recursos na conta Turso.
- Como a chave inclui a data final, uma nova data gera nova chave. Para garantir fallback entre dias, será necessário armazenar as séries por observação ou usar uma chave de janela móvel.
- A sincronização programada e a interface de indicação de dados desatualizados são etapas seguintes.
- Confirmar execução de testes e build antes de incorporar o PR à main.
