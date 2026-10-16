const metadataUrl = code => `https://www3.bcb.gov.br/sgspub/consultarmetadados/consultarMetadadosSeries.do?method=consultarMetadadosSeriesInternet&hdOidSerieSelecionada=${code}`;

const definitions = [
  {
    id: 'br-incc-mensal', code: 192, name: 'INCC mensal', shortName: 'INCC', featured: true,
    topic: 'Inflacao', frequency: 'monthly', unit: '% a.m.', publisher: 'FGV',
    description: 'Variação mensal do Índice Nacional de Custo da Construção, série 192 do SGS.',
    methodology: 'Índice produzido pela FGV e distribuído pelo SGS/BCB. Mantém a variação mensal original, não o acumulado em 12 meses. Consulte na fonte a modalidade e o período de coleta; não confunda séries INCC com calendários diferentes.',
    keywords: ['incc', 'construcao', 'imoveis', 'custos'],
  },
  {
    id: 'br-igpm-mensal', code: 189, name: 'IGP-M mensal', shortName: 'IGP-M', featured: true,
    topic: 'Inflacao', frequency: 'monthly', unit: '% a.m.', publisher: 'FGV',
    description: 'Variação mensal do Índice Geral de Preços — Mercado.',
    methodology: 'Índice produzido pela FGV e distribuído pelo SGS/BCB. Valor mensal publicado, não acumulado anual. Um reajuste contratual depende do período e das condições do contrato, não apenas da última taxa mensal.',
    keywords: ['igpm', 'igp-m', 'aluguel', 'reajuste', 'precos'],
  },
  {
    id: 'br-selic-meta', code: 432, name: 'Meta Selic', shortName: 'Selic', featured: true,
    topic: 'Juros', frequency: 'daily', unit: '% a.a.', publisher: 'BCB / Copom',
    description: 'Meta para a taxa Selic definida pelo Copom, expressa em percentual ao ano.',
    methodology: 'Valor publicado pelo BCB. Não é a taxa Selic efetiva diária e não resulta de uma anualização feita por este projeto.',
    keywords: ['juros', 'copom', 'taxa basica'],
  },
  {
    id: 'br-ipca-mensal', code: 433, name: 'IPCA mensal', shortName: 'IPCA',
    topic: 'Inflacao', frequency: 'monthly', unit: '% a.m.', publisher: 'IBGE',
    description: 'Variação mensal do Índice Nacional de Preços ao Consumidor Amplo.',
    methodology: 'Indicador produzido pelo IBGE e distribuído pelo SGS/BCB. O período identifica o mês de referência, não a data de publicação.',
    keywords: ['inflacao', 'precos', 'custo de vida'],
  },
  {
    id: 'br-ipca-12m', code: 13522, name: 'IPCA em 12 meses', shortName: 'IPCA 12m',
    topic: 'Inflacao', frequency: 'monthly', unit: '% em 12 meses', publisher: 'IBGE',
    description: 'Variação acumulada do IPCA nos últimos doze meses.',
    methodology: 'Acumulado publicado no SGS, sem somar variações mensais nem recalcular o índice no cliente.',
    keywords: ['inflacao', 'acumulado', 'precos'],
  },
  {
    id: 'br-usd-ptax-venda', code: 1, name: 'Dólar PTAX · venda', shortName: 'Dólar',
    topic: 'Cambio', frequency: 'daily', unit: 'R$/US$', publisher: 'BCB',
    description: 'Taxa de câmbio de venda do dólar americano, série diária do SGS.',
    methodology: 'Cotação de referência, não cotação em tempo real nem preço de câmbio ao consumidor. Usa a última observação disponível no período, inclusive em feriados e antes da divulgação do dia.',
    keywords: ['dolar', 'usd', 'ptax', 'cambio'],
  },
  {
    id: 'br-cdi-diario', code: 12, name: 'CDI diário', shortName: 'CDI',
    topic: 'Juros', frequency: 'daily', unit: '% a.d.', publisher: 'Cetip',
    description: 'Taxa de juros CDI na unidade diária publicada pelo SGS.',
    methodology: 'Mantém a taxa diária original. Não representa retorno anual, líquido, garantido ou uma recomendação de investimento.',
    keywords: ['cdi', 'juros', 'investimentos'],
  },
  {
    id: 'br-ibc-br', code: 24363, name: 'Atividade econômica · IBC-Br', shortName: 'IBC-Br',
    topic: 'Atividade', frequency: 'monthly', unit: 'índice', publisher: 'BCB',
    description: 'Índice de Atividade Econômica do Banco Central, série sem ajuste sazonal.',
    methodology: 'Série 24363, sem ajuste sazonal. Não é o PIB e não deve ser confundida com a série dessazonalizada 24364. Base e revisões devem ser consultadas nos metadados oficiais.',
    keywords: ['atividade', 'economia', 'ibc', 'producao'],
  },
  {
    id: 'br-eur-ptax-venda', code: 21619, name: 'Euro PTAX · venda', shortName: 'Euro',
    topic: 'Cambio', frequency: 'daily', unit: 'R$/€', publisher: 'BCB',
    description: 'Cotação de referência de venda do euro em reais.',
    methodology: 'Série 21619 (venda). A série 21620 é de compra e não é intercambiável com esta. Não inclui spread, tributos ou tarifas cobrados ao consumidor.',
    keywords: ['euro', 'eur', 'ptax', 'cambio'],
  },
  {
    id: 'br-ipca15-mensal', code: 7478, name: 'IPCA-15 mensal', shortName: 'IPCA-15',
    topic: 'Inflacao', frequency: 'monthly', unit: '% a.m.', publisher: 'IBGE',
    description: 'Variação mensal do IPCA-15, com período de coleta diferente do IPCA.',
    methodology: 'Produzido pelo IBGE. É frequentemente chamado de prévia da inflação, mas não é previsão nem substituição do IPCA: a janela de coleta e a abrangência geográfica diferem.',
    keywords: ['ipca15', 'ipca-15', 'inflacao', 'previa'],
  },
  {
    id: 'br-pib-trimestral', code: 22099, name: 'PIB trimestral · índice', shortName: 'PIB',
    topic: 'Atividade', frequency: 'quarterly', unit: 'índice', publisher: 'IBGE',
    description: 'Índice de volume do PIB a preços de mercado, dados observados das Contas Nacionais Trimestrais.',
    methodology: 'Série 22099, sem ajuste sazonal. O índice não é valor em reais, nem taxa de crescimento. Referência trimestral, identificada pela data original da fonte. Base e revisões nas notas oficiais. Não usa a série 4385, que é PIB mensal estimado em dólares.',
    keywords: ['pib', 'produto interno bruto', 'crescimento', 'producao'],
  },
  {
    id: 'br-balanca-comercial', code: 22707, name: 'Balança comercial · saldo', shortName: 'Balança comercial',
    topic: 'Setor externo', frequency: 'monthly', unit: 'US$ milhões', publisher: 'BCB',
    description: 'Saldo mensal de bens do balanço de pagamentos: exportações menos importações.',
    methodology: 'Conceito de balanço de pagamentos (BPM6), com ajustes do BCB. Pode diferir do saldo aduaneiro divulgado pelo comércio exterior. Não representa todo o saldo de transações correntes.',
    keywords: ['exportacoes', 'importacoes', 'comercio', 'saldo'],
  },
  {
    id: 'br-reservas-internacionais', code: 3546, name: 'Reservas internacionais', shortName: 'Reservas',
    topic: 'Setor externo', frequency: 'monthly', unit: 'US$ milhões', publisher: 'BCB',
    description: 'Estoque total de reservas internacionais na posição mensal divulgada pelo BCB.',
    methodology: 'Série mensal 3546. É um estoque, não receita mensal. Mudanças podem envolver operações, rendimentos e variação de preços e moedas. O nível isolado não mede suficiência ou solvência do país.',
    keywords: ['reservas', 'internacionais', 'dolar', 'exterior'],
  },
  {
    id: 'br-poupanca', code: 195, name: 'Poupança · rendimento no período', shortName: 'Poupança',
    topic: 'Investimentos', frequency: 'daily', unit: '% a.m.', publisher: 'BCB',
    description: 'Rentabilidade no período para depósitos de poupança a partir de 4 de maio de 2012.',
    methodology: 'A série tem observações diárias, mas sua unidade é percentual ao mês. A data está associada ao período de rendimento/aniversário; não é retorno diário. Regras e crédito do rendimento dependem da data do depósito e do aniversário. Não anualizamos nem projetamos esse valor.',
    keywords: ['poupanca', 'rendimento', 'investimentos', 'aniversario'],
  },
  {
    id: 'br-juros-credito-pf', code: 20716, name: 'Juros do crédito · pessoas físicas', shortName: 'Juros do crédito PF',
    topic: 'Credito', frequency: 'monthly', unit: '% a.a.', publisher: 'BCB',
    description: 'Taxa média anual de juros das novas operações de crédito para pessoas físicas, total.',
    methodology: 'Série 20716. Agregado das novas operações, não uma oferta de empréstimo nem o CET. Não é uma modalidade específica de consumo. Corrige o vínculo legado com a série 7456, que mede INCC-M, não juros.',
    keywords: ['credito', 'consumo', 'emprestimo', 'juros', 'pessoas fisicas'],
  },
  {
    id: 'br-credito-total', code: 20539, name: 'Carteira de crédito · total', shortName: 'Crédito total',
    topic: 'Credito', frequency: 'monthly', unit: 'R$ milhões', publisher: 'BCB',
    description: 'Saldo das operações de crédito do Sistema Financeiro Nacional ao final do período.',
    methodology: 'Série 20539, recursos livres e direcionados. Saldo nominal em milhões de reais, não concessões do mês nem taxa de juros. A série 20727 usada no painel legado mede juros de cheque especial para pessoas jurídicas e não serve para este saldo.',
    keywords: ['credito', 'carteira', 'saldo', 'emprestimos'],
  },
  {
    id: 'br-inadimplencia', code: 21082, name: 'Inadimplência · crédito total', shortName: 'Inadimplência',
    topic: 'Credito', frequency: 'monthly', unit: '%', publisher: 'BCB',
    description: 'Percentual da carteira de crédito com pelo menos uma parcela em atraso superior a 90 dias.',
    methodology: 'Série 21082, total do Sistema Financeiro Nacional, recursos livres e direcionados. Mede participação no saldo da carteira, não percentual da população endividada nem número de contratos.',
    keywords: ['credito', 'atraso', 'divida', 'inadimplencia'],
  },
  {
    id: 'br-desemprego', code: 24369, name: 'Desemprego · PNAD Contínua', shortName: 'Desemprego',
    topic: 'Emprego', frequency: 'monthly', unit: '%', publisher: 'IBGE',
    description: 'Taxa de desocupação da PNAD Contínua, referente ao trimestre móvel encerrado no mês indicado.',
    methodology: 'Divulgação mensal com referência em trimestres móveis sobrepostos. Percentual das pessoas desocupadas na força de trabalho; não é percentual de toda a população. Pessoas fora da força de trabalho não entram no denominador.',
    keywords: ['desemprego', 'desocupacao', 'emprego', 'trabalho', 'pnad'],
  },
];

