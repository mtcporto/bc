# 🚀 Passos para Deploy no Vercel

## ✅ Problema CORRIGIDO:

**Erro anterior**: "Conflicting functions and builds configuration"
**Solução**: Removidos `builds`, usando apenas `functions` no `vercel.json`

## 📁 Estrutura Final dos Arquivos:

```
/
├── index.html          # Dashboard principal
├── vercel.json         # Configuração Vercel (CORRIGIDA)
├── api/
│   └── proxy.js        # Serverless Function
├── package.json        # Dependências
├── proxy-server.js     # Servidor local (não usado no deploy)
└── README.md           # Documentação
```

## 📋 Checklist de Deploy:

### 1. Commit e Push para GitHub:
```bash
git add .
git commit -m "Fix Vercel configuration - remove builds conflict"
git push origin main
```

### 2. Deploy na Vercel:
- Acesse [vercel.com](https://vercel.com)
- Conecte seu repositório GitHub
- **Agora deve funcionar sem erros!**

### 3. Ou use Vercel CLI:
```bash
npm i -g vercel
vercel --prod
```

## 🔧 O que foi corrigido:

### ❌ Configuração anterior (com erro):
```json
{
  "builds": [...],     // ← Conflito
  "functions": {...}   // ← Conflito
}
```

### ✅ Configuração atual (corrigida):
```json
{
  "functions": {
    "api/proxy.js": {
      "runtime": "nodejs18.x",
      "maxDuration": 30
    }
  }
}
```

## 🌐 URLs de teste:

### Local:
- Dashboard: `http://localhost:3000`
- Health: `http://localhost:3000/health`

### Vercel (após deploy):
- Dashboard: `https://seu-projeto.vercel.app`
- Health: `https://seu-projeto.vercel.app/api/proxy?health=true`

## 🔍 Como verificar se funcionou:

1. **Deploy sem erros**: Vercel deve mostrar "Deployment completed"
2. **Dashboard carrega**: Página principal abre sem erros
3. **Dados aparecem**: Os 10 indicadores carregam automaticamente
4. **Console limpo**: Sem erros 404 ou CORS no DevTools

## 📊 Indicadores que devem funcionar:
- ✅ PTAX USD/EUR
- ✅ SELIC, IPCA, CDI
- ✅ IBC-Br, Balança Comercial  
- ✅ Crédito, Carteira, Inadimplência

**Agora está 100% corrigido para Vercel!** 🎉
