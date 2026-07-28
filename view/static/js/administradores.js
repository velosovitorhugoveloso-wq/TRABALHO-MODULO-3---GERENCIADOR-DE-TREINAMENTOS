let listaAdmins = [];

aplicarMascaraCPF(document.getElementById('aCpf'));
aplicarMascaraTelefone(document.getElementById('aTelefone'));
aplicarMascaraTelefone(document.getElementById('aWhatsapp'));

async function carregarAdmins() {
  const resp = await fetch('/api/adm');
  listaAdmins = await resp.json();
  renderizarTabelaAdm(listaAdmins);
}

function renderizarTabelaAdm(lista) {
  const corpo = document.getElementById('corpoTabelaAdm');
  const vazio = document.getElementById('vazioAdm');

  if (!lista.length) {
    corpo.innerHTML = '';
    vazio.style.display = 'block';
    return;
  }
  vazio.style.display = 'none';

  corpo.innerHTML = lista.map(a => {
    const souEu = window.SESSAO && window.SESSAO.id === a.ID_ADM;
    return `
    <tr>
      <td>${a.NOME_ADM}${souEu ? ' <span class="badge badge-roxo">Você</span>' : ''}</td>
      <td>${a.EMAIL_ADM}</td>
      <td class="acoes">
        <button class="btn btn-secondary btn-sm" onclick="verMaisAdm(${a.ID_ADM})">Ver mais</button>
        <button class="btn btn-secondary btn-sm" onclick="editarAdm(${a.ID_ADM})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="excluirAdm(${a.ID_ADM})" ${souEu ? 'disabled title="Você não pode excluir a própria conta"' : ''}>Excluir</button>
      </td>
    </tr>
  `;
  }).join('');
}

function verMaisAdm(id) {
  const a = listaAdmins.find(x => x.ID_ADM === id);
  if (!a) return;

  document.getElementById('detalheAdm').innerHTML = `
    <div class="detalhe-linha"><span class="detalhe-label">Nome</span><span>${a.NOME_ADM}</span></div>
    <div class="detalhe-linha"><span class="detalhe-label">E-mail</span><span>${a.EMAIL_ADM}</span></div>
    <div class="detalhe-linha"><span class="detalhe-label">CPF</span><span>${formatarCPF(a.CPF_ADM)}</span></div>
    <div class="detalhe-linha"><span class="detalhe-label">Telefone</span><span>${a.TELEFONE_ADM ? formatarTelefone(a.TELEFONE_ADM) : '-'}</span></div>
    <div class="detalhe-linha"><span class="detalhe-label">Cargo</span><span>${a.CARGO_ADM || '-'}</span></div>
    <div class="detalhe-linha"><span class="detalhe-label">Setor</span><span>${a.SETOR_ADM || '-'}</span></div>
  `;
  document.getElementById('modalVerMaisAdm').classList.add('aberto');
}

function fecharModalVerMaisAdm() {
  document.getElementById('modalVerMaisAdm').classList.remove('aberto');
}

document.getElementById('buscaAdm').addEventListener('input', (e) => {
  const termo = e.target.value.toLowerCase();
  const filtrada = listaAdmins.filter(a =>
    a.NOME_ADM.toLowerCase().includes(termo) ||
    a.EMAIL_ADM.toLowerCase().includes(termo) ||
    (a.CARGO_ADM || '').toLowerCase().includes(termo)
  );
  renderizarTabelaAdm(filtrada);
});

function abrirModalNovoAdm() {
  document.getElementById('modalAdmTitulo').innerText = 'Novo administrador';
  document.getElementById('formAdm').reset();
  document.getElementById('aId').value = '';
  document.getElementById('modalAdmAlert').innerHTML = '';
  document.getElementById('modalAdm').classList.add('aberto');
}

function editarAdm(id) {
  const a = listaAdmins.find(x => x.ID_ADM === id);
  if (!a) return;
  document.getElementById('modalAdmTitulo').innerText = 'Editar administrador';
  document.getElementById('modalAdmAlert').innerHTML = '';
  document.getElementById('aId').value = a.ID_ADM;
  document.getElementById('aNome').value = a.NOME_ADM;
  document.getElementById('aEmail').value = a.EMAIL_ADM;
  document.getElementById('aCpf').value = formatarCPF(a.CPF_ADM);
  document.getElementById('aTelefone').value = a.TELEFONE_ADM ? formatarTelefone(a.TELEFONE_ADM) : '';
  document.getElementById('aCargo').value = a.CARGO_ADM || '';
  document.getElementById('aSetor').value = a.SETOR_ADM || '';
  document.getElementById('aWhatsapp').value = a.WHATSAPP_ADM ? formatarTelefone(a.WHATSAPP_ADM) : '';
  document.getElementById('aSenha').value = '';
  document.getElementById('modalAdm').classList.add('aberto');
}

function fecharModalAdm() {
  document.getElementById('modalAdm').classList.remove('aberto');
}

document.getElementById('formAdm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('aId').value;
  const payload = {
    nome: document.getElementById('aNome').value,
    email: document.getElementById('aEmail').value,
    cpf: document.getElementById('aCpf').value,
    telefone: document.getElementById('aTelefone').value,
    cargo: document.getElementById('aCargo').value,
    setor: document.getElementById('aSetor').value,
    whatsapp: document.getElementById('aWhatsapp').value,
  };
  const senha = document.getElementById('aSenha').value;
  if (senha) payload.senha = senha;

  try {
    const resp = await fetch(id ? `/api/adm/${id}` : '/api/adm', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();

    if (!resp.ok) {
      const msg = data.erro || Object.values(data)[0] || 'Erro ao salvar';
      document.getElementById('modalAdmAlert').innerHTML = `<div class="alert alert-erro">${msg}</div>`;
      return;
    }

    fecharModalAdm();
    Toast.sucesso(id ? 'Administrador atualizado com sucesso!' : 'Administrador cadastrado com sucesso!');
    carregarAdmins();
  } catch (err) {
    document.getElementById('modalAdmAlert').innerHTML = `<div class="alert alert-erro">Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.</div>`;
  }
});

async function excluirAdm(id) {
  if (window.SESSAO && window.SESSAO.id === id) {
    Toast.erro('Você não pode excluir a própria conta enquanto está logado nela.');
    return;
  }

  const confirmou = await Notify.confirmar({
    titulo: 'Excluir administrador',
    mensagem: 'Tem certeza que deseja excluir este administrador? O registro poderá ser recuperado depois na Lixeira.',
    textoConfirmar: 'Excluir',
  });
  if (!confirmou) return;

  let resp;
  try {
    resp = await fetch(`/api/adm/${id}`, { method: 'DELETE' });
  } catch (err) {
    Toast.erro('Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.');
    return;
  }

  if (resp.ok) {
    Toast.sucesso('Administrador excluído com sucesso!');
    carregarAdmins();
    return;
  }

  const data = await resp.json();
  Toast.erro(data.erro || 'Não foi possível excluir o administrador. Tente novamente.');
}

carregarAdmins();
