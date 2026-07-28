let listaRelatorios = [];

// ============================================
// GRÁFICOS (Chart.js) — adicionado sem alterar o restante do arquivo
// ============================================
const PALETA_ROXA = ['#8b5cf6', '#6d28d9', '#a78bfa', '#c4b5fd', '#4c1d95', '#ede9fe'];
const graficosRelatoriosAtivos = {};

function destruirGraficoRelatorio(canvasId) {
  if (graficosRelatoriosAtivos[canvasId]) {
    graficosRelatoriosAtivos[canvasId].destroy();
    delete graficosRelatoriosAtivos[canvasId];
  }
}

function criarGraficoRelatorio(canvasId, config) {
  destruirGraficoRelatorio(canvasId);
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
  graficosRelatoriosAtivos[canvasId] = new Chart(ctx, config);
}

function renderizarGraficos(lista) {
  // ---- Gráfico 1: status geral (doughnut) ----
  const validos = lista.filter(r => statusPorData(r.DATA_VENCIMENTO).chave === 'valido').length;
  const vencendo = lista.filter(r => statusPorData(r.DATA_VENCIMENTO).chave === 'vencendo').length;
  const vencidos = lista.filter(r => statusPorData(r.DATA_VENCIMENTO).chave === 'vencido').length;

  criarGraficoRelatorio('graficoStatusRelatorios', {
    type: 'doughnut',
    data: {
      labels: ['Válidos', 'Vencendo em 30 dias', 'Vencidos'],
      datasets: [{ data: [validos, vencendo, vencidos], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }]
    },
    options: { plugins: { legend: { position: 'bottom' } } }
  });

  // ---- Gráfico 2: realizações por norma (NR) (barra) ----
  const contagemPorNR = {};
  lista.forEach(r => {
    const nome = r.NOME_NR || 'Não informado';
    contagemPorNR[nome] = (contagemPorNR[nome] || 0) + 1;
  });

  criarGraficoRelatorio('graficoPorNRRelatorios', {
    type: 'bar',
    data: {
      labels: Object.keys(contagemPorNR),
      datasets: [{ label: 'Realizações', data: Object.values(contagemPorNR), backgroundColor: PALETA_ROXA }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });

  // ---- Gráfico 3: realizações por mês (linha) ----
  const contagemPorMes = {};
  lista.forEach(r => {
    if (!r.DATA_REALIZACAO) return;
    const isoMatch = /^(\d{4})-(\d{2})/.exec(r.DATA_REALIZACAO);
    if (!isoMatch) return;
    const chave = `${isoMatch[2]}/${isoMatch[1]}`; // MM/AAAA
    contagemPorMes[chave] = (contagemPorMes[chave] || 0) + 1;
  });

  const mesesOrdenados = Object.keys(contagemPorMes).sort((a, b) => {
    const [ma, aa] = a.split('/');
    const [mb, ab] = b.split('/');
    return new Date(aa, ma - 1) - new Date(ab, mb - 1);
  });

  criarGraficoRelatorio('graficoPorMesRelatorios', {
    type: 'line',
    data: {
      labels: mesesOrdenados,
      datasets: [{
        label: 'Treinamentos realizados',
        data: mesesOrdenados.map(m => contagemPorMes[m]),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

// formatarData() e statusPorData() (aqui statusPorVencimento) agora vêm
// de static/js/status-utils.js, carregado antes deste arquivo — evita
// duplicação e o antigo bug de fuso horário na comparação de datas.
const statusPorData = statusPorVencimento;

async function carregarRelatorios() {
  const resp = await fetch('/api/relatorio');
  listaRelatorios = await resp.json();
  renderizarStats(listaRelatorios);
  renderizarGraficos(listaRelatorios);
  aplicarFiltros();
}

function renderizarStats(lista) {
  const total = lista.length;
  const vencidos = lista.filter(r => statusPorData(r.DATA_VENCIMENTO).chave === 'vencido').length;
  const vencendo = lista.filter(r => statusPorData(r.DATA_VENCIMENTO).chave === 'vencendo').length;
  const validos = lista.filter(r => statusPorData(r.DATA_VENCIMENTO).chave === 'valido').length;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="numero">${total}</div><div class="label">Total de treinamentos realizados</div></div>
    <div class="stat-card"><div class="numero">${validos}</div><div class="label">Válidos</div></div>
    <div class="stat-card"><div class="numero">${vencendo}</div><div class="label">Vencendo em 30 dias</div></div>
    <div class="stat-card"><div class="numero">${vencidos}</div><div class="label">Vencidos</div></div>
  `;
}

function renderizarTabela(lista) {
  const corpo = document.getElementById('corpoTabela');
  const vazio = document.getElementById('vazio');

  if (!lista.length) {
    corpo.innerHTML = '';
    vazio.style.display = 'block';
    return;
  }
  vazio.style.display = 'none';

  const ehAdm = window.SESSAO && window.SESSAO.tipo === 'adm';

  corpo.innerHTML = lista.map(r => {
    const status = statusPorData(r.DATA_VENCIMENTO);
    const colunaFuncionario = ehAdm ? `<td>${r.NOME_FUN || '-'}</td>` : '';
    const colunaAcoes = ehAdm
      ? `<td class="acoes"><button class="btn btn-danger btn-sm" onclick="excluirRelatorio(${r.ID_REL})">Excluir</button></td>`
      : '';
    return `
      <tr>
        ${colunaFuncionario}
        <td>${r.NOME_NR || '-'}</td>
        <td>${formatarData(r.DATA_REALIZACAO)}</td>
        <td>${formatarData(r.DATA_VENCIMENTO)}</td>
        <td><span class="badge ${status.classe}">${status.texto}</span></td>
        ${colunaAcoes}
      </tr>
    `;
  }).join('');
}

// Exclui um registro de relatório (histórico de realização de treinamento) específico.
// Move o registro para a lixeira no backend (permitindo restauração posterior) e
// recarrega a lista para refletir a exclusão na tela.
async function excluirRelatorio(id) {
  const confirmou = await Notify.confirmar({
    titulo: 'Excluir relatório',
    mensagem: 'Tem certeza que deseja excluir este relatório? Essa ação não pode ser desfeita.',
    textoConfirmar: 'Excluir',
  });
  if (!confirmou) return;

  let resp;
  try {
    resp = await fetch(`/api/relatorio/${id}`, { method: 'DELETE' });
  } catch (err) {
    Toast.erro('Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.');
    return;
  }

  if (resp.ok) {
    Toast.sucesso('Relatório excluído com sucesso!');
    carregarRelatorios();
    return;
  }

  const data = await resp.json().catch(() => ({}));
  Toast.erro(data.mensagem || data.erro || 'Não foi possível excluir o relatório. Tente novamente.');
}

function aplicarFiltros() {
  const termo = document.getElementById('busca').value.toLowerCase();
  const statusFiltro = document.getElementById('filtroStatus').value;

  const filtrada = listaRelatorios.filter(r => {
    const bateTermo = (r.NOME_FUN || '').toLowerCase().includes(termo) ||
                       (r.NOME_NR || '').toLowerCase().includes(termo);
    const bateStatus = !statusFiltro || statusPorData(r.DATA_VENCIMENTO).chave === statusFiltro;
    return bateTermo && bateStatus;
  });

  renderizarTabela(filtrada);
}

document.getElementById('busca').addEventListener('input', aplicarFiltros);
document.getElementById('filtroStatus').addEventListener('change', aplicarFiltros);

// ============================================
// EXPORTAÇÃO (PDF / Excel-XLSX / CSV)
// Baixa o arquivo gerado no backend (/api/relatorio/<formato>), já aplicando
// os mesmos filtros de busca/status que estão ativos na tela. Cada formato
// tem sua própria rota no backend, mas os 3 usam os mesmos parâmetros.
// ============================================
function exportarRelatorios(formato) {
  const termo = document.getElementById('busca').value.trim();
  const statusFiltro = document.getElementById('filtroStatus').value;

  const params = new URLSearchParams();
  if (termo) params.set('termo', termo);
  if (statusFiltro) params.set('status', statusFiltro);

  window.location.href = `/api/relatorio/${formato}?${params.toString()}`;
}

// ---- Controle do menu suspenso "Exportar" (abre/fecha, escolhe o formato) ----
const btnExportar = document.getElementById('btnExportar');
const exportMenu = document.getElementById('exportMenu');
const exportDropdown = document.getElementById('exportDropdown');

function fecharMenuExportar() {
  if (!exportMenu) return;
  exportMenu.classList.remove('aberta');
  btnExportar.setAttribute('aria-expanded', 'false');
}

if (btnExportar && exportMenu) {
  // Clique no botão "Exportar ▾": alterna (abre/fecha) o menu.
  btnExportar.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrindo = !exportMenu.classList.contains('aberta');
    exportMenu.classList.toggle('aberta', abrindo);
    btnExportar.setAttribute('aria-expanded', abrindo ? 'true' : 'false');
  });

  // Clique em uma das opções (PDF/XLSX/CSV): dispara a exportação e fecha o menu.
  exportMenu.querySelectorAll('.export-opcao').forEach(opcao => {
    opcao.addEventListener('click', () => {
      exportarRelatorios(opcao.dataset.formato);
      fecharMenuExportar();
    });
  });

  // Clique fora do dropdown fecha o menu; tecla Esc também fecha.
  document.addEventListener('click', (e) => {
    if (exportDropdown && !exportDropdown.contains(e.target)) fecharMenuExportar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharMenuExportar();
  });
}

if (window.chartJSPronto) {
  window.chartJSPronto.catch(() => {}).finally(carregarRelatorios);
} else {
  carregarRelatorios();
}
