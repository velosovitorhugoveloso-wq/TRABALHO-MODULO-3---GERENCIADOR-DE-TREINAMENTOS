// ============================================
// NOTIFICAÇÕES DA INTERFACE
// Substitui os diálogos nativos do navegador (alert/confirm), que são feios,
// bloqueiam a tela inteira e não seguem a identidade visual do sistema.
//
// Uso:
//   Toast.sucesso('Salvo com sucesso!');
//   Toast.erro('Não foi possível salvar.');
//   const ok = await Notify.confirmar({ mensagem: 'Tem certeza?' });
// ============================================
(function () {
  function garantirContainerToast() {
    let cont = document.getElementById('toastContainer');
    if (!cont) {
      cont = document.createElement('div');
      cont.id = 'toastContainer';
      cont.className = 'toast-container';
      document.body.appendChild(cont);
    }
    return cont;
  }

  const ICONES = { sucesso: '✅', erro: '⚠️', aviso: '🔔', info: 'ℹ️' };

  function mostrarToast(mensagem, tipo, duracao) {
    if (!mensagem) return null;
    const cont = garantirContainerToast();
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');

    const icone = document.createElement('span');
    icone.className = 'toast-icone';
    icone.textContent = ICONES[tipo] || ICONES.info;

    const texto = document.createElement('span');
    texto.className = 'toast-texto';
    texto.textContent = mensagem;

    const fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.className = 'toast-fechar';
    fechar.setAttribute('aria-label', 'Fechar aviso');
    fechar.textContent = '×';

    toast.append(icone, texto, fechar);
    cont.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visivel'));

    let removido = false;
    function remover() {
      if (removido) return;
      removido = true;
      toast.classList.remove('toast-visivel');
      toast.classList.add('toast-saindo');
      setTimeout(() => toast.remove(), 220);
    }
    fechar.addEventListener('click', remover);
    if (duracao > 0) setTimeout(remover, duracao);
    return toast;
  }

  window.Toast = {
    sucesso: (msg, duracao = 4500) => mostrarToast(msg, 'sucesso', duracao),
    erro: (msg, duracao = 7000) => mostrarToast(msg, 'erro', duracao),
    aviso: (msg, duracao = 6000) => mostrarToast(msg, 'aviso', duracao),
    info: (msg, duracao = 5000) => mostrarToast(msg, 'info', duracao),
  };

  // ---------- Modal de confirmação (substitui window.confirm) ----------
  function garantirModalConfirmacao() {
    let overlay = document.getElementById('confirmOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'confirmOverlay';
    overlay.className = 'modal-overlay confirm-overlay';
    overlay.innerHTML = `
      <div class="modal-box confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitulo">
        <h3 id="confirmTitulo">Confirmar ação</h3>
        <p id="confirmMensagem" class="confirm-mensagem"></p>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="confirmBtnCancelar">Cancelar</button>
          <button type="button" class="btn btn-danger" id="confirmBtnConfirmar">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function confirmar(opcoes) {
    const {
      titulo = 'Confirmar ação',
      mensagem = 'Tem certeza que deseja continuar?',
      textoConfirmar = 'Confirmar',
      textoCancelar = 'Cancelar',
      perigo = true,
    } = opcoes || {};

    return new Promise((resolve) => {
      const overlay = garantirModalConfirmacao();
      overlay.querySelector('#confirmTitulo').textContent = titulo;
      overlay.querySelector('#confirmMensagem').textContent = mensagem;

      const btnConfirmar = overlay.querySelector('#confirmBtnConfirmar');
      const btnCancelar = overlay.querySelector('#confirmBtnCancelar');
      btnConfirmar.textContent = textoConfirmar;
      btnConfirmar.className = perigo ? 'btn btn-danger' : 'btn btn-primary';
      btnCancelar.textContent = textoCancelar;

      overlay.classList.add('aberto');

      function limpar(resultado) {
        overlay.classList.remove('aberto');
        btnConfirmar.removeEventListener('click', aoConfirmar);
        btnCancelar.removeEventListener('click', aoCancelar);
        overlay.removeEventListener('click', aoClicarFora);
        document.removeEventListener('keydown', aoTeclar);
        resolve(resultado);
      }
      function aoConfirmar() { limpar(true); }
      function aoCancelar() { limpar(false); }
      function aoClicarFora(e) { if (e.target === overlay) limpar(false); }
      function aoTeclar(e) { if (e.key === 'Escape') limpar(false); }

      btnConfirmar.addEventListener('click', aoConfirmar);
      btnCancelar.addEventListener('click', aoCancelar);
      overlay.addEventListener('click', aoClicarFora);
      document.addEventListener('keydown', aoTeclar);

      setTimeout(() => btnCancelar.focus(), 50);
    });
  }

  window.Notify = { confirmar };
})();
