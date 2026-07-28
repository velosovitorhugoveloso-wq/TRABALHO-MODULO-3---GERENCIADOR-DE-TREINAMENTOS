let listaLixeira = [];

function formatarDataHora(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

// Monta uma descrição amigável do registro a partir do JSON salvo na lixeira,
// já que cada tabela de origem guarda campos diferentes.
function descreverItemLixeira(item) {
  const d = item.DADOS || {};
  switch (item.TABELA_ORIGEM) {
    case 'funcionarios':
      return `${d.NOME_FUN || 'Sem nome'} — ${d.EMAIL_FUN || ''}`;
    case 'adm':
      return `${d.NOME_ADM || 'Sem nome'} — ${d.EMAIL_ADM || ''}`;
    case 'treinamentos':
      return `${d.NOME_NR || 'Sem nome'}`;
    case 'relatorio':
      return `Registro #${d.ID_REL || item.ID_ORIGINAL} (vencimento ${d.DATA_VENCIMENTO || '-'})`;
    default:
      return `Registro #${item.ID_ORIGINAL}`;
  }
}

function termoBuscaItem(item) {
  const d = item.DADOS || {};
  return [
    item.TABELA_ORIGEM_LABEL, d.NOME_FUN, d.EMAIL_FUN, d.NOME_ADM, d.EMAIL_ADM, d.NOME_NR
  ].filter(Boolean).join(' ').toLowerCase();
}

async function carregarLixeira() {
  const resp = await fetch('/api/lixeira');
  listaLixeira = await resp.json();
  aplicarFiltrosLixeira();
}

function renderizarTabelaLixeira(lista) {
  const corpo = document.getElementById('corpoTabelaLixeira');
  const vazio = document.getElementById('vazioLixeira');

  if (!lista.length) {
    corpo.innerHTML = '';
    vazio.style.display = 'block';
    return;
  }
  vazio.style.display = 'none';

  corpo.innerHTML = lista.map(item => `
    <tr>
      <td><span class="badge badge-roxo">${item.TABELA_ORIGEM_LABEL}</span></td>
      <td>${descreverItemLixeira(item)}</td>
      <td>${formatarDataHora(item.DATA_EXCLUSAO)}</td>
      <td>${item.EXCLUIDO_POR || '-'}</td>
      <td class="acoes">
        <button class="btn btn-primary btn-sm" onclick="restaurarItemLixeira(${item.ID_LIXEIRA})">Restaurar</button>
        <button class="btn btn-danger btn-sm" onclick="excluirDefinitivoLixeira(${item.ID_LIXEIRA})">Excluir definitivo</button>
      </td>
    </tr>
  `).join('');
}

function aplicarFiltrosLixeira() {
  const termo = (document.getElementById('buscaLixeira').value || '').toLowerCase();
  const tipo = document.getElementById('filtroTipoLixeira').value;

  const filtrada = listaLixeira.filter(item => {
    if (tipo && item.TABELA_ORIGEM !== tipo) return false;
    if (termo && !termoBuscaItem(item).includes(termo)) return false;
    return true;
  });
  renderizarTabelaLixeira(filtrada);
}

document.getElementById('buscaLixeira').addEventListener('input', aplicarFiltrosLixeira);
document.getElementById('filtroTipoLixeira').addEventListener('change', aplicarFiltrosLixeira);

async function restaurarItemLixeira(id) {
  const confirmou = await Notify.confirmar({
    titulo: 'Restaurar registro',
    mensagem: 'Deseja restaurar este registro para o sistema?',
    textoConfirmar: 'Restaurar',
  });
  if (!confirmou) return;

  let resp;
  try {
    resp = await fetch(`/api/lixeira/${id}/restaurar`, { method: 'POST' });
  } catch (err) {
    Toast.erro('Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.');
    return;
  }

  const data = await resp.json();
  if (resp.ok) {
    Toast.sucesso(data.mensagem || 'Registro restaurado com sucesso!');
    carregarLixeira();
    return;
  }
  Toast.erro(data.erro || 'Não foi possível restaurar este item.');
}

async function excluirDefinitivoLixeira(id) {
  const confirmou = await Notify.confirmar({
    titulo: 'Excluir definitivamente',
    mensagem: 'Esta ação remove o registro da lixeira para sempre e ele não poderá mais ser recuperado. Deseja continuar?',
    textoConfirmar: 'Excluir definitivamente',
  });
  if (!confirmou) return;

  let resp;
  try {
    resp = await fetch(`/api/lixeira/${id}`, { method: 'DELETE' });
  } catch (err) {
    Toast.erro('Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.');
    return;
  }

  if (resp.ok) {
    Toast.sucesso('Item excluído definitivamente.');
    carregarLixeira();
    return;
  }
  const data = await resp.json();
  Toast.erro(data.erro || 'Não foi possível excluir este item.');
}

carregarLixeira();
