// Guarda em memória a lista de todos os treinamentos cadastrados (vinda de /api/treinamentos).
let listaTreinamentos = [];
// Guarda em memória os registros de realização (tabela `relatorio`) do funcionário logado
// (vinda de /api/relatorio). É com base nela que calculamos se um treinamento está
// pendente, vencendo, vencido ou válido para o funcionário.
let meusRelatorios = [];

// formatarData() e statusPorVencimento() vêm de static/js/status-utils.js,
// carregado antes deste arquivo.

// Busca no backend a lista completa de treinamentos cadastrados e monta a tabela na tela.
// Se quem está logado for um funcionário, também busca o histórico dele antes de renderizar,
// pois a tabela de funcionário mostra um botão "Realizar" ou o status de validade.
async function carregarTreinamentos() {
  const resp = await fetch('/api/treinamentos');
  listaTreinamentos = await resp.json();

  if (window.SESSAO.tipo === 'funcionario') {
    await carregarMeusTreinamentos();
  }

  renderizarTabela(listaTreinamentos);
}

// Busca os registros de treinamentos já realizados pelo funcionário logado
// (GET /api/relatorio, que no backend já filtra pelo usuário da sessão) e atualiza
// a tabela "Meus treinamentos" com esses dados.
async function carregarMeusTreinamentos() {
  const resp = await fetch('/api/relatorio');
  meusRelatorios = await resp.json();
  renderizarMeusTreinamentos(meusRelatorios);
}

// Define o "badge" de status (Vencido / Vencendo / Válido) a partir da data de vencimento.
const statusPorData = statusPorVencimento;

function renderizarMeusTreinamentos(lista) {
  const corpo = document.getElementById('corpoMeusTreinamentos');
  const vazio = document.getElementById('vazioMeus');
  if (!corpo) return;

  if (!lista.length) {
    corpo.innerHTML = '';
    vazio.style.display = 'block';
    return;
  }
  vazio.style.display = 'none';

  corpo.innerHTML = lista.map(r => {
    const status = statusPorData(r.DATA_VENCIMENTO);
    return `
      <tr>
        <td>${r.NOME_NR}</td>
        <td>${formatarData(r.DATA_REALIZACAO)}</td>
        <td>${formatarData(r.DATA_VENCIMENTO)}</td>
        <td class="col-status"><span class="badge ${status.classe}">${status.texto}</span></td>
      </tr>
    `;
  }).join('');
}

// Verifica, para um treinamento específico, se o funcionário PODE realizá-lo agora.
// - Se não existe nenhum registro anterior para esse treinamento, ele está "pendente"
//   (nunca foi feito) e pode ser realizado a qualquer momento.
// - Se já existe um registro, só libera a realização quando faltarem 30 dias ou menos
//   para o vencimento (ou o vencimento já passou). Isso é o espelho, no front-end, da
//   mesma regra aplicada no backend em /api/funcionario/realizar-treinamento.
function statusRealizacao(idTrein) {
  const registros = meusRelatorios.filter(r => r.ID_TREIN === idTrein && r.DATA_VENCIMENTO);
  if (!registros.length) return { podeRealizar: true };

  // Pega o registro mais recente (maior data de vencimento) desse treinamento.
  const ultimo = registros.reduce((a, b) =>
    apenasData(a.DATA_VENCIMENTO) > apenasData(b.DATA_VENCIMENTO) ? a : b
  );
  const vencimentoISO = apenasData(ultimo.DATA_VENCIMENTO);
  // Data a partir da qual o funcionário já pode refazer o treinamento (30 dias antes de vencer).
  const liberacaoISO = somarDiasISO(vencimentoISO, -30);
  const [anoL, mesL, diaL] = liberacaoISO.split('-');

  return {
    podeRealizar: hojeISO() >= liberacaoISO,
    dataVencimento: ultimo.DATA_VENCIMENTO,
    dataLiberacaoStr: `${diaL}/${mesL}/${anoL}`
  };
}

