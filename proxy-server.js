import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://127.0.0.1:3000', 
        'http://localhost',
        'http://127.0.0.1',
        'http://localhost:80',
        'http://127.0.0.1:80',
        'file://'
    ],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Whitelist de URLs permitidas para segurança
const allowedHosts = [
    'olinda.bcb.gov.br',
    'api.bcb.gov.br'
];

function isUrlAllowed(url) {
    try {
        const urlObj = new URL(url);
        return allowedHosts.includes(urlObj.hostname);
    } catch {
        return false;
    }
}

// Endpoint proxy com melhor segurança
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ 
            error: 'Parâmetro "url" obrigatório',
            success: false 
        });
    }

    if (!isUrlAllowed(targetUrl)) {
        return res.status(403).json({ 
            error: 'URL não permitida por motivos de segurança',
            success: false 
        });
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'BC-Playground/1.0',
                'Accept': 'application/json'
            }
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            res.json({ success: true, data });
        } else {
            const text = await response.text();
            res.json({ success: true, data: text });
        }

    } catch (err) {
        console.error('Proxy error:', err.message);
        
        if (err.name === 'AbortError') {
            res.status(408).json({ 
                error: 'Timeout na requisição',
                success: false 
            });
        } else {
            res.status(500).json({ 
                error: `Erro ao buscar dados: ${err.message}`,
                success: false 
            });
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir arquivos estáticos do diretório public
app.use(express.static(path.join(__dirname, 'public')));

// Rota para servir o index.html na raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy rodando em http://localhost:${PORT}`);
    console.log(`📊 Interface disponível em: http://localhost:${PORT}`);
});
