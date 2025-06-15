# 🏛️ Banco Central Playground

Uma interface moderna e elegante para visualizar dados econômicos do Banco Central do Brasil.

## 📁 Estrutura do Projeto

```
/
├── public/
│   └── index.html          # Frontend da aplicação
├── api/
│   └── proxy.js           # Serverless function (Vercel)
├── proxy-server.js        # Servidor local de desenvolvimento
├── package.json
├── vercel.json            # Configuração Vercel
└── .vercelignore          # Arquivos ignorados no deploy
```

## 🌟 Funcionalidades

### 📊 Dados Econômicos
- **Carregamento Automático**: Todos os dados são carregados automaticamente ao abrir a página
- **Câmbio**: PTAX USD e EUR com cotações de compra e venda
- **Juros**: Taxa SELIC atualizada
- **Inflação**: IPCA mensal
- **CDI**: Certificado de Depósito Interbancário com gráfico histórico
- **IBC-Br**: Índice de Atividade Econômica (proxy do PIB mensal)
- **Balança Comercial**: Saldo da balança comercial em US$ milhões
- **Crédito**: Taxas de juros, carteira total e taxa de inadimplência

### 🎨 Interface
- **Design Moderno**: Interface clean e responsiva
- **Carregamento Inteligente**: Barra de progresso e loading states
- **Tema Duplo**: Modo escuro (padrão) e claro
- **Ícones FontAwesome**: Visual profissional
- **Animações Suaves**: Transições e efeitos visuais
- **Responsivo**: Funciona em desktop, tablet e mobile
- **Sem Botões**: Interface limpa, dados carregam automaticamente

### 🔒 Segurança e Performance
- **Proxy Seguro**: Whitelist de URLs permitidas
- **Timeout**: Proteção contra requisições lentas
- **Cache Local**: Armazenamento de preferências
- **Tratamento de Erros**: Feedback claro ao usuário
- **Loading Sequencial**: Requisições escalonadas para evitar sobrecarga

## 🚀 Como Usar

### 1. Instalação
```bash
cd /var/www/html/bc
npm install
```

### 2. Executar o Servidor
```bash
npm start
# ou
npm run dev
```

### 3. Acessar a Interface
Abra o navegador em: `http://localhost:3000`

**Os dados são carregados automaticamente!** Não é necessário clicar em nenhum botão. Para atualizar os dados, simplesmente recarregue a página (F5).

## 📋 APIs Utilizadas

Todas as APIs são do Banco Central do Brasil:

- **PTAX USD**: `olinda.bcb.gov.br` - Cotação do Dólar
- **PTAX EUR**: `api.bcb.gov.br/dados/serie/bcdata.sgs.21620` - Cotação do Euro
- **SELIC**: `api.bcb.gov.br/dados/serie/bcdata.sgs.11` - Taxa básica de juros
- **IPCA**: `api.bcb.gov.br/dados/serie/bcdata.sgs.433` - Inflação
- **CDI**: `api.bcb.gov.br/dados/serie/bcdata.sgs.12` - Certificado de Depósito
- **IBC-Br**: `api.bcb.gov.br/dados/serie/bcdata.sgs.24363` - Atividade Econômica
- **Balança Comercial**: `api.bcb.gov.br/dados/serie/bcdata.sgs.22707` - Saldo comercial
- **Crédito**: `api.bcb.gov.br/dados/serie/bcdata.sgs.7456` - Taxa de juros
- **Carteira**: `api.bcb.gov.br/dados/serie/bcdata.sgs.20727` - Volume de crédito
- **Inadimplência**: `api.bcb.gov.br/dados/serie/bcdata.sgs.21082` - Taxa de inadimplência

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Node.js, Express
- **Gráficos**: Highcharts
- **Ícones**: FontAwesome 6
- **Proxy**: CORS habilitado para contornar limitações de API

## 📱 Características Responsivas

- **Desktop**: Layout em grid com múltiplas colunas
- **Tablet**: Adaptação automática do grid
- **Mobile**: Layout em coluna única otimizada

## 🎨 Sistema de Temas

### Tema Escuro (Padrão)
- Fundo: `#0d1117` (GitHub dark)
- Cards: `#21262d`
- Texto: `#e6edf3`
- Accent: `#238636` (verde)

### Tema Claro
- Fundo: `#ffffff`
- Cards: `#ffffff`
- Texto: `#24292f`
- Accent: `#1f883d` (verde escuro)

## 🔧 Configuração do Proxy

O servidor proxy é configurado com:
- Whitelist de domínios permitidos
- Timeout de 10 segundos
- Headers de segurança
- Tratamento de erros robusto

## 📈 Melhorias Implementadas

### UI/UX
- ✅ Design moderno com cards e shadows
- ✅ Sistema de temas (escuro/claro)
- ✅ Ícones FontAwesome
- ✅ Animações e transições suaves
- ✅ Layout responsivo
- ✅ Tooltips informativos
- ✅ Carregamento automático dos dados
- ✅ Barra de progresso visual
- ✅ Interface sem botões desnecessários

### Segurança
- ✅ Whitelist de URLs no proxy
- ✅ Timeout de requisições
- ✅ Validação de dados
- ✅ Headers de segurança
- ✅ Tratamento de erros

### Performance
- ✅ Cache de preferências do usuário
- ✅ Carregamento automático e inteligente
- ✅ Requisições sequenciais para evitar sobrecarga
- ✅ Barra de progresso para feedback visual
- ✅ Gráficos com tema dinâmico
- ✅ Estados de carregamento otimizados
- ✅ Formatação otimizada de dados

### Apresentação de Dados
- ✅ Formatação monetária brasileira
- ✅ Formatação de porcentagens
- ✅ Formatação de datas
- ✅ Cards organizados por categorias
- ✅ Métricas visuais
- ✅ Gráficos interativos

## 🚀 Deploy na Vercel

Este projeto está configurado para deploy automático na Vercel com suporte a serverless functions.

### Estrutura para Deploy
- **Frontend**: Arquivos estáticos em `public/`
- **API**: Serverless functions em `api/`
- **Configuração**: `vercel.json` otimizado

### Como Fazer Deploy

1. **Fork ou Clone** este repositório
2. **Conecte na Vercel**: 
   - Vá em [vercel.com](https://vercel.com)
   - Importe o repositório
   - Deploy automático configurado!

3. **Configuração Automática**:
   - ✅ Serverless functions ativadas
   - ✅ CORS configurado
   - ✅ Arquivos estáticos otimizados
   - ✅ Output directory: `public/`

### URLs de Produção
- **Frontend**: `https://your-project.vercel.app/`
- **API Proxy**: `https://your-project.vercel.app/api/proxy?url=...`

### Desenvolvimento Local vs Produção
O projeto detecta automaticamente o ambiente:
- **Local**: Usa `http://localhost:3000/proxy`
- **Vercel**: Usa `/api/proxy` (serverless)

## 📝 Licença

ISC License

## 🤝 Contribuição

Este é um projeto educacional para demonstrar integração com APIs do Banco Central.
