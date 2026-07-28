// ============================================
// SINO DE NOTIFICAÇÕES INDIVIDUAIS
// Mostra, no canto superior direito da tela, os avisos que o ADM enviou
// para o funcionário logado (gerais ou individuais). Para o ADM, o sino
// também é exibido, mas normalmente ficará vazio, já que quem recebe
// notificações são os funcionários.
// ============================================
(function () {
  const botao = document.getElementById('sinoBotao');
  const painel = document.getElementById('sinoPainel');
  const badge = document.getElementById('sinoBadge');
  const lista = document.getElementById('sinoLista');
  const btnMarcarLidas = document.getElementById('sinoMarcarLidas');

  if (!botao || !painel || !lista) return;

  let notificacoes = [];

  function formatarDataHora(iso) {
    if (!iso) return '';
    const data = new Date(iso);
    if (isNaN(data)) return '';
    return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function renderizar() {
    const naoLidas = notificacoes.filter(n => !n.LIDA).length;

    if (naoLidas > 0) {
      badge.style.display = 'inline-block';
      badge.textContent = naoLidas > 9 ? '9+' : String(naoLidas);
    } else {
      badge.style.display = 'none';
    }

    if (!notificacoes.length) {
      lista.innerHTML = '<div class="sino-vazio">Você não tem notificações.</div>';
      return;
    }

    lista.innerHTML = notificacoes.map(n => `
      <button type="button" class="sino-item ${n.LIDA ? '' : 'nao-lida'}" data-id="${n.ID_NOTIF}">
        <div class="sino-item-titulo">
          ${n.LIDA ? '' : '<span class="sino-ponto-novo"></span>'}${n.TITULO}
        </div>
        <div class="sino-item-mensagem">${n.MENSAGEM}</div>
        <div class="sino-item-data">${formatarDataHora(n.DATA_ENVIO)}</div>
      </button>
    `).join('');

    lista.querySelectorAll('.sino-item').forEach(item => {
      item.addEventListener('click', () => marcarComoLida(parseInt(item.dataset.id, 10)));
    });
  }

  async function carregarNotificacoes() {
    try {
      const resp = await fetch('/api/notificacoes/minhas');
      if (!resp.ok) return;
      notificacoes = await resp.json();
      renderizar();
    } catch (err) {
      // Falha silenciosa: o sino simplesmente não atualiza desta vez.
    }
  }

  async function marcarComoLida(id) {
    const notificacao = notificacoes.find(n => n.ID_NOTIF === id);
    if (!notificacao || notificacao.LIDA) return;

    notificacao.LIDA = true;
    renderizar();

    try {
      await fetch(`/api/notificacoes/${id}/lida`, { method: 'PUT' });
    } catch (err) {
      // Se der erro de rede, a próxima atualização automática corrige o estado.
    }
  }

  if (btnMarcarLidas) {
    btnMarcarLidas.addEventListener('click', async () => {
      notificacoes.forEach(n => (n.LIDA = true));
      renderizar();
      try {
        await fetch('/api/notificacoes/marcar-todas-lidas', { method: 'PUT' });
      } catch (err) {
        // Idem: próxima atualização automática corrige o estado.
      }
    });
  }

  botao.addEventListener('click', (e) => {
    e.stopPropagation();
    const aberto = painel.classList.toggle('aberto');
    botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    if (aberto) carregarNotificacoes();
  });

  document.addEventListener('click', (e) => {
    if (!painel.contains(e.target) && e.target !== botao) {
      painel.classList.remove('aberto');
      botao.setAttribute('aria-expanded', 'false');
    }
  });

  carregarNotificacoes();
  setInterval(carregarNotificacoes, 60000);
})();
