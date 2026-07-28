let listaFuncionarios = [];

aplicarMascaraCPF(document.getElementById('fCpf'));
aplicarMascaraTelefone(document.getElementById('fTelefone'));
aplicarMascaraTelefone(document.getElementById('fWhatsapp'));

async function carregarFuncionarios() {
  const resp = await fetch('/api/funcionarios');
  listaFuncionarios = await resp.json();
  renderizarTabela(listaFuncionarios);
}

// Mapa de status (calculado no backend em /api/funcionarios) para a bolinha
// colorida exibida na coluna "Situação", com base nos treinamentos que o
// funcionário JÁ REALIZOU: verde = todos os que ele possui estão em dia,
// amarelo = tem algum vencendo nos próximos 30 dias, vermelho = tem algum
// vencido, sem_dados = ele ainda não realizou nenhum treinamento.
const SITUACAO_INFO = {
  verde: { classe: 'status-dot-verde', texto: 'Em dia' },
  amarelo: { classe: 'status-dot-amarelo', texto: 'Pendente' },
  vermelho: { classe: 'status-dot-vermelho', texto: 'Vencido' },
  sem_dados: { classe: 'status-dot-cinza', texto: 'Sem treinamentos cadastrados' },
};

function renderizarTabela(lista) {
  const corpo = document.getElementById('corpoTabela');
  const vazio = document.getElementById('vazio');

  if (!lista.length) {
    corpo.innerHTML = '';
    vazio.style.display = 'block';
    return;
  }
  vazio.style.display = 'none';

  corpo.innerHTML = lista.map(f => {
    const situacao = SITUACAO_INFO[f.STATUS_GERAL] || SITUACAO_INFO.sem_dados;
    return `
    <tr>
      <td>${f.NOME_FUN}</td>
      <td>
        <span class="status-linha" title="${situacao.texto}">
          <span class="status-dot ${situacao.classe}"></span>${situacao.texto}
        </span>
      </td>
      <td class="acoes">
        <button class="btn btn-secondary btn-sm" onclick="verMaisFuncionario(${f.ID_FUN})">Ver mais</button>
        <button class="btn btn-secondary btn-sm" onclick="editarFuncionario(${f.ID_FUN})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="excluirFuncionario(${f.ID_FUN})">Excluir</button>
      </td>
    </tr>
  `;
  }).join('');
}

// Abre um modal somente leitura com os dados completos do funcionário
// (e-mail, CPF, telefone, cargo, setor e situação dos treinamentos), que
// deixaram de aparecer direto na tabela para simplificar a listagem.
function verMaisFuncionario(id) {
  const f = listaFuncionarios.find(x => x.ID_FUN === id);
  if (!f) return;

  const situacao = SITUACAO_INFO[f.STATUS_GERAL] || SITUACAO_INFO.sem_dados;

  document.getElementById('detalheFuncionario').innerHTML = `
    <div class="detalhe-linha"><span class="detalhe-label">Nome</span><span>${f.NOME_FUN}</span></div>
    <div class="detalhe-linha"><span class="detalhe-label">E-mail</span><span>${f.EMAIL_FUN}</span></div>
    <div class="detalhe-linha"><span class="detalhe-label">CPF</span><span>${formatarCPF(f.CPF_FUN)}</span></div>
    <div class="detalhe-linha"><span class="detalhe-label">Telefone</span><span>${f.TELEFONE_FUN ? formatarTelefone(f.TELEFONE_FUN) : '-'}</span></div>
    <div class="detalhe-linha"><span class="detalhe-label">Cargo</span><span>${f.CARGO_FUN || '-'}</span></div>
    <div class="detalhe-linha"><span class="detalhe-label">Setor</span><span>${f.SETOR_FUN || '-'}</span></div>
    <div class="detalhe-linha">
      <span class="detalhe-label">Situação</span>
      <span class="status-linha"><span class="status-dot ${situacao.classe}"></span>${situacao.texto}</span>
    </div>
  `;
  document.getElementById('modalVerMais').classList.add('aberto');
}

function fecharModalVerMais() {
  document.getElementById('modalVerMais').classList.remove('aberto');
}

