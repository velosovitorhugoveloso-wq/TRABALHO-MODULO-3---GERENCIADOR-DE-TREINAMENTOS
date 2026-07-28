// ============================================
// FILTRO POR DATA (compartilhado com dashboard-gerar.js)
// Filtra os relatórios pela data de REALIZAÇÃO do treinamento, dentro do
// intervalo [De, Até] escolhido pelo usuário. Quando os dois campos estão
// vazios, nenhum filtro é aplicado (mostra tudo).
// ============================================
function obterFiltroDatasDashboard() {
  const inicio = document.getElementById('filtroDataInicio')?.value || '';
  const fim = document.getElementById('filtroDataFim')?.value || '';
  return { inicio, fim };
}

function filtrarRelatoriosPorData(lista) {
  const { inicio, fim } = obterFiltroDatasDashboard();
  if (!inicio && !fim) return lista;
  return lista.filter(r => {
    const data = apenasData(r.DATA_REALIZACAO);
    if (!data) return false;
    if (inicio && data < inicio) return false;
    if (fim && data > fim) return false;
    return true;
  });
}

window.obterFiltroDatasDashboard = obterFiltroDatasDashboard;
window.filtrarRelatoriosPorData = filtrarRelatoriosPorData;

async function carregarStats() {
  const statsGrid = document.getElementById('statsGrid');
  if (!statsGrid) return;

  try {
    if (window.SESSAO.tipo === 'adm') {
      const [funcionarios, treinamentos, relatoriosBrutos] = await Promise.all([
        fetch('/api/funcionarios').then(r => r.json()),
        fetch('/api/treinamentos').then(r => r.json()),
        fetch('/api/relatorio').then(r => r.json())
      ]);
      const relatorios = filtrarRelatoriosPorData(relatoriosBrutos);

      const vencendo = relatorios.filter(r => statusPorVencimento(r.DATA_VENCIMENTO).chave === 'vencendo').length;
      const vencidos = relatorios.filter(r => statusPorVencimento(r.DATA_VENCIMENTO).chave === 'vencido').length;

      statsGrid.innerHTML = `
        ${statCard(funcionarios.length, 'Funcionários cadastrados')}
        ${statCard(treinamentos.length, 'Treinamentos (NRs) cadastrados')}
        ${statCard(vencendo, 'Vencendo em 30 dias')}
        ${statCard(vencidos, 'Treinamentos vencidos')}
      `;
    } else {
      const relatoriosBrutos = await fetch('/api/relatorio').then(r => r.json());
      const relatorios = filtrarRelatoriosPorData(relatoriosBrutos);
      const vencidos = relatorios.filter(r => statusPorVencimento(r.DATA_VENCIMENTO).chave === 'vencido').length;

      statsGrid.innerHTML = `
        ${statCard(relatorios.length, 'Treinamentos realizados')}
        ${statCard(vencidos, 'Treinamentos vencidos')}
      `;
    }
  } catch (e) {
    console.error('Erro ao carregar estatísticas', e);
  }
}

function statCard(numero, label) {
  return `<div class="stat-card"><div class="numero">${numero}</div><div class="label">${label}</div></div>`;
}

document.getElementById('filtroDashAplicar')?.addEventListener('click', () => {
  carregarStats();
  Toast.sucesso('Filtro aplicado!');
});

document.getElementById('filtroDashLimpar')?.addEventListener('click', () => {
  const campoInicio = document.getElementById('filtroDataInicio');
  const campoFim = document.getElementById('filtroDataFim');
  if (campoInicio) campoInicio.value = '';
  if (campoFim) campoFim.value = '';
  carregarStats();
});

carregarStats();