const explanations = {
  'br-incc-mensal': {
    measures: 'Acompanha a mudança dos custos de materiais, serviços e mão de obra da construção.',
    usefulness: 'Ajuda a acompanhar custos de obras e contratos que adotam a modalidade correspondente do INCC.',
    reading: 'Uma taxa mensal positiva indica aumento médio dos custos naquele mês. Não informa o custo total de construir um imóvel.',
    caution: 'INCC não é preço de venda de imóveis. Confirme a modalidade prevista no contrato; a série 192 não deve ser chamada de INCC-M (7456).',
  },
  'br-igpm-mensal': {
    measures: 'Reúne variações de preços ao produtor, ao consumidor e da construção.',
    usefulness: 'Ajuda a acompanhar preços mais amplos e contratos que escolhem o IGP-M como referência.',
    reading: 'O valor do card é a variação de um mês. Um valor negativo significa queda do índice no mês, não redução de todos os preços.',
    caution: 'Reajuste anual não é a soma nem a última taxa mensal. Depende do acumulado e das condições contratuais.',
  },
  'br-selic-meta': {
    measures: 'Mostra a meta de juros básicos definida pelo Comitê de Política Monetária.',
    usefulness: 'É uma referência para entender a política monetária e as condições de crédito e investimentos.',
    reading: 'A unidade é anual, embora a série tenha observações diárias. A meta permanece repetida enquanto não muda.',
    caution: 'Não é a taxa do seu empréstimo, a Selic efetiva nem uma rentabilidade líquida garantida.',
  },
  'br-ipca-mensal': {
    measures: 'Mede a mudança média de preços de uma cesta de consumo acompanhada pelo IBGE.',
    usefulness: 'É a referência oficial de inflação ao consumidor no Brasil.',
    reading: 'Mostra quanto o índice variou em relação ao mês anterior. O seu orçamento pessoal pode ter comportamento diferente.',
    caution: 'Inflação menor ainda pode significar preços subindo, só que mais devagar. Queda do índice é outra situação.',
  },
  'br-ipca-12m': {
    measures: 'Mostra a variação acumulada do IPCA em uma janela de doze meses.',
    usefulness: 'Permite acompanhar a inflação em uma perspectiva maior que a oscilação de um mês.',
    reading: 'Cada ponto cobre doze meses terminados na referência. As janelas consecutivas têm onze meses em comum.',
    caution: 'Não é previsão para os próximos doze meses nem a inflação específica de uma família.',
  },
  'br-usd-ptax-venda': {
    measures: 'Expressa quantos reais correspondem a um dólar na taxa de referência de venda.',
    usefulness: 'Ajuda a acompanhar o câmbio e contratos referenciados nessa cotação.',
    reading: 'Uma cotação maior significa mais reais por dólar. Não há divulgação em todos os dias.',
    caution: 'Não é o preço final da sua compra de moeda; bancos e corretoras acrescentam condições próprias.',
  },
  'br-cdi-diario': {
    measures: 'Mostra a taxa diária de referência das operações interfinanceiras disponibilizada pelo SGS.',
    usefulness: 'É uma referência usada por vários investimentos de renda fixa.',
    reading: 'O percentual mostrado é por dia, não por ano. O histórico preserva a unidade original.',
    caution: 'Um investimento que paga um percentual do CDI ainda tem prazo, risco, custos e eventual tributação.',
  },
  'br-ibc-br': {
    measures: 'Sintetiza informações de diferentes setores para acompanhar a atividade econômica mensal.',
    usefulness: 'Ajuda a observar a evolução da atividade entre as divulgações trimestrais do PIB.',
    reading: 'É um número-índice, não percentual nem valor em reais. Esta série não tem ajuste sazonal.',
    caution: 'Comparações entre meses podem refletir calendário e sazonalidade. Não é o PIB mensal.',
  },
  'br-eur-ptax-venda': {
    measures: 'Expressa quantos reais correspondem a um euro na taxa de referência de venda.',
    usefulness: 'Ajuda a acompanhar o custo de referência da moeda europeia.',
    reading: 'Uma cotação maior significa mais reais por euro. O card mostra a última observação disponível.',
    caution: 'PTAX não é cotação de turismo em tempo real nem o valor final de uma remessa.',
  },
  'br-ipca15-mensal': {
    measures: 'Acompanha preços ao consumidor em uma janela de coleta diferente da usada pelo IPCA.',
    usefulness: 'Oferece uma leitura adicional de inflação divulgada antes do IPCA do mesmo mês.',
    reading: 'É variação mensal de uma pesquisa própria. Diferenças para o IPCA não são necessariamente erros.',
    caution: 'Não é previsão exata do IPCA nem acumulado em doze meses.',
  },
  'br-pib-trimestral': {
    measures: 'Representa a evolução do volume produzido de bens e serviços finais na economia.',
    usefulness: 'Ajuda a entender a atividade econômica em trimestres, com uma medida mais ampla que indicadores setoriais.',
    reading: 'O valor é um índice de volume. Para calcular crescimento é necessário escolher a comparação e considerar o ajuste sazonal.',
    caution: 'Não leia 199 pontos como crescimento de 199%. Esta série é observada, sem ajuste sazonal, e pode ser revisada.',
  },
  'br-balanca-comercial': {
    measures: 'Subtrai importações de exportações de bens no conceito do balanço de pagamentos.',
    usefulness: 'Ajuda a acompanhar as trocas de bens do país com o exterior.',
    reading: 'Saldo positivo é superávit; negativo é déficit. A unidade é milhões de dólares no mês.',
    caution: 'Não inclui todos os serviços e rendas do exterior. Superávit sozinho não define uma economia como saudável.',
  },
  'br-reservas-internacionais': {
    measures: 'Mostra o estoque de ativos de reserva em moeda estrangeira da autoridade monetária.',
    usefulness: 'É uma das informações para analisar a liquidez externa e a capacidade de enfrentar choques.',
    reading: 'A unidade é milhões de dólares. É uma posição de estoque, não uma entrada mensal de dinheiro.',
    caution: 'Para avaliar suficiência são necessários outros dados. A variação não equivale automaticamente a compras ou vendas de dólares.',
  },
  'br-poupanca': {
    measures: 'Mostra a rentabilidade do período de depósitos sujeitos às regras vigentes desde maio de 2012.',
    usefulness: 'Ajuda a consultar a remuneração de referência da caderneta para o período e aniversário correspondentes.',
    reading: 'Apesar das observações diárias, a taxa é mensal. Datas distintas podem representar aniversários distintos.',
    caution: 'Não compare diretamente com CDI diário ou Selic anual. A remuneração efetiva depende das regras do depósito e do aniversário.',
  },
  'br-juros-credito-pf': {
    measures: 'Resume os juros das novas operações de crédito contratadas por pessoas físicas.',
    usefulness: 'Ajuda a acompanhar as condições médias de financiamento às famílias.',
    reading: 'A taxa é anual e a observação é mensal. A média reúne operações com características distintas.',
    caution: 'Não é orçamento de crédito nem custo efetivo total. Compare propostas por modalidade e CET, não apenas com esta média.',
  },
  'br-credito-total': {
    measures: 'Mostra quanto permanece em saldo nas operações de crédito do sistema financeiro.',
    usefulness: 'Ajuda a acompanhar o tamanho do crédito e sua evolução ao longo do tempo.',
    reading: 'É estoque nominal em milhões de reais ao final do período. Não é quanto foi emprestado apenas naquele mês.',
    caution: 'Aumento nominal não implica aumento real, nem informa sozinho se o crédito ficou mais acessível.',
  },
  'br-inadimplencia': {
    measures: 'Mede a parcela do saldo da carteira com atraso superior a noventa dias.',
    usefulness: 'Ajuda a acompanhar deterioração ou melhora no pagamento das operações de crédito.',
    reading: 'É percentual do saldo, não taxa de juros. Uma diferença entre percentuais é medida em pontos percentuais.',
    caution: 'Não é a proporção de brasileiros com dívidas, nem toda dívida é inadimplência.',
  },
  'br-desemprego': {
    measures: 'Mede a parcela da força de trabalho que está desocupada segundo os critérios da PNAD Contínua.',
    usefulness: 'Ajuda a acompanhar o mercado de trabalho junto com ocupação, renda e participação.',
    reading: 'Cada mês identifica o fim de um trimestre móvel. Janelas vizinhas compartilham dois meses.',
    caution: 'A taxa pode cair por diferentes motivos, inclusive saída da força de trabalho. Não mede toda a qualidade dos empregos.',
  },
};

export const catalog = definitions.map(item => Object.freeze({
  ...item,
  explanation: explanations[item.id],
  source: {
    id: 'bcb-sgs', name: 'Banco Central do Brasil · SGS', seriesCode: item.code,
    metadataUrl: metadataUrl(item.code),
    apiUrl: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${item.code}/dados`,
  },
}));

export function getIndicator(id) {
  return catalog.find(item => item.id === id);
}

const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function searchIndicators({ q = '', topic = '' } = {}) {
  const terms = normalize(q).trim().split(/\s+/).filter(Boolean);
  return catalog.filter(item => (!topic || normalize(item.topic) === normalize(topic))
    && terms.every(term => normalize([item.id, item.code, item.name, item.description, item.publisher, ...item.keywords].join(' ')).includes(term)));
}