// Desenha a tabela principal de treinamentos. O conteúdo muda de acordo com o tipo de usuário:
// - ADM vê botões de Editar/Excluir.
// - Funcionário vê o botão "Realizar" (quando pode realizar) ou um badge "Válido até ..."
//   (quando o treinamento ainda está dentro do prazo de validade).
function renderizarTabela(lista) {
  const corpo = document.getElementById('corpoTabela');
  const vazio = document.getElementById('vazio');

  if (!lista.length) {
    corpo.innerHTML = '';
    vazio.style.display = 'block';
    return;
  }
  vazio.style.display = 'none';

  if (window.SESSAO.tipo === 'adm') {
    corpo.innerHTML = lista.map(t => `
      <tr>
        <td>${t.NOME_NR}</td>
        <td>${t.VALIDADE_DIAS}</td>
        <td class="col-descricao"><span class="desc-truncada" title="${(t.DESCRICAO_NR || '').replace(/"/g, '&quot;')}">${t.DESCRICAO_NR || '-'}</span></td>
        <td class="acoes col-acoes-trein">
          <button class="btn btn-secondary btn-sm" onclick="editarTreinamento(${t.ID_TREIN})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="excluirTreinamento(${t.ID_TREIN})">Excluir</button>
        </td>
      </tr>
    `).join('');
  } else {
    corpo.innerHTML = lista.map(t => {
      const situacao = statusRealizacao(t.ID_TREIN);
      const acao = situacao.podeRealizar
        ? `<button class="btn btn-primary btn-sm" onclick="abrirModalRealizar(${t.ID_TREIN}, '${t.NOME_NR}')">Realizar</button>`
        : `<span class="badge badge-roxo" title="Você poderá refazer a partir de ${situacao.dataLiberacaoStr}">Válido até ${formatarData(situacao.dataVencimento)}</span>`;
      return `
        <tr>
          <td>${t.NOME_NR}</td>
          <td>${t.VALIDADE_DIAS}</td>
          <td class="col-descricao"><span class="desc-truncada" title="${(t.DESCRICAO_NR || '').replace(/"/g, '&quot;')}">${t.DESCRICAO_NR || '-'}</span></td>
          <td class="col-status">${acao}</td>
        </tr>
      `;
    }).join('');
  }
}

document.getElementById('busca').addEventListener('input', (e) => {
  const termo = e.target.value.toLowerCase();
  renderizarTabela(listaTreinamentos.filter(t => t.NOME_NR.toLowerCase().includes(termo)));
});

// ---------- ADM: CRUD ----------
function abrirModalNovo() {
  document.getElementById('modalTitulo').innerText = 'Novo treinamento';
  document.getElementById('formTreinamento').reset();
  document.getElementById('tId').value = '';
  document.getElementById('tDescricao').value = '';
  document.getElementById('modalAlert').innerHTML = '';
  document.getElementById('modal').classList.add('aberto');
}

function editarTreinamento(id) {
  const t = listaTreinamentos.find(x => x.ID_TREIN === id);
  if (!t) return;
  document.getElementById('modalTitulo').innerText = 'Editar treinamento';
  document.getElementById('modalAlert').innerHTML = '';
  document.getElementById('tId').value = t.ID_TREIN;
  document.getElementById('tNome').value = t.NOME_NR;
  document.getElementById('tValidade').value = t.VALIDADE_DIAS;
  document.getElementById('tDescricao').value = t.DESCRICAO_NR || '';
  document.getElementById('modal').classList.add('aberto');
}

function fecharModal() {
  document.getElementById('modal').classList.remove('aberto');
}

