# 🚀 Passos para Deploy no Vercel

## ✅ Arquivos já configurados:

1. **`vercel.json`** - Configuração para Vercel
2. **`api/proxy.js`** - Serverless Function 
3. **`index.html`** - Atualizado para detectar ambiente
4. **`package.json`** - Atualizado com scripts

## 📋 Checklist de Deploy:

### 1. Commit e Push para GitHub:
```bash
git add .
git commit -m "Configure for Vercel deployment"
git push origin main
```

### 2. Deploy na Vercel:
- Acesse [vercel.com](https://vercel.com)
- Conecte seu repositório GitHub
- A Vercel detectará automaticamente os arquivos
- Deploy será feito automaticamente

### 3. Ou use Vercel CLI:
```bash
npm i -g vercel
vercel --prod
```

## 🔧 O que foi corrigido:

### Problema original:
- Vercel não suporta servidores Node.js persistentes
- `proxy-server.js` não funciona em ambiente serverless

### Solução implementada:
- **Desenvolvimento local**: Continua usando `proxy-server.js`
- **Produção (Vercel)**: Usa `api/proxy.js` como Serverless Function
- **Detecção automática**: JavaScript detecta o ambiente e usa a URL correta

### Funcionalidades:
- ✅ Auto-detecção de ambiente (local vs Vercel)
- ✅ Proxy CORS para APIs do BCB
- ✅ Timeout de 25s (limite Vercel: 30s)
- ✅ Whitelist de domínios do BCB
- ✅ Health check para ambos ambientes
- ✅ Logging melhorado para debug

## 🌐 URLs de teste:

### Local:
- Dashboard: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- Proxy: `http://localhost:3000/proxy?url=...`

### Vercel:
- Dashboard: `https://seu-projeto.vercel.app`
- Health: `https://seu-projeto.vercel.app/api/proxy?health=true`
- Proxy: `https://seu-projeto.vercel.app/api/proxy?url=...`

## 🐛 Debugging:

Se algo não funcionar na Vercel:

1. **Abra DevTools** (F12)
2. **Vá para Console** 
3. **Procure por logs**:
   - `🔗 Proxy URL configurada: ...`
   - `🔗 Fazendo requisição via proxy: ...`
   - `📊 Resposta para ...`
   - `❌ Erro na requisição para ...`

4. **Verifique Network tab** para ver requisições HTTP

## 📊 APIs testadas:
- IBC-Br: `api.bcb.gov.br/dados/serie/bcdata.sgs.24363`
- Balança Comercial: `api.bcb.gov.br/dados/serie/bcdata.sgs.22707`
- Taxa de Inadimplência: `api.bcb.gov.br/dados/serie/bcdata.sgs.21082`
- PTAX, SELIC, IPCA, CDI, Crédito, Carteira

Todos os indicadores devem funcionar tanto local quanto na Vercel!
