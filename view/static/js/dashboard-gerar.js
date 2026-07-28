// ============================================
// GERAÇÃO DE DASHBOARDS (Geral e de Funcionários)
// ============================================

// formatarData() vem de static/js/status-utils.js (carregado antes deste arquivo).
const formatarDataBR = formatarData;

// statusPorVencimento() vem de static/js/status-utils.js (carregado antes
// deste arquivo) — evita duplicação e o antigo bug de fuso horário.
function statusTreinamento(dataVencimento) {
  return statusPorVencimento(dataVencimento).chave || 'sem_data';
}

function fecharModalDash(id) {
  document.getElementById(id).classList.remove('aberto');
}

const graficosAtivos = {};
function destruirGrafico(id) {
  if (graficosAtivos[id]) {
    graficosAtivos[id].destroy();
    delete graficosAtivos[id];
  }
}

function criarGrafico(canvasId, config) {
  destruirGrafico(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (typeof Chart === 'undefined') {
    const card = ctx.closest('.dash-chart-card');
    if (card && !card.querySelector('.dash-erro')) {
      const aviso = document.createElement('p');
      aviso.className = 'dash-erro';
      aviso.style.cssText = 'color:var(--vermelho);font-size:12.5px;margin-top:8px;';
      aviso.textContent = 'Não conseguimos carregar os gráficos agora. Verifique sua conexão com a internet e tente novamente em instantes.';
      card.appendChild(aviso);
    }
    return;
  }
  graficosAtivos[canvasId] = new Chart(ctx, config);
}

const PALETA_ROXA = ['#8b5cf6', '#6d28d9', '#a78bfa', '#c4b5fd', '#4c1d95', '#ede9fe'];

// ---------- DASHBOARD GERAL (somente ADM) ----------
async function abrirDashboardGeral() {
  const modal = document.getElementById('modalDashboardGeral');
  const conteudo = document.getElementById('dashGeralConteudo');
  modal.classList.add('aberto');
  conteudo.className = 'dash-loading';
  conteudo.innerHTML = 'Carregando dados...';

  if (window.chartJSPronto) await window.chartJSPronto.catch(() => {});

  try {
    const [funcionarios, treinamentos, relatoriosBrutos] = await Promise.all([
      fetch('/api/funcionarios').then(r => r.json()),
      fetch('/api/treinamentos').then(r => r.json()),
      fetch('/api/relatorio').then(r => r.json())
    ]);
    const relatorios = filtrarRelatoriosPorData(relatoriosBrutos);

    const vencidos = relatorios.filter(r => statusTreinamento(r.DATA_VENCIMENTO) === 'vencido').length;
    const vencendo = relatorios.filter(r => statusTreinamento(r.DATA_VENCIMENTO) === 'vencendo').length;
    const validos = relatorios.filter(r => statusTreinamento(r.DATA_VENCIMENTO) === 'valido').length;

    const contagemPorNR = {};
    relatorios.forEach(r => {
      const nome = r.NOME_NR || 'Não informado';
      contagemPorNR[nome] = (contagemPorNR[nome] || 0) + 1;
    });

    conteudo.className = '';
    conteudo.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="numero">${funcionarios.length}</div><div class="label">Funcionários cadastrados</div></div>
        <div class="stat-card"><div class="numero">${treinamentos.length}</div><div class="label">Treinamentos (NRs) cadastrados</div></div>
        <div class="stat-card"><div class="numero">${relatorios.length}</div><div class="label">Realizações registradas</div></div>
        <div class="stat-card"><div class="numero">${vencidos}</div><div class="label">Vencidos</div></div>
      </div>
      <div class="dash-grid">
        <div class="dash-chart-card">
          <h4>Status dos treinamentos realizados</h4>
          <canvas id="graficoStatusGeral"></canvas>
        </div>
        <div class="dash-chart-card">
          <h4>Realizações por norma (NR)</h4>
          <canvas id="graficoPorNR"></canvas>
        </div>
      </div>
    `;

    criarGrafico('graficoStatusGeral', {
      type: 'doughnut',
      data: {
        labels: ['Válidos', 'Vencendo em 30 dias', 'Vencidos'],
        datasets: [{ data: [validos, vencendo, vencidos], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }]
      },
      options: { plugins: { legend: { position: 'bottom' } } }
    });

    criarGrafico('graficoPorNR', {
      type: 'bar',
      data: {
        labels: Object.keys(contagemPorNR),
        datasets: [{ label: 'Realizações', data: Object.values(contagemPorNR), backgroundColor: PALETA_ROXA }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });

  } catch (e) {
    conteudo.className = 'dash-loading';
    conteudo.innerHTML = 'Não conseguimos carregar o dashboard geral agora. Tente novamente em instantes.';
    console.error(e);
  }
}

// ---------- DASHBOARD DE FUNCIONÁRIOS (ADM e Funcionário) ----------
async function abrirDashboardFuncionarios() {
  const modal = document.getElementById('modalDashboardFuncionarios');
  const conteudo = document.getElementById('dashFuncConteudo');
  modal.classList.add('aberto');
  conteudo.className = 'dash-loading';
  conteudo.innerHTML = 'Carregando dados...';

  if (window.chartJSPronto) await window.chartJSPronto.catch(() => {});

  try {
    if (window.SESSAO.tipo === 'adm') {
      await montarDashboardFuncionariosAdm(conteudo);
    } else {
      await montarDashboardFuncionarioIndividual(conteudo);
    }
  } catch (e) {
    conteudo.className = 'dash-loading';
    conteudo.innerHTML = 'Não conseguimos carregar o dashboard de funcionários agora. Tente novamente em instantes.';
    console.error(e);
  }
}

async function montarDashboardFuncionariosAdm(conteudo) {
  const [funcionarios, relatoriosBrutos] = await Promise.all([
    fetch('/api/funcionarios').then(r => r.json()),
    fetch('/api/relatorio').then(r => r.json())
  ]);
  const relatorios = filtrarRelatoriosPorData(relatoriosBrutos);

  const porFuncionario = {};
  funcionarios.forEach(f => { porFuncionario[f.NOME_FUN] = { total: 0, vencidos: 0 }; });
  relatorios.forEach(r => {
    const nome = r.NOME_FUN || 'Não informado';
    if (!porFuncionario[nome]) porFuncionario[nome] = { total: 0, vencidos: 0 };
    porFuncionario[nome].total += 1;
    if (statusTreinamento(r.DATA_VENCIMENTO) === 'vencido') porFuncionario[nome].vencidos += 1;
  });

  const nomes = Object.keys(porFuncionario);
  const linhasTabela = nomes.map(nome => `
    <tr>
      <td>${nome}</td>
      <td>${porFuncionario[nome].total}</td>
      <td>${porFuncionario[nome].vencidos > 0
        ? `<span class="badge badge-vermelho">${porFuncionario[nome].vencidos} vencido(s)</span>`
        : '<span class="badge badge-verde">Em dia</span>'}</td>
    </tr>
  `).join('');

  conteudo.className = '';
  conteudo.innerHTML = `
    <div class="dash-grid">
      <div class="dash-chart-card">
        <h4>Treinamentos realizados por funcionário</h4>
        <canvas id="graficoFuncionarios"></canvas>
      </div>
      <div class="dash-chart-card">
        <h4>Situação por funcionário</h4>
        <table>
          <thead><tr><th>Funcionário</th><th>Realizados</th><th>Situação</th></tr></thead>
          <tbody>${linhasTabela || '<tr><td colspan="3">Nenhum dado encontrado.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;

  criarGrafico('graficoFuncionarios', {
    type: 'bar',
    data: {
      labels: nomes,
      datasets: [{ label: 'Treinamentos realizados', data: nomes.map(n => porFuncionario[n].total), backgroundColor: PALETA_ROXA }]
    },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

async function montarDashboardFuncionarioIndividual(conteudo) {
  const relatoriosBrutos = await fetch('/api/relatorio').then(r => r.json());
  const relatorios = filtrarRelatoriosPorData(relatoriosBrutos);

  const vencidos = relatorios.filter(r => statusTreinamento(r.DATA_VENCIMENTO) === 'vencido').length;
  const vencendo = relatorios.filter(r => statusTreinamento(r.DATA_VENCIMENTO) === 'vencendo').length;
  const validos = relatorios.filter(r => statusTreinamento(r.DATA_VENCIMENTO) === 'valido').length;

  const linhas = relatorios.map(r => `
    <tr>
      <td>${r.NOME_NR || '-'}</td>
      <td>${formatarDataBR(r.DATA_REALIZACAO)}</td>
      <td>${formatarDataBR(r.DATA_VENCIMENTO)}</td>
    </tr>
  `).join('');

  conteudo.className = '';
  conteudo.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="numero">${relatorios.length}</div><div class="label">Treinamentos realizados</div></div>
      <div class="stat-card"><div class="numero">${validos}</div><div class="label">Válidos</div></div>
      <div class="stat-card"><div class="numero">${vencendo}</div><div class="label">Vencendo em 30 dias</div></div>
      <div class="stat-card"><div class="numero">${vencidos}</div><div class="label">Vencidos</div></div>
    </div>
    <div class="dash-grid">
      <div class="dash-chart-card">
        <h4>Minha situação</h4>
        <canvas id="graficoMeuStatus"></canvas>
      </div>
      <div class="dash-chart-card">
        <h4>Meus treinamentos</h4>
        <table>
          <thead><tr><th>Treinamento</th><th>Realizado em</th><th>Vencimento</th></tr></thead>
          <tbody>${linhas || '<tr><td colspan="3">Nenhum treinamento realizado ainda.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;

  criarGrafico('graficoMeuStatus', {
    type: 'doughnut',
    data: {
      labels: ['Válidos', 'Vencendo em 30 dias', 'Vencidos'],
      datasets: [{ data: [validos, vencendo, vencidos], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }]
    },
    options: { plugins: { legend: { position: 'bottom' } } }
  });
}
