        // Detectar automaticamente a URL do proxy
        const getProxyUrl = () => {
            const currentHost = window.location.hostname;
            const currentProtocol = window.location.protocol;
            
            // Se estamos no Vercel (vercel.app domain) ou em produção
            if (currentHost.includes('vercel.app') || 
                (currentHost !== 'localhost' && currentHost !== '127.0.0.1')) {
                // Usar Vercel Serverless Function
                return `${currentProtocol}//${currentHost}/api/proxy?url=`;
            }
            
            // Se estamos acessando via localhost na porta 3000, usar a mesma
            if (window.location.port === '3000') {
                return `${currentProtocol}//${currentHost}:3000/proxy?url=`;
            }
            
            // Caso contrário, assumir que o proxy está na porta 3000 (desenvolvimento)
            return `${currentProtocol}//${currentHost}:3000/proxy?url=`;
        };

        const proxyUrl = getProxyUrl();
        let currentTheme = 'dark';

        // Sistema de temas
        function toggleTheme() {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', currentTheme);
            
            const themeIcon = document.getElementById('theme-icon');
            const themeText = document.getElementById('theme-text');
            
            if (currentTheme === 'dark') {
                themeIcon.className = 'fas fa-moon';
                themeText.textContent = 'Tema Claro';
                if (window.Highcharts) {
                    Highcharts.setOptions(Highcharts.theme);
                }
            } else {
                themeIcon.className = 'fas fa-sun';
                themeText.textContent = 'Tema Escuro';
                if (window.Highcharts) {
                    Highcharts.setOptions({});
                }
            }
            
            localStorage.setItem('bc-theme', currentTheme);
            
            // Atualizar gráficos se existirem
            const chartContainer = document.getElementById('grafico_cdi');
            if (chartContainer && chartContainer.style.display !== 'none') {
                // Re-render chart with new theme
                setTimeout(() => fetchCDI(), 100);
            }
        }

        // Carregar tema salvo
        function loadSavedTheme() {
            const savedTheme = localStorage.getItem('bc-theme');
            if (savedTheme && savedTheme !== currentTheme) {
                toggleTheme();
            }
        }

        // Utilitários
        function getUltimoDiaUtil() {
            const hoje = new Date();
            const diaSemana = hoje.getDay();
            if (diaSemana === 0) { hoje.setDate(hoje.getDate() - 2); }
            else if (diaSemana === 6) { hoje.setDate(hoje.getDate() - 1); }
            const mm = String(hoje.getMonth() + 1).padStart(2, '0');
            const dd = String(hoje.getDate()).padStart(2, '0');
            const yyyy = hoje.getFullYear();
            return `${mm}-${dd}-${yyyy}`;
        }

        function formatCurrency(value, currency = 'BRL') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) return 'N/A';
            
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            }).format(numValue);
        }

        function formatPercentage(value, decimals = 2) {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) return 'N/A';
            
            return new Intl.NumberFormat('pt-BR', {
                style: 'percent',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(numValue / 100);
        }

        function formatDate(dateStr) {
            try {
                // Verificar se a data está no formato DD/MM/YYYY
                if (dateStr && dateStr.includes('/')) {
                    const [day, month, year] = dateStr.split('/');
                    if (day && month && year && day.length <= 2 && month.length <= 2 && year.length === 4) {
                        const date = new Date(year, month - 1, day);
                        if (!isNaN(date.getTime())) {
                            return date.toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            });
                        }
                    }
                }
                
                // Tentar parsing de outros formatos
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                }
                
                // Se não conseguir parsear, retornar a string original
                return dateStr || 'Data não disponível';
            } catch (error) {
                console.warn('Erro ao formatar data:', dateStr, error);
                return dateStr || 'Data não disponível';
            }
        }

        function showLoading(elementId) {
            const element = document.getElementById(elementId);
            
            element.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    Carregando dados...
                </div>
            `;
            element.className = 'data-display';
        }

        function showError(elementId, message) {
            const element = document.getElementById(elementId);
            
            element.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
                <div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted);">
                    <i class="fas fa-info-circle"></i>
                    Recarregue a página para tentar novamente
                </div>
            `;
            element.className = 'data-display error';
        }

        function showSuccess(elementId, content) {
            const element = document.getElementById(elementId);
            
            element.innerHTML = content;
            element.className = 'data-display success fade-in';
            
            // Adicionar timestamp de atualização
            const refreshIndicator = document.createElement('div');
            refreshIndicator.className = 'refresh-indicator';
            refreshIndicator.innerHTML = `<i class="fas fa-clock"></i> Atualizado em ${new Date().toLocaleTimeString('pt-BR')}`;
            element.parentNode.appendChild(refreshIndicator);
        }

        // Funções de API melhoradas
        async function checkProxyHealth() {
            try {
                // Para Vercel, verificar usando o endpoint de health
                if (proxyUrl.includes('/api/proxy')) {
                    const healthUrl = proxyUrl.replace('?url=', '?health=true');
                    const response = await fetch(healthUrl);
                    return response.ok;
                } else {
                    // Para desenvolvimento local
                    const healthUrl = proxyUrl.replace('/proxy?url=', '/health');
                    const response = await fetch(healthUrl);
                    return response.ok;
                }
            } catch {
                return false;
            }
        }

        async function fetchWithProxy(url, elementId) {
            try {
                showLoading(elementId);
                
                // Verificar se o proxy está funcionando
                const proxyHealthy = await checkProxyHealth();
                if (!proxyHealthy) {
                    throw new Error('Servidor proxy não está disponível.');
                }
                
                const proxyRequestUrl = proxyUrl + encodeURIComponent(url);
                console.log(`🔗 Fazendo requisição via proxy: ${proxyRequestUrl}`);
                
                const response = await fetch(proxyRequestUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    // Timeout de 25 segundos
                    signal: AbortSignal.timeout(25000)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log(`📊 Resposta para ${elementId}:`, result);
                
                if (!result.success) {
                    throw new Error(result.error || 'Erro desconhecido do servidor');
                }
                
                return result.data;
            } catch (error) {
                console.error(`❌ Erro na requisição para ${elementId}:`, error);
                let errorMessage = `Erro: ${error.message}`;
                if (error.name === 'AbortError') {
                    errorMessage = 'Timeout: API demorou para responder';
                }
                showError(elementId, errorMessage);
                throw error;
            }
        }

        async function fetchPTAX() {
            const dataFormatada = getUltimoDiaUtil();
            const apiUrl = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dataFormatada}'&$top=1&$format=json`;
            
            try {
                const data = await fetchWithProxy(apiUrl, 'ptax');
                
                if (data.value && data.value.length > 0) {
                    const cotacao = data.value[0];
                    
                    // Melhor tratamento da data - usar a data formatada que enviamos na requisição
                    const dataExibicao = dataFormatada.split('-').reverse().join('/'); // MM-DD-YYYY -> DD/MM/YYYY
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value">${formatCurrency(cotacao.cotacaoCompra, 'USD')}</div>
                                <div class="stat-label">Compra</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${formatCurrency(cotacao.cotacaoVenda, 'USD')}</div>
                                <div class="stat-label">Venda</div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${dataExibicao}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value">Cotação oficial do dólar</span>
                        </div>
                    `;
                    showSuccess('ptax', content);
                } else {
                    showError('ptax', 'Nenhum dado encontrado para a data especificada');
                }
            } catch (error) {
                console.error('Erro PTAX:', error);
            }
        }

        async function fetchPTAXEuro() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.21620/dados/ultimos/1?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'ptax_euro');
                
                if (data && data.length > 0) {
                    const cotacao = data[0];
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value">${formatCurrency(parseFloat(cotacao.valor), 'EUR')}</div>
                                <div class="stat-label">Cotação Euro</div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(cotacao.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value">Cotação oficial do euro</span>
                        </div>
                    `;
                    showSuccess('ptax_euro', content);
                } else {
                    showError('ptax_euro', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro PTAX Euro:', error);
            }
        }

        async function fetchSELIC() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'selic');
                
                if (data && data.length > 0) {
                    const selic = data[0];
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value">${formatPercentage(parseFloat(selic.valor))}</div>
                                <div class="stat-label">Taxa SELIC</div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(selic.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value">Taxa básica da economia</span>
                        </div>
                    `;
                    showSuccess('selic', content);
                } else {
                    showError('selic', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro SELIC:', error);
            }
        }

        async function fetchIPCA() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'ipca');
                
                if (data && data.length > 0) {
                    const ipca = data[0];
                    const valor = parseFloat(ipca.valor);
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value">${formatPercentage(valor)}</div>
                                <div class="stat-label">IPCA Mensal</div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(ipca.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value">Inflação oficial do país</span>
                        </div>
                    `;
                    showSuccess('ipca', content);
                } else {
                    showError('ipca', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro IPCA:', error);
            }
        }

        async function fetchCDI() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/20?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'cdi');
                
                if (data && data.length > 0) {
                    const ultimoCDI = data[data.length - 1];
                    const valor = parseFloat(ultimoCDI.valor);
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value">${formatPercentage(valor)}</div>
                                <div class="stat-label">CDI Atual</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${data.length}</div>
                                <div class="stat-label">Registros</div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Última Data:</span>
                            <span class="metric-value">${formatDate(ultimoCDI.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value">Referência para investimentos</span>
                        </div>
                    `;
                    
                    showSuccess('cdi', content);

                    // Preparar dados para o gráfico
                    const categorias = data.map(item => {
                        const [day, month, year] = item.data.split('/');
                        return `${day}/${month}`;
                    });
                    const valores = data.map(item => parseFloat(item.valor));

                    // Mostrar container do gráfico
                    const chartContainer = document.getElementById('grafico_cdi');
                    chartContainer.style.display = 'block';

                    // Configurar tema do gráfico
                    const isDark = currentTheme === 'dark';
                    
                    Highcharts.chart('grafico_cdi', {
                        accessibility: {
                            enabled: false
                        },
                        chart: {
                            type: 'line',
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                        },
                        title: {
                            text: 'CDI - Últimos 20 Registros',
                            style: {
                                color: isDark ? '#e6edf3' : '#24292f'
                            }
                        },
                        xAxis: {
                            categories: categorias,
                            labels: {
                                style: {
                                    color: isDark ? '#8b949e' : '#656d76'
                                }
                            }
                        },
                        yAxis: {
                            title: {
                                text: '% ao ano',
                                style: {
                                    color: isDark ? '#e6edf3' : '#24292f'
                                }
                            },
                            labels: {
                                style: {
                                    color: isDark ? '#8b949e' : '#656d76'
                                }
                            }
                        },
                        series: [{
                            name: 'CDI',
                            data: valores,
                            color: '#58a6ff',
                            lineWidth: 3,
                            marker: {
                                radius: 4
                            }
                        }],
                        legend: {
                            itemStyle: {
                                color: isDark ? '#e6edf3' : '#24292f'
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? '#21262d' : '#ffffff',
                            style: {
                                color: isDark ? '#e6edf3' : '#24292f'
                            },
                            formatter: function() {
                                return `<b>${this.series.name}</b><br/>Data: ${this.x}<br/>Taxa: ${this.y.toFixed(2)}% a.a.`;
                            }
                        }
                    });
                } else {
                    showError('cdi', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro CDI:', error);
            }
        }

        async function fetchCredito() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.7456/dados/ultimos/1?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'credito');
                
                if (data && data.length > 0) {
                    const credito = data[0];
                    const valor = parseFloat(credito.valor);
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value">${formatPercentage(valor)}</div>
                                <div class="stat-label">Taxa de Juros</div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(credito.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value">Custo do crédito ao consumo</span>
                        </div>
                    `;
                    showSuccess('credito', content);
                } else {
                    showError('credito', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro Crédito:', error);
            }
        }

        async function fetchCarteira() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.20727/dados/ultimos/1?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'carteira');
                
                if (data && data.length > 0) {
                    const carteira = data[0];
                    const valor = parseFloat(carteira.valor);
                    const valorFormatado = new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(valor * 1000000); // Converter de milhões para reais
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value">${valorFormatado}</div>
                                <div class="stat-label">Carteira Total</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${valor.toFixed(0)} bi</div>
                                <div class="stat-label">Em Bilhões</div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(carteira.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value">Volume total de crédito</span>
                        </div>
                    `;
                    showSuccess('carteira', content);
                } else {
                    showError('carteira', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro Carteira:', error);
            }
        }

        // Função para mostrar/ocultar barra de progresso
        function showProgressBar() {
            const progressContainer = document.getElementById('loading-progress');
            const progressBar = document.getElementById('loading-progress-bar');
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
        }

        function updateProgress(percentage) {
            const progressBar = document.getElementById('loading-progress-bar');
            progressBar.style.width = percentage + '%';
        }

        function hideProgressBar() {
            const progressContainer = document.getElementById('loading-progress');
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 500);
        }

        // Função para buscar dados do PIB
        async function fetchPIB() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4385/dados/ultimos/8?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'pib');
                
                if (data && data.length > 0) {
                    const latest = data[data.length - 1];
                    const valor = parseFloat(latest.valor);
                    
                    // Calcular variação trimestral e anual
                    let variacaoTrimestral = null;
                    let variacaoAnual = null;
                    
                    if (data.length > 1) {
                        const anterior = parseFloat(data[data.length - 2].valor);
                        variacaoTrimestral = ((valor - anterior) / anterior * 100).toFixed(2);
                    }
                    
                    if (data.length >= 4) {
                        const anoAnterior = parseFloat(data[data.length - 5].valor);
                        variacaoAnual = ((valor - anoAnterior) / anoAnterior * 100).toFixed(2);
                    }
                    
                    // Determinar status da economia
                    let statusEconomia = 'Estável';
                    let classeStatus = '';
                    if (variacaoTrimestral && parseFloat(variacaoTrimestral) > 0.5) {
                        statusEconomia = 'Crescimento';
                        classeStatus = 'positive';
                    } else if (variacaoTrimestral && parseFloat(variacaoTrimestral) < -0.5) {
                        statusEconomia = 'Retração';
                        classeStatus = 'negative';
                    }
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value">${valor.toFixed(2)}</div>
                                <div class="stat-label">Índice Base</div>
                            </div>
                            ${variacaoTrimestral !== null ? `
                            <div class="stat-card">
                                <div class="stat-value ${parseFloat(variacaoTrimestral) >= 0 ? 'positive' : 'negative'}">${parseFloat(variacaoTrimestral) >= 0 ? '+' : ''}${variacaoTrimestral}%</div>
                                <div class="stat-label">Variação Trimestral</div>
                            </div>
                            ` : ''}
                            ${variacaoAnual !== null ? `
                            <div class="stat-card">
                                <div class="stat-value ${parseFloat(variacaoAnual) >= 0 ? 'positive' : 'negative'}">${parseFloat(variacaoAnual) >= 0 ? '+' : ''}${variacaoAnual}%</div>
                                <div class="stat-label">Variação Anual</div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="metric">
                            <span class="metric-label">Status:</span>
                            <span class="metric-value ${classeStatus}">${statusEconomia}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Período:</span>
                            <span class="metric-value">${formatDate(latest.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value">Principal indicador da economia nacional</span>
                        </div>
                    `;
                    showSuccess('pib', content);

                    // Preparar dados para o gráfico (últimos 8 trimestres)
                    const categorias = data.map(item => {
                        // Converter formato de data para trimestre
                        const [day, month, year] = item.data.split('/');
                        const trimestre = Math.ceil(parseInt(month) / 3);
                        return `${trimestre}T${year}`;
                    });
                    
                    const valores = data.map(item => parseFloat(item.valor));
                    
                    // Calcular variações trimestrais para o gráfico
                    const variacoes = [];
                    for (let i = 1; i < valores.length; i++) {
                        const variacao = ((valores[i] - valores[i-1]) / valores[i-1] * 100);
                        variacoes.push(variacao);
                    }

                    // Mostrar container do gráfico
                    const chartContainer = document.getElementById('grafico_pib');
                    chartContainer.style.display = 'block';

                    // Configurar tema do gráfico
                    const isDark = currentTheme === 'dark';
                    
                    Highcharts.chart('grafico_pib', {
                        accessibility: {
                            enabled: false
                        },
                        chart: {
                            type: 'combination',
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                        },
                        title: {
                            text: 'PIB - Evolução e Variação Trimestral',
                            style: {
                                color: isDark ? '#e6edf3' : '#24292f'
                            }
                        },
                        xAxis: {
                            categories: categorias,
                            labels: {
                                style: {
                                    color: isDark ? '#8b949e' : '#656d76'
                                }
                            }
                        },
                        yAxis: [{
                            title: {
                                text: 'Índice PIB',
                                style: {
                                    color: isDark ? '#e6edf3' : '#24292f'
                                }
                            },
                            labels: {
                                style: {
                                    color: isDark ? '#8b949e' : '#656d76'
                                }
                            }
                        }, {
                            title: {
                                text: 'Variação Trimestral (%)',
                                style: {
                                    color: isDark ? '#e6edf3' : '#24292f'
                                }
                            },
                            labels: {
                                style: {
                                    color: isDark ? '#8b949e' : '#656d76'
                                }
                            },
                            opposite: true
                        }],
                        series: [{
                            name: 'PIB (Índice)',
                            type: 'line',
                            data: valores,
                            color: '#58a6ff',
                            lineWidth: 3,
                            marker: {
                                radius: 5
                            },
                            yAxis: 0
                        }, {
                            name: 'Variação Trimestral (%)',
                            type: 'column',
                            data: variacoes,
                            color: '#3fb950',
                            yAxis: 1,
                            zones: [{
                                value: 0,
                                color: '#f85149'
                            }, {
                                color: '#3fb950'
                            }]
                        }],
                        legend: {
                            itemStyle: {
                                color: isDark ? '#e6edf3' : '#24292f'
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? '#21262d' : '#ffffff',
                            style: {
                                color: isDark ? '#e6edf3' : '#24292f'
                            },
                            shared: true,
                            formatter: function() {
                                let tooltip = `<b>${this.x}</b>`;
                                this.points.forEach(point => {
                                    if (point.series.name.includes('Variação')) {
                                        tooltip += `<br/>${point.series.name}: ${point.y.toFixed(2)}%`;
                                    } else {
                                        tooltip += `<br/>${point.series.name}: ${point.y.toFixed(2)}`;
                                    }
                                });
                                return tooltip;
                            }
                        }
                    });
                } else {
                    showError('pib', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro PIB:', error);
            }
        }

        // Função para buscar dados do IBC-Br (Índice de Atividade Econômica)
        async function fetchIBCBr() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.24363/dados/ultimos/2?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'ibc_br');
                
                if (data && data.length > 0) {
                    const latest = data[data.length - 1];
                    const valor = parseFloat(latest.valor);
                    
                    // Calcular variação se temos dados suficientes
                    let variacao = null;
                    if (data.length > 1) {
                        const anterior = parseFloat(data[data.length - 2].valor);
                        variacao = ((valor - anterior) / anterior * 100).toFixed(2);
                    }
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value">${valor.toFixed(2)}</div>
                                <div class="stat-label">Índice</div>
                            </div>
                            ${variacao !== null ? `
                            <div class="stat-card">
                                <div class="stat-value ${parseFloat(variacao) >= 0 ? 'positive' : 'negative'}">${parseFloat(variacao) >= 0 ? '+' : ''}${variacao}%</div>
                                <div class="stat-label">Variação Mensal</div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(latest.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value">Indicador proxy do PIB mensal</span>
                        </div>
                    `;
                    showSuccess('ibc_br', content);
                } else {
                    showError('ibc_br', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro IBC-Br:', error);
            }
        }

        // Função para buscar dados da Balança Comercial
        async function fetchBalancaComercial() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.22707/dados/ultimos/2?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'balanca_comercial');
                
                if (data && data.length > 0) {
                    const latest = data[data.length - 1];
                    const valor = parseFloat(latest.valor);
                    
                    // Calcular variação se temos dados suficientes
                    let variacao = null;
                    if (data.length > 1) {
                        const anterior = parseFloat(data[data.length - 2].valor);
                        variacao = valor - anterior;
                    }
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value ${valor >= 0 ? 'positive' : 'negative'}">US$ ${formatNumber(valor)}</div>
                                <div class="stat-label">Saldo (Milhões)</div>
                            </div>
                            ${variacao !== null ? `
                            <div class="stat-card">
                                <div class="stat-value ${variacao >= 0 ? 'positive' : 'negative'}">${variacao >= 0 ? '+' : ''}US$ ${formatNumber(variacao)}</div>
                                <div class="stat-label">Variação Mensal</div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(latest.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value">Competitividade externa do país</span>
                        </div>
                    `;
                    showSuccess('balanca_comercial', content);
                } else {
                    showError('balanca_comercial', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro Balança Comercial:', error);
            }
        }

        // Função para buscar dados das Reservas Internacionais
        async function fetchReservasInternacionais() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.3546/dados/ultimos/3?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'reservas_internacionais');
                
                if (data && data.length > 0) {
                    const latest = data[data.length - 1];
                    const valor = parseFloat(latest.valor);
                    
                    console.log('📊 Reservas Internacionais - valor:', valor);
                    
                    // Calcular variação mensal se temos dados suficientes
                    let variacaoMensal = null;
                    let variacaoPercentual = null;
                    if (data.length > 1) {
                        const anterior = parseFloat(data[data.length - 2].valor);
                        variacaoMensal = valor - anterior;
                        variacaoPercentual = ((valor - anterior) / anterior * 100).toFixed(2);
                    }
                    
                    // Converter para formato mais legível
                    const valorBilhoes = valor / 1000; // Assumindo que vem em milhões USD
                    
                    // Classificar nível das reservas
                    let nivelReservas = 'Adequado';
                    let classeNivel = 'positive';
                    if (valorBilhoes < 200) {
                        nivelReservas = 'Baixo';
                        classeNivel = 'negative';
                    } else if (valorBilhoes > 400) {
                        nivelReservas = 'Alto';
                        classeNivel = 'positive';
                    } else {
                        nivelReservas = 'Moderado';
                        classeNivel = '';
                    }
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value ${classeNivel}">US$ ${valorBilhoes.toFixed(1)}bi</div>
                                <div class="stat-label">Reservas Totais</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value ${classeNivel}">${nivelReservas}</div>
                                <div class="stat-label">Nível</div>
                            </div>
                        </div>
                        ${variacaoMensal !== null ? `
                        <div class="metric">
                            <span class="metric-label">Variação Mensal:</span>
                            <span class="metric-value ${variacaoMensal >= 0 ? 'positive' : 'negative'}">${variacaoMensal >= 0 ? '+' : ''}US$ ${Math.abs(variacaoMensal/1000).toFixed(1)}bi (${variacaoPercentual >= 0 ? '+' : ''}${variacaoPercentual}%)</span>
                        </div>
                        ` : ''}
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(latest.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Importância:</span>
                            <span class="metric-value">Defesa contra crises externas</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Valor Exato:</span>
                            <span class="metric-value">US$ ${new Intl.NumberFormat('pt-BR').format(valor)} milhões</span>
                        </div>
                    `;
                    showSuccess('reservas_internacionais', content);
                } else {
                    showError('reservas_internacionais', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro Reservas Internacionais:', error);
            }
        }

        // Função para análise das reservas internacionais
        async function fetchAnaliseReservas() {
            try {
                showLoading('analise_reservas');
                
                // Buscar dados das reservas
                const proxyRequestUrl = proxyUrl + encodeURIComponent("https://api.bcb.gov.br/dados/serie/bcdata.sgs.3546/dados/ultimos/1?formato=json");
                const response = await fetch(proxyRequestUrl);
                const result = await response.json();
                
                const parseApiData = (result) => {
                    if (!result.success) return null;
                    let data = result.data;
                    if (typeof data === 'string') {
                        try { data = JSON.parse(data); } catch (e) { return null; }
                    }
                    if (!Array.isArray(data)) return null;
                    return data;
                };
                
                const reservasData = parseApiData(result);
                
                if (reservasData && reservasData.length > 0) {
                    const valor = parseFloat(reservasData[0].valor);
                    const valorBilhoes = valor / 1000;
                    
                    // Estimativas aproximadas para contexto brasileiro
                    const populacaoBrasil = 215000000; // ~215 milhões
                    const reservasPorHabitante = (valor * 1000000) / populacaoBrasil; // Converter para USD
                    
                    // Estimativa de cobertura de importações (aproximada)
                    const importacoesMensaisEstimadas = 20; // ~US$ 20bi/mês (estimativa)
                    const coberturaImportacoes = valorBilhoes / importacoesMensaisEstimadas;
                    
                    // Comparação com outros países (aproximações)
                    let comparacaoMundial = 'Posição intermediária';
                    let classeMundial = '';
                    
                    if (valorBilhoes > 500) {
                        comparacaoMundial = 'Entre os maiores do mundo';
                        classeMundial = 'positive';
                    } else if (valorBilhoes > 300) {
                        comparacaoMundial = 'Posição forte globalmente';
                        classeMundial = 'positive';
                    } else if (valorBilhoes < 200) {
                        comparacaoMundial = 'Abaixo do recomendado';
                        classeMundial = 'negative';
                    }
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value">US$ ${reservasPorHabitante.toFixed(0)}</div>
                                <div class="stat-label">Por Habitante</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${coberturaImportacoes.toFixed(1)} meses</div>
                                <div class="stat-label">Cobertura Importações</div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Contexto Global:</span>
                            <span class="metric-value ${classeMundial}">${comparacaoMundial}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Capacidade:</span>
                            <span class="metric-value">Cobrir ${coberturaImportacoes.toFixed(1)} meses de importações</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Função:</span>
                            <span class="metric-value">Estabilizar câmbio em crises</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Benchmark:</span>
                            <span class="metric-value">Ideal: 3-6 meses de importações</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Observação:</span>
                            <span class="metric-value">Estimativas baseadas em dados aproximados</span>
                        </div>
                    `;
                    showSuccess('analise_reservas', content);
                } else {
                    showError('analise_reservas', 'Erro ao carregar dados para análise');
                }
            } catch (error) {
                console.error('❌ Erro Análise Reservas:', error);
                showError('analise_reservas', `Erro na análise: ${error.message}`);
            }
        }

        // Função para buscar dados do INCC (Custo da Construção)
        async function fetchINCC() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.192/dados/ultimos/4?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'incc');
                
                if (data && data.length > 0) {
                    const latest = data[data.length - 1];
                    const valor = parseFloat(latest.valor);
                    
                    console.log('📊 INCC - valor:', valor);
                    
                    // Calcular variações
                    let variacaoMensal = null;
                    let variacaoTrimestral = null;
                    let variacaoAnual = null;
                    
                    if (data.length > 1) {
                        const anterior = parseFloat(data[data.length - 2].valor);
                        variacaoMensal = ((valor - anterior) / anterior * 100).toFixed(2);
                    }
                    
                    if (data.length >= 3) {
                        const trimestre = parseFloat(data[data.length - 4].valor);
                        variacaoTrimestral = ((valor - trimestre) / trimestre * 100).toFixed(2);
                    }
                    
                    // Simular variação anual (aproximada usando trimestral * 4)
                    if (variacaoTrimestral !== null) {
                        variacaoAnual = (parseFloat(variacaoTrimestral) * 4).toFixed(2);
                    }
                    
                    // Análise do impacto
                    let impactoAnalise = 'Estável';
                    let classeImpacto = '';
                    
                    if (variacaoMensal !== null) {
                        const varMensal = parseFloat(variacaoMensal);
                        if (varMensal > 1.0) {
                            impactoAnalise = 'Alta pressão de custos';
                            classeImpacto = 'negative';
                        } else if (varMensal > 0.5) {
                            impactoAnalise = 'Pressão moderada';
                            classeImpacto = '';
                        } else if (varMensal < -0.5) {
                            impactoAnalise = 'Custos em queda';
                            classeImpacto = 'positive';
                        } else {
                            impactoAnalise = 'Custos estáveis';
                            classeImpacto = 'positive';
                        }
                    }
                    
                    // Simulação prática
                    const custoPorM2Base = 1800; // R$ 1.800/m² como base aproximada
                    const custoPorM2Atual = custoPorM2Base * (valor / 100); // Ajuste pelo índice
                    const custoObra100m2 = custoPorM2Atual * 100;
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value">${valor.toFixed(2)}</div>
                                <div class="stat-label">Índice Base</div>
                            </div>
                            ${variacaoMensal !== null ? `
                            <div class="stat-card">
                                <div class="stat-value ${parseFloat(variacaoMensal) <= 0.5 ? 'positive' : 'negative'}">${parseFloat(variacaoMensal) >= 0 ? '+' : ''}${variacaoMensal}%</div>
                                <div class="stat-label">Variação Mensal</div>
                            </div>
                            ` : ''}
                            ${variacaoAnual !== null ? `
                            <div class="stat-card">
                                <div class="stat-value ${parseFloat(variacaoAnual) <= 6 ? 'positive' : 'negative'}">${parseFloat(variacaoAnual) >= 0 ? '+' : ''}${variacaoAnual}%</div>
                                <div class="stat-label">Projeção Anual</div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value ${classeImpacto}">${impactoAnalise}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Simulação 100m²:</span>
                            <span class="metric-value">~${formatCurrency(custoObra100m2)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Custo por m²:</span>
                            <span class="metric-value">~${formatCurrency(custoPorM2Atual)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(latest.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Relevância:</span>
                            <span class="metric-value">Preços de imóveis e obras</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Observação:</span>
                            <span class="metric-value">Simulação baseada em estimativas regionais</span>
                        </div>
                    `;
                    showSuccess('incc', content);
                } else {
                    showError('incc', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro INCC:', error);
            }
        }

        // Função para buscar dados do IPCA-15 (Prévia da Inflação)
        async function fetchIPCA15() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.7478/dados/ultimos/3?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'ipca15');
                
                if (data && data.length > 0) {
                    const latest = data[data.length - 1];
                    const valor = parseFloat(latest.valor);
                    
                    console.log('📊 IPCA-15 - valor:', valor);
                    
                    // Calcular variações
                    let variacaoMensal = null;
                    let variacaoAcumulada = null;
                    
                    if (data.length > 1) {
                        const anterior = parseFloat(data[data.length - 2].valor);
                        variacaoMensal = ((valor - anterior) / anterior * 100).toFixed(2);
                    }
                    
                    // Calcular acumulado do ano (aproximação)
                    if (data.length >= 3) {
                        let acumulado = 1;
                        for (let i = 0; i < data.length; i++) {
                            const val = parseFloat(data[i].valor);
                            if (!isNaN(val)) {
                                acumulado *= (1 + val / 100);
                            }
                        }
                        variacaoAcumulada = ((acumulado - 1) * 100).toFixed(2);
                    }
                    
                    // Análise da prévia
                    let analisePrevia = 'Normal';
                    let classeAnalise = '';
                    
                    if (valor > 0.8) {
                        analisePrevia = 'Inflação alta';
                        classeAnalise = 'negative';
                    } else if (valor > 0.5) {
                        analisePrevia = 'Inflação moderada';
                        classeAnalise = '';
                    } else if (valor > 0.2) {
                        analisePrevia = 'Inflação controlada';
                        classeAnalise = 'positive';
                    } else if (valor <= 0) {
                        analisePrevia = 'Deflação';
                        classeAnalise = 'positive';
                    }
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value ${valor <= 0.5 ? 'positive' : 'negative'}">${valor >= 0 ? '+' : ''}${valor.toFixed(2)}%</div>
                                <div class="stat-label">Variação Mensal</div>
                            </div>
                            ${variacaoAcumulada !== null ? `
                            <div class="stat-card">
                                <div class="stat-value ${parseFloat(variacaoAcumulada) <= 6 ? 'positive' : 'negative'}">${parseFloat(variacaoAcumulada) >= 0 ? '+' : ''}${variacaoAcumulada}%</div>
                                <div class="stat-label">Acumulado</div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="metric">
                            <span class="metric-label">Status:</span>
                            <span class="metric-value ${classeAnalise}">${analisePrevia}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Meta BCB:</span>
                            <span class="metric-value">3,00% ± 1,5%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(latest.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Relevância:</span>
                            <span class="metric-value">Prévia do IPCA oficial</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Observação:</span>
                            <span class="metric-value">Divulgado na primeira quinzena</span>
                        </div>
                    `;
                    showSuccess('ipca15', content);
                } else {
                    showError('ipca15', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro IPCA-15:', error);
                showError('ipca15', 'Erro ao carregar dados');
            }
        }

        // Função para buscar dados do IGP-M
        async function fetchIGPM() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados/ultimos/3?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'igpm');
                
                if (data && data.length > 0) {
                    const latest = data[data.length - 1];
                    const valor = parseFloat(latest.valor);
                    
                    console.log('📊 IGP-M - valor:', valor);
                    
                    // Calcular variações
                    let variacaoMensal = null;
                    let variacaoAcumulada = null;
                    
                    if (data.length > 1) {
                        const anterior = parseFloat(data[data.length - 2].valor);
                        variacaoMensal = ((valor - anterior) / anterior * 100).toFixed(2);
                    }
                    
                    // Calcular acumulado (aproximação)
                    if (data.length >= 3) {
                        let acumulado = 1;
                        for (let i = 0; i < data.length; i++) {
                            const val = parseFloat(data[i].valor);
                            if (!isNaN(val)) {
                                acumulado *= (1 + val / 100);
                            }
                        }
                        variacaoAcumulada = ((acumulado - 1) * 100).toFixed(2);
                    }
                    
                    // Análise do IGP-M
                    let analiseIGPM = 'Normal';
                    let classeAnalise = '';
                    
                    if (valor > 1.5) {
                        analiseIGPM = 'Alta pressão nos preços';
                        classeAnalise = 'negative';
                    } else if (valor > 0.8) {
                        analiseIGPM = 'Pressão moderada';
                        classeAnalise = '';
                    } else if (valor > 0.3) {
                        analiseIGPM = 'Variação controlada';
                        classeAnalise = 'positive';
                    } else if (valor <= 0) {
                        analiseIGPM = 'Deflação';
                        classeAnalise = 'positive';
                    }
                    
                    // Simulação de impacto no aluguel
                    const aluguelBase = 2000; // R$ 2.000 como exemplo
                    const novoAluguel = aluguelBase * (1 + valor / 100);
                    const variacaoAluguel = novoAluguel - aluguelBase;
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value ${valor <= 0.8 ? 'positive' : 'negative'}">${valor >= 0 ? '+' : ''}${valor.toFixed(2)}%</div>
                                <div class="stat-label">Variação Mensal</div>
                            </div>
                            ${variacaoAcumulada !== null ? `
                            <div class="stat-card">
                                <div class="stat-value ${parseFloat(variacaoAcumulada) <= 10 ? 'positive' : 'negative'}">${parseFloat(variacaoAcumulada) >= 0 ? '+' : ''}${variacaoAcumulada}%</div>
                                <div class="stat-label">Acumulado</div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="metric">
                            <span class="metric-label">Status:</span>
                            <span class="metric-value ${classeAnalise}">${analiseIGPM}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto Aluguel R$ 2.000:</span>
                            <span class="metric-value ${variacaoAluguel <= 20 ? 'positive' : 'negative'}">
                                ${variacaoAluguel >= 0 ? '+' : ''}US$ ${formatCurrency(variacaoAluguel)}
                            </span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(latest.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Relevância:</span>
                            <span class="metric-value">Reajuste de aluguéis e contratos</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Observação:</span>
                            <span class="metric-value">Índice mais amplo que o IPCA</span>
                        </div>
                    `;
                    showSuccess('igpm', content);
                } else {
                    showError('igpm', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro IGP-M:', error);
                showError('igpm', 'Erro ao carregar dados');
            }
        }

        // Função para buscar dados da Taxa de Desemprego
        async function fetchDesemprego() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.24369/dados/ultimos/4?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'desemprego');
                
                if (data && data.length > 0) {
                    const latest = data[data.length - 1];
                    const valor = parseFloat(latest.valor);
                    
                    console.log('📊 Taxa de Desemprego - valor:', valor);
                    
                    // Calcular variações
                    let variacaoTrimestral = null;
                    let tendencia = 'Estável';
                    
                    if (data.length > 1) {
                        const anterior = parseFloat(data[data.length - 2].valor);
                        variacaoTrimestral = (valor - anterior).toFixed(1);
                        
                        if (parseFloat(variacaoTrimestral) > 0.2) {
                            tendencia = 'Em alta';
                        } else if (parseFloat(variacaoTrimestral) < -0.2) {
                            tendencia = 'Em queda';
                        }
                    }
                    
                    // Análise do desemprego
                    let analiseDesemprego = 'Normal';
                    let classeAnalise = '';
                    
                    if (valor > 12) {
                        analiseDesemprego = 'Desemprego muito alto';
                        classeAnalise = 'negative';
                    } else if (valor > 9) {
                        analiseDesemprego = 'Desemprego alto';
                        classeAnalise = 'negative';
                    } else if (valor > 6) {
                        analiseDesemprego = 'Desemprego moderado';
                        classeAnalise = '';
                    } else if (valor <= 6) {
                        analiseDesemprego = 'Pleno emprego';
                        classeAnalise = 'positive';
                    }
                    
                    // Estimativa de pessoas desempregadas
                    const populacaoAtiva = 107000000; // Aproximadamente 107 milhões
                    const pessoasDesempregadas = Math.round((populacaoAtiva * valor) / 100);
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value ${valor <= 7 ? 'positive' : 'negative'}">${valor.toFixed(1)}%</div>
                                <div class="stat-label">Taxa Atual</div>
                            </div>
                            ${variacaoTrimestral !== null ? `
                            <div class="stat-card">
                                <div class="stat-value ${parseFloat(variacaoTrimestral) <= 0 ? 'positive' : 'negative'}">${parseFloat(variacaoTrimestral) >= 0 ? '+' : ''}${variacaoTrimestral}pp</div>
                                <div class="stat-label">Variação Trimestral</div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="metric">
                            <span class="metric-label">Status:</span>
                            <span class="metric-value ${classeAnalise}">${analiseDesemprego}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Tendência:</span>
                            <span class="metric-value">${tendencia}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Pessoas:</span>
                            <span class="metric-value">~${(pessoasDesempregadas / 1000000).toFixed(1)}M desempregados</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Meta Ideal:</span>
                            <span class="metric-value">≤ 6% (pleno emprego)</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(latest.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Fonte:</span>
                            <span class="metric-value">PNAD Contínua (IBGE)</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Observação:</span>
                            <span class="metric-value">Dados trimestrais</span>
                        </div>
                    `;
                    showSuccess('desemprego', content);
                } else {
                    showError('desemprego', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro Taxa de Desemprego:', error);
                showError('desemprego', 'Erro ao carregar dados');
            }
        }

        // Função para buscar dados da Poupança
        async function fetchPoupanca() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados/ultimos/3?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'poupanca');
                
                if (data && data.length > 0) {
                    const latest = data[data.length - 1];
                    const valorOriginal = parseFloat(latest.valor);
                    
                    console.log('📊 Poupança - valor original:', valorOriginal);
                    
                    // A API retorna a taxa já em formato de porcentagem decimal
                    // Exemplo: 0.6728 = 0.6728% ao mês
                    const taxaMensal = valorOriginal / 100; // Converter para decimal
                    
                    // Calcular rendimento anualizado usando fórmula de juros compostos
                    const rendimentoAnual = ((Math.pow(1 + taxaMensal, 12) - 1) * 100);
                    
                    // Simulação com R$ 10.000
                    const valorBase = 10000;
                    const rendimentoMensal = valorBase * taxaMensal;
                    const valorApos12Meses = valorBase * Math.pow(1 + taxaMensal, 12);
                    
                    console.log('📊 Poupança calculada:', {
                        valorOriginal,
                        taxaMensal,
                        rendimentoAnual,
                        simulacao10kMensal: rendimentoMensal
                    });
                    
                    // Análise da rentabilidade
                    let analiseRentabilidade = 'Normal';
                    let classeAnalise = '';
                    
                    if (rendimentoAnual > 10) {
                        analiseRentabilidade = 'Rentabilidade alta';
                        classeAnalise = 'positive';
                    } else if (rendimentoAnual > 6) {
                        analiseRentabilidade = 'Rentabilidade moderada';
                        classeAnalise = 'positive';
                    } else if (rendimentoAnual > 3) {
                        analiseRentabilidade = 'Rentabilidade baixa';
                        classeAnalise = '';
                    } else {
                        analiseRentabilidade = 'Muito baixa';
                        classeAnalise = 'negative';
                    }
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value positive">${valorOriginal.toFixed(4)}%</div>
                                <div class="stat-label">Rendimento Mensal</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value ${rendimentoAnual >= 8 ? 'positive' : 'negative'}">${rendimentoAnual.toFixed(2)}%</div>
                                <div class="stat-label">Anualizado</div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Status:</span>
                            <span class="metric-value ${classeAnalise}">${analiseRentabilidade}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Simulação R$ 10k/mês:</span>
                            <span class="metric-value">+${formatCurrency(rendimentoMensal)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Valor após 12 meses:</span>
                            <span class="metric-value">${formatCurrency(valorApos12Meses)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(latest.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Relevância:</span>
                            <span class="metric-value">Investimento de baixo risco</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Observação:</span>
                            <span class="metric-value">Isenta de IR até R$ 35k</span>
                        </div>
                    `;
                    showSuccess('poupanca', content);
                } else {
                    showError('poupanca', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro Poupança:', error);
                showError('poupanca', 'Erro ao carregar dados');
            }
        }

        // Função para buscar e comparar investimentos (Poupança vs SELIC vs CDI)
        async function fetchComparativoInvestimentos() {
            console.log('🔗 Carregando dados para comparativo...');
            
            try {
                showLoading('comparativo_investimentos');
                
                // URLs das APIs
                const urlPoupanca = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados/ultimos/1?formato=json";
                const urlSelic = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json";
                const urlCDI = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json";
                
                // Detectar URL do proxy (mesma lógica das outras funções)
                const currentHost = window.location.hostname;
                const currentProtocol = window.location.protocol;
                let proxyUrl;
                
                if (currentHost.includes('vercel.app') || 
                    (currentHost !== 'localhost' && currentHost !== '127.0.0.1')) {
                    proxyUrl = `${currentProtocol}//${currentHost}/api/proxy?url=`;
                } else if (window.location.port === '3000') {
                    proxyUrl = `${currentProtocol}//${currentHost}:3000/proxy?url=`;
                } else {
                    proxyUrl = `${currentProtocol}//${currentHost}:3000/proxy?url=`;
                }
                
                console.log('🔗 Usando proxy URL:', proxyUrl);
                
                // Fazer requisições diretas através do proxy
                const [response1, response2, response3] = await Promise.all([
                    fetch(`${proxyUrl}${encodeURIComponent(urlPoupanca)}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    }),
                    fetch(`${proxyUrl}${encodeURIComponent(urlSelic)}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    }),
                    fetch(`${proxyUrl}${encodeURIComponent(urlCDI)}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    })
                ]);
                
                const [data1, data2, data3] = await Promise.all([
                    response1.json(),
                    response2.json(),
                    response3.json()
                ]);
                
                console.log('📊 Respostas brutas do comparativo:', { data1, data2, data3 });
                
                // Extrair dados das respostas
                const result1 = data1.success ? data1.data : null;
                const result2 = data2.success ? data2.data : null;
                const result3 = data3.success ? data3.data : null;
                
                console.log('📊 Dados extraídos:', { result1, result2, result3 });
                
                if (result1 && result2 && result3 && 
                    result1.length > 0 && result2.length > 0 && result3.length > 0) {
                    
                    // Extrair valores
                    const poupanca = parseFloat(result1[0].valor);
                    const selic = parseFloat(result2[0].valor);
                    const cdi = parseFloat(result3[0].valor);
                    
                    console.log('📊 Valores brutos:', { poupanca, selic, cdi });
                    
                    // Converter para taxas anualizadas
                    // Poupança: já vem em % mensal
                    const poupancaAnual = ((Math.pow(1 + (poupanca / 100), 12) - 1) * 100);
                    
                    // SELIC e CDI: assumir que estão em base diária
                    const selicAnual = ((Math.pow(1 + (selic / 100), 252) - 1) * 100);
                    const cdiAnual = ((Math.pow(1 + (cdi / 100), 252) - 1) * 100);
                    
                    console.log('📊 Taxas anualizadas:', { poupancaAnual, selicAnual, cdiAnual });
                    
                    // Simulação com R$ 10.000
                    const valorBase = 10000;
                    const rendPoupanca = valorBase * (poupancaAnual / 100);
                    const rendSelic = valorBase * (selicAnual / 100);
                    const rendCDI = valorBase * (cdiAnual / 100);
                    
                    // Determinar o melhor investimento
                    const investimentos = [
                        { nome: 'Poupança', rendimento: poupancaAnual, valor: rendPoupanca },
                        { nome: 'SELIC', rendimento: selicAnual, valor: rendSelic },
                        { nome: 'CDI', rendimento: cdiAnual, valor: rendCDI }
                    ];
                    
                    const melhor = investimentos.reduce((prev, current) => 
                        (prev.rendimento > current.rendimento) ? prev : current
                    );
                    
                    console.log('🏆 Melhor investimento:', `${melhor.nome} ${melhor.rendimento.toFixed(2)}%`);
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value ${melhor.nome === 'Poupança' ? 'positive' : ''}">${poupancaAnual.toFixed(2)}%</div>
                                <div class="stat-label">Poupança</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value ${melhor.nome === 'SELIC' ? 'positive' : ''}">${selicAnual.toFixed(2)}%</div>
                                <div class="stat-label">SELIC</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value ${melhor.nome === 'CDI' ? 'positive' : ''}">${cdiAnual.toFixed(2)}%</div>
                                <div class="stat-label">CDI</div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="metric-label">🏆 Melhor opção:</span>
                            <span class="metric-value positive">${melhor.nome} (${melhor.rendimento.toFixed(2)}%)</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Simulação R$ 10k:</span>
                            <span class="metric-value">
                                Poupança: +${formatCurrency(rendPoupanca)} | 
                                SELIC: +${formatCurrency(rendSelic)} | 
                                CDI: +${formatCurrency(rendCDI)}
                            </span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Diferença anual:</span>
                            <span class="metric-value positive">+${formatCurrency(melhor.valor - Math.min(rendPoupanca, rendSelic, rendCDI))}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Observação:</span>
                            <span class="metric-value">Poupança isenta de IR; demais têm tributação</span>
                        </div>
                    `;
                    showSuccess('comparativo_investimentos', content);
                } else {
                    console.log('❌ Dados insuficientes:', { result1, result2, result3 });
                    showError('comparativo_investimentos', 'Dados insuficientes para comparação');
                }
            } catch (error) {
                console.error('Erro Comparativo:', error);
                showError('comparativo_investimentos', 'Erro ao carregar dados');
            }
        }

        // Função para buscar dados da Taxa de Inadimplência
        async function fetchInadimplencia() {
            const apiUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.21082/dados/ultimos/2?formato=json";
            
            try {
                const data = await fetchWithProxy(apiUrl, 'inadimplencia');
                
                if (data && data.length > 0) {
                    const latest = data[data.length - 1];
                    const valor = parseFloat(latest.valor);
                    
                    console.log('📊 Taxa de Inadimplência - valor:', valor);
                    
                    // Calcular variação mensal
                    let variacao = null;
                    let tendencia = 'Estável';
                    
                    if (data.length > 1) {
                        const anterior = parseFloat(data[data.length - 2].valor);
                        variacao = (valor - anterior).toFixed(2);
                        
                        if (parseFloat(variacao) > 0.1) {
                            tendencia = 'Em alta';
                        } else if (parseFloat(variacao) < -0.1) {
                            tendencia = 'Em queda';
                        }
                    }
                    
                    // Análise da inadimplência
                    let analiseInadimplencia = 'Normal';
                    let classeAnalise = '';
                    
                    if (valor > 4.5) {
                        analiseInadimplencia = 'Inadimplência alta';
                        classeAnalise = 'negative';
                    } else if (valor > 3.5) {
                        analiseInadimplencia = 'Inadimplência moderada';
                        classeAnalise = '';
                    } else if (valor > 2.5) {
                        analiseInadimplencia = 'Inadimplência controlada';
                        classeAnalise = 'positive';
                    } else {
                        analiseInadimplencia = 'Inadimplência baixa';
                        classeAnalise = 'positive';
                    }
                    
                    // Impacto no crédito
                    let impactoCredito = 'Neutro';
                    if (valor > 4.0) {
                        impactoCredito = 'Crédito mais restrito';
                    } else if (valor < 3.0) {
                        impactoCredito = 'Crédito mais acessível';
                    }
                    
                    const content = `
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-value ${valor <= 3.5 ? 'positive' : 'negative'}">${valor.toFixed(2)}%</div>
                                <div class="stat-label">Taxa Atual</div>
                            </div>
                            ${variacao !== null ? `
                            <div class="stat-card">
                                <div class="stat-value ${parseFloat(variacao) <= 0 ? 'positive' : 'negative'}">${parseFloat(variacao) >= 0 ? '+' : ''}${variacao}pp</div>
                                <div class="stat-label">Variação Mensal</div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="metric">
                            <span class="metric-label">Status:</span>
                            <span class="metric-value ${classeAnalise}">${analiseInadimplencia}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Tendência:</span>
                            <span class="metric-value">${tendencia}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Impacto:</span>
                            <span class="metric-value">${impactoCredito}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Meta Ideal:</span>
                            <span class="metric-value">≤ 3% (saúde financeira)</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data:</span>
                            <span class="metric-value">${formatDate(latest.data)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Relevância:</span>
                            <span class="metric-value">Saúde do sistema financeiro</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Observação:</span>
                            <span class="metric-value">Pessoa física - operações de crédito</span>
                        </div>
                    `;
                    showSuccess('inadimplencia', content);
                } else {
                    showError('inadimplencia', 'Nenhum dado encontrado');
                }
            } catch (error) {
                console.error('Erro Inadimplência:', error);
                showError('inadimplencia', 'Erro ao carregar dados');
            }
        }

        // Função para carregar todos os dados automaticamente
        async function loadAllData() {
            console.log('🚀 Carregando todos os dados automaticamente...');
            
            showProgressBar();
            let completed = 0;
            const total = 19; // Número total de APIs (incluindo IPCA-15, IGP-M e Desemprego)
            
            const updateProgressAndComplete = () => {
                completed++;
                const percentage = (completed / total) * 100;
                updateProgress(percentage);
                
                if (completed === total) {
                    setTimeout(() => {
                        hideProgressBar();
                        console.log('✅ Carregamento inicial concluído');
                    }, 300);
                }
            };
            
            // Função helper para executar fetch com atualização de progresso
            const fetchWithProgress = async (fetchFunction) => {
                try {
                    await fetchFunction();
                } catch (error) {
                    console.error('Erro em uma das requisições:', error);
                } finally {
                    updateProgressAndComplete();
                }
            };
            
            // Carregar dados com pequeno delay entre as requisições para evitar sobrecarga
            setTimeout(() => fetchWithProgress(fetchPTAX), 100);
            setTimeout(() => fetchWithProgress(fetchPTAXEuro), 300);
            setTimeout(() => fetchWithProgress(fetchSELIC), 500);
            setTimeout(() => fetchWithProgress(fetchIPCA), 700);
            setTimeout(() => fetchWithProgress(fetchCDI), 900);
            setTimeout(() => fetchWithProgress(fetchPIB), 1100);
            setTimeout(() => fetchWithProgress(fetchIBCBr), 1300);
            setTimeout(() => fetchWithProgress(fetchBalancaComercial), 1500);
            setTimeout(() => fetchWithProgress(fetchReservasInternacionais), 1700);
            setTimeout(() => fetchWithProgress(fetchAnaliseReservas), 1900);
            setTimeout(() => fetchWithProgress(fetchINCC), 2100);
            setTimeout(() => fetchWithProgress(fetchIPCA15), 2200);
            setTimeout(() => fetchWithProgress(fetchIGPM), 2400);
            setTimeout(() => fetchWithProgress(fetchPoupanca), 2600);
            setTimeout(() => fetchWithProgress(fetchComparativoInvestimentos), 2800);
            setTimeout(() => fetchWithProgress(fetchCredito), 3000);
            setTimeout(() => fetchWithProgress(fetchCarteira), 3200);
            setTimeout(() => fetchWithProgress(fetchInadimplencia), 3400);
            setTimeout(() => fetchWithProgress(fetchDesemprego), 3600);
        }

        // Função para formatar números grandes
        function formatNumber(num) {
            if (Math.abs(num) >= 1000) {
                return new Intl.NumberFormat('pt-BR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1
                }).format(num);
            }
            return new Intl.NumberFormat('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }).format(num);
        }

        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
            loadSavedTheme();
            
            // Debug: mostrar URL do proxy sendo usada
            console.log('🔗 Proxy URL configurada:', proxyUrl);
            console.log('🌐 Acessando de:', window.location.href);
            
            // Verificar se o proxy está funcionando e carregar dados
            checkProxyHealth().then(healthy => {
                if (healthy) {
                    console.log('✅ Proxy está funcionando');
                    // Carregar todos os dados automaticamente após verificar o proxy
                    setTimeout(loadAllData, 500); // Pequeno delay para garantir que a página carregou
                } else {
                    console.warn('⚠️ Proxy não está respondendo. Verifique se o servidor está rodando.');
                    
                    // Mostrar alerta visual se o proxy não estiver funcionando
                    const alertDiv = document.createElement('div');
                    alertDiv.style.cssText = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: var(--warning-color);
                        color: white;
                        padding: 12px 20px;
                        border-radius: 8px;
                        box-shadow: var(--shadow);
                        z-index: 1000;
                        font-weight: 500;
                    `;
                    alertDiv.innerHTML = `
                        <i class="fas fa-exclamation-triangle"></i>
                        Servidor proxy não está disponível. Execute: npm start
                    `;
                    document.body.appendChild(alertDiv);
                    
                    // Remover o alerta após 10 segundos
                    setTimeout(() => {
                        if (alertDiv.parentNode) {
                            alertDiv.parentNode.removeChild(alertDiv);
                        }
                    }, 10000);
                }
            });
            
            // Remover indicadores de refresh antigos (não precisamos mais desta funcionalidade)
        });