document.getElementById('busca').addEventListener('input', (e) => {
  const termo = e.target.value.toLowerCase();
  const filtrada = listaFuncionarios.filter(f =>
    f.NOME_FUN.toLowerCase().includes(termo) ||
    f.EMAIL_FUN.toLowerCase().includes(termo) ||
    (f.CARGO_FUN || '').toLowerCase().includes(termo)
  );
  renderizarTabela(filtrada);
});

function abrirModalNovo() {
  document.getElementById('modalTitulo').innerText = 'Novo funcionário';
  document.getElementById('formFuncionario').reset();
  document.getElementById('fId').value = '';
  document.getElementById('modalAlert').innerHTML = '';
  document.getElementById('modal').classList.add('aberto');
}

function editarFuncionario(id) {
  const f = listaFuncionarios.find(x => x.ID_FUN === id);
  if (!f) return;
  document.getElementById('modalTitulo').innerText = 'Editar funcionário';
  document.getElementById('modalAlert').innerHTML = '';
  document.getElementById('fId').value = f.ID_FUN;
  document.getElementById('fNome').value = f.NOME_FUN;
  document.getElementById('fEmail').value = f.EMAIL_FUN;
  document.getElementById('fCpf').value = formatarCPF(f.CPF_FUN);
  document.getElementById('fTelefone').value = f.TELEFONE_FUN ? formatarTelefone(f.TELEFONE_FUN) : '';
  document.getElementById('fCargo').value = f.CARGO_FUN || '';
  document.getElementById('fSetor').value = f.SETOR_FUN || '';
  document.getElementById('fWhatsapp').value = f.WHATSAPP_FUN ? formatarTelefone(f.WHATSAPP_FUN) : '';
  document.getElementById('fSenha').value = '';
  document.getElementById('modal').classList.add('aberto');
}

function fecharModal() {
  document.getElementById('modal').classList.remove('aberto');
}

document.getElementById('formFuncionario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('fId').value;
  const payload = {
    nome: document.getElementById('fNome').value,
    email: document.getElementById('fEmail').value,
    cpf: document.getElementById('fCpf').value,
    telefone: document.getElementById('fTelefone').value,
    cargo: document.getElementById('fCargo').value,
    setor: document.getElementById('fSetor').value,
    whatsapp: document.getElementById('fWhatsapp').value,
  };
  const senha = document.getElementById('fSenha').value;
  if (senha) payload.senha = senha;

  try {
    const resp = await fetch(id ? `/api/funcionarios/${id}` : '/api/funcionarios', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();

    if (!resp.ok) {
      const msg = data.erro || Object.values(data)[0] || 'Erro ao salvar';
      document.getElementById('modalAlert').innerHTML = `<div class="alert alert-erro">${msg}</div>`;
      return;
    }

    fecharModal();
    Toast.sucesso(id ? 'Funcionário atualizado com sucesso!' : 'Funcionário cadastrado com sucesso!');
    carregarFuncionarios();
  } catch (err) {
    document.getElementById('modalAlert').innerHTML = `<div class="alert alert-erro">Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.</div>`;
  }
});

async function excluirFuncionario(id, forcar = false) {
  if (!forcar) {
    const confirmou = await Notify.confirmar({
      titulo: 'Excluir funcionário',
      mensagem: 'Tem certeza que deseja excluir este funcionário? Essa ação não pode ser desfeita.',
      textoConfirmar: 'Excluir',
    });
    if (!confirmou) return;
  }

  let resp;
  try {
    resp = await fetch(`/api/funcionarios/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forcar })
    });
  } catch (err) {
    Toast.erro('Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.');
    return;
  }

  if (resp.ok) {
    Toast.sucesso('Funcionário excluído com sucesso!');
    carregarFuncionarios();
    return;
  }

  const data = await resp.json();

  if (resp.status === 409 && data.erro === 'vinculado') {
    const confirmou = await Notify.confirmar({
      titulo: 'Funcionário com registros vinculados',
      mensagem: data.mensagem,
      textoConfirmar: 'Excluir mesmo assim',
    });
    if (confirmou) excluirFuncionario(id, true);
    return;
  }

  Toast.erro(data.mensagem || data.erro || 'Não foi possível excluir o funcionário. Tente novamente.');
}

carregarFuncionarios();