const formTreinamento = document.getElementById('formTreinamento');
if (formTreinamento) {
  formTreinamento.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('tId').value;
    const payload = {
      nome: document.getElementById('tNome').value,
      validade: parseInt(document.getElementById('tValidade').value, 10),
      descricao: document.getElementById('tDescricao').value
    };

    let resp, data;
    try {
      resp = await fetch(id ? `/api/treinamentos/${id}` : '/api/treinamentos', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      data = await resp.json();
    } catch (err) {
      document.getElementById('modalAlert').innerHTML = `<div class="alert alert-erro">Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.</div>`;
      return;
    }

    if (!resp.ok) {
      document.getElementById('modalAlert').innerHTML = `<div class="alert alert-erro">${data.erro || 'Não foi possível salvar o treinamento.'}</div>`;
      return;
    }

    fecharModal();
    Toast.sucesso(id ? 'Treinamento atualizado com sucesso!' : 'Treinamento cadastrado com sucesso!');
    carregarTreinamentos();
  });
}

async function excluirTreinamento(id, forcar = false) {
  if (!forcar) {
    const confirmou = await Notify.confirmar({
      titulo: 'Excluir treinamento',
      mensagem: 'Tem certeza que deseja excluir este treinamento? Essa ação não pode ser desfeita.',
      textoConfirmar: 'Excluir',
    });
    if (!confirmou) return;
  }

  let resp;
  try {
    resp = await fetch(`/api/treinamentos/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forcar })
    });
  } catch (err) {
    Toast.erro('Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.');
    return;
  }

  if (resp.ok) {
    Toast.sucesso('Treinamento excluído com sucesso!');
    carregarTreinamentos();
    return;
  }

  const data = await resp.json();

  if (resp.status === 409 && data.erro === 'vinculado') {
    const confirmou = await Notify.confirmar({
      titulo: 'Treinamento com registros vinculados',
      mensagem: data.mensagem,
      textoConfirmar: 'Excluir mesmo assim',
    });
    if (confirmou) excluirTreinamento(id, true);
    return;
  }

  Toast.erro(data.mensagem || data.erro || 'Não foi possível excluir o treinamento. Tente novamente.');
}

// ---------- FUNCIONÁRIO: Realizar treinamento ----------

// Abre o modal de confirmação, guardando o ID do treinamento que será realizado
// e montando a mensagem de confirmação com o nome do treinamento.
function abrirModalRealizar(id, nome) {
  document.getElementById('rId').value = id;
  document.getElementById('textoConfirmacao').innerText =
    `Confirmar a realização do treinamento "${nome}"? A data de hoje será registrada como data de realização.`;
  document.getElementById('modalRealizarAlert').innerHTML = '';
  document.getElementById('modalRealizar').classList.add('aberto');
}

// Fecha o modal de confirmação sem realizar o treinamento.
function fecharModalRealizar() {
  document.getElementById('modalRealizar').classList.remove('aberto');
}

// Envia ao backend a confirmação de que o funcionário realizou o treinamento.
// O backend (rota /api/funcionario/realizar-treinamento) é quem decide se cria um
// registro novo ou substitui (atualiza) o registro pendente/vencido já existente —
// aqui no front-end só disparamos a requisição e, se der certo, recarregamos a lista
// para que a tela reflita o novo status (treinamento deixa de aparecer como pendente).
async function confirmarRealizacao() {
  const id_trein = document.getElementById('rId').value;
  try {
    const resp = await fetch('/api/funcionario/realizar-treinamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_trein: parseInt(id_trein, 10) })
    });
    const data = await resp.json();

    if (!resp.ok) {
      // Erro de negócio (ex: treinamento ainda válido, faltando dados etc.) retornado pelo backend.
      document.getElementById('modalRealizarAlert').innerHTML = `<div class="alert alert-erro">${data.erro}</div>`;
      return;
    }

    // Sucesso: fecha o modal e recarrega os treinamentos/relatórios para atualizar a tela.
    fecharModalRealizar();
    Toast.sucesso('Treinamento registrado com sucesso!');
    carregarTreinamentos();
  } catch (err) {
    // Erro de rede/conexão (o fetch nem chegou a receber uma resposta do servidor).
    document.getElementById('modalRealizarAlert').innerHTML = `<div class="alert alert-erro">Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.</div>`;
  }
}

carregarTreinamentos();
