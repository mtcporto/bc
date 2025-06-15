// Vercel Serverless Function para proxy das APIs do BCB
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Health check
  if (req.query.health === 'true') {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    return;
  }

  try {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL parameter is required' 
      });
    }

    // Whitelist de URLs permitidas (somente BCB)
    const allowedDomains = [
      'api.bcb.gov.br',
      'olinda.bcb.gov.br',
      'www3.bcb.gov.br'
    ];

    const urlObj = new URL(targetUrl);
    const isAllowed = allowedDomains.some(domain => urlObj.hostname === domain);
    
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: 'Domain not allowed'
      });
    }

    console.log(`Proxying request to: ${targetUrl}`);

    // Fazer a requisição para a API do BCB
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'BCB-Dashboard/1.0',
        'Accept': 'application/json',
      },
      // Timeout de 25 segundos (Vercel tem limit de 30s)
      signal: AbortSignal.timeout(25000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    res.status(200).json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Proxy error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
