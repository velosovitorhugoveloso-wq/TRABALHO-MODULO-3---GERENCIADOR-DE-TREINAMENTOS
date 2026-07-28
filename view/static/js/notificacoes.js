// ---------- ENVIO DE NOTIFICAÇÃO INDIVIDUAL/GERAL PELO SISTEMA ----------

const selDestino = document.getElementById('nDestino');
const grupoFuncionario = document.getElementById('grupoFuncionarioEspecifico');
const selFuncionario = document.getElementById('nFuncionario');

// Carrega a lista de funcionários no select "Funcionário específico".
async function carregarFuncionariosParaNotificacao() {
  try {
    const resp = await fetch('/api/funcionarios');
    const lista = await resp.json();
    selFuncionario.innerHTML = lista
      .map(f => `<option value="${f.ID_FUN}">${f.NOME_FUN}</option>`)
      .join('');
  } catch (err) {
    selFuncionario.innerHTML = '';
  }
}

if (selDestino) {
  carregarFuncionariosParaNotificacao();

  selDestino.addEventListener('change', () => {
    const individual = selDestino.value === 'individual';
    grupoFuncionario.style.display = individual ? 'block' : 'none';
    selFuncionario.required = individual;
  });
}

const formNotificacaoIndividual = document.getElementById('formNotificacaoIndividual');
if (formNotificacaoIndividual) {
  formNotificacaoIndividual.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('alertBoxIndividual');
    const btn = document.getElementById('btnEnviarIndividual');
    alertBox.innerHTML = '';

    const payload = {
      destino: selDestino.value,
      titulo: document.getElementById('nTitulo').value.trim(),
      mensagem: document.getElementById('nMensagem').value.trim(),
    };
    if (payload.destino === 'individual') {
      payload.id_fun = parseInt(selFuncionario.value, 10);
    }

    btn.disabled = true;
    btn.innerText = 'Enviando...';

    try {
      const resp = await fetch('/api/notificacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();

      if (!resp.ok) {
        alertBox.innerHTML = `<div class="alert alert-erro">${data.erro || 'Não foi possível enviar a notificação.'}</div>`;
        return;
      }

      Toast.sucesso(data.mensagem);
      formNotificacaoIndividual.reset();
      grupoFuncionario.style.display = 'none';
      carregarHistoricoNotificacoes();
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-erro">Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.</div>`;
    } finally {
      btn.disabled = false;
      btn.innerText = 'Enviar notificação';
    }
  });
}

// ---------- HISTÓRICO DE NOTIFICAÇÕES ENVIADAS ----------

async function carregarHistoricoNotificacoes() {
  const corpo = document.getElementById('corpoHistoricoNotificacoes');
  const vazio = document.getElementById('vazioHistoricoNotificacoes');
  if (!corpo) return;

  try {
    const resp = await fetch('/api/notificacoes');
    const lista = await resp.json();

    if (!resp.ok || !lista.length) {
      corpo.innerHTML = '';
      vazio.style.display = 'block';
      return;
    }
    vazio.style.display = 'none';

    corpo.innerHTML = lista.map(n => {
      const data = new Date(n.DATA_ENVIO);
      const dataFormatada = isNaN(data) ? '-' : data.toLocaleString('pt-BR');
      const tipoTexto = n.TIPO_ENVIO === 'geral' ? 'Geral' : 'Individual';
      const statusBadge = n.LIDA
        ? `<span class="badge badge-verde">Lida</span>`
        : `<span class="badge badge-amarelo">Não lida</span>`;
      return `
        <tr>
          <td>${n.NOME_FUN || '-'}</td>
          <td>${n.TITULO}</td>
          <td>${tipoTexto}</td>
          <td>${dataFormatada}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    corpo.innerHTML = '';
    vazio.style.display = 'block';
  }
}

if (document.getElementById('corpoHistoricoNotificacoes')) {
  carregarHistoricoNotificacoes();
}

async function dispararNotificacoes() {
  const btn = document.getElementById('btnNotificar');
  const alertBox = document.getElementById('alertBox');
  alertBox.innerHTML = '';
  btn.disabled = true;
  btn.innerText = 'Enviando...';

  try {
    const resp = await fetch('/api/notificar-vencimentos', { method: 'POST' });
    const data = await resp.json();

    if (!resp.ok) {
      alertBox.innerHTML = `<div class="alert alert-erro">${data.erro || 'Não foi possível enviar as notificações agora. Tente novamente em instantes.'}</div>`;
    } else {
      alertBox.innerHTML = `<div class="alert alert-sucesso">${data.mensagem}</div>`;
      Toast.sucesso(data.mensagem);
    }
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-erro">Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.</div>`;
  } finally {
    btn.disabled = false;
    btn.innerText = '📨 Enviar notificações agora';
  }
}
