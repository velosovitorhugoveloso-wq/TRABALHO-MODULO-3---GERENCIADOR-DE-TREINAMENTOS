// ============================================
// CARREGADOR DO CHART.JS COM FALLBACK ENTRE CDNs
// Tenta múltiplas fontes (útil quando um CDN está bloqueado
// pela rede/firewall da empresa). Expõe window.chartJSPronto,
// uma Promise que resolve quando o Chart.js está disponível
// (ou é rejeitada se nenhuma fonte funcionar).
// ============================================
(function () {
  const FONTES = [
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
    'https://unpkg.com/chart.js@4.4.4/dist/chart.umd.min.js'
  ];

  function carregarScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Falha ao carregar ' + url));
      document.head.appendChild(script);
    });
  }

  async function carregarChartJS() {
    for (const url of FONTES) {
      if (typeof Chart !== 'undefined') return;
      try {
        await carregarScript(url);
        if (typeof Chart !== 'undefined') return;
      } catch (e) {
        console.warn('Não foi possível carregar o Chart.js de', url);
      }
    }
    throw new Error('Não foi possível carregar o Chart.js de nenhuma fonte (verifique a conexão/firewall).');
  }

  window.chartJSPronto = carregarChartJS();
})();
