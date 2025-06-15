# Deploy Instructions for Vercel

## 🚀 Como fazer deploy no Vercel

### 1. Arquivos importantes para o deploy:
- `vercel.json` - Configuração da Vercel
- `api/proxy.js` - Serverless Function para proxy das APIs
- `index.html` - Interface principal
- `package.json` - Dependências (opcional para static)

### 2. Estrutura no Vercel:
```
/
├── index.html (arquivo principal)
├── vercel.json (configuração)
├── api/
│   └── proxy.js (serverless function)
└── package.json
```

### 3. Como a detecção de ambiente funciona:

O JavaScript no `index.html` detecta automaticamente o ambiente:

- **Local (localhost)**: Usa `http://localhost:3000/proxy?url=`
- **Vercel/Produção**: Usa `/api/proxy?url=`

### 4. Configurações importantes:

**vercel.json:**
- Define que `index.html` é estático
- Define que `api/proxy.js` é uma serverless function
- Configura rotas para ambos

**api/proxy.js:**
- Serverless function que substitui o `proxy-server.js` em produção
- Tem whitelist de domínios do BCB
- Timeout de 25s (limite Vercel: 30s)
- CORS habilitado

### 5. Testando localmente:

```bash
# Desenvolvimento local (mantém servidor Express)
npm start

# Simular ambiente Vercel
vercel dev
```

### 6. Deploy para Vercel:

```bash
# Via CLI da Vercel
vercel --prod

# Ou conectar repositório GitHub na dashboard Vercel
```

### 7. URLs das APIs BCB suportadas:
- `api.bcb.gov.br` ✅
- `olinda.bcb.gov.br` ✅  
- `www3.bcb.gov.br` ✅

### 8. Troubleshooting:

**Problema**: Dados não carregam
**Solução**: Verificar Console do navegador para erros de CORS ou fetch

**Problema**: Timeout
**Solução**: APIs do BCB podem ser lentas, serverless function tem 30s limite

**Problema**: 403 Forbidden  
**Solução**: Verificar se URL está na whitelist de domínios
