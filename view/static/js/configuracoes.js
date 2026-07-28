async function carregarMinhaConta() {
  try {
    const resp = await fetch('/api/minha-conta');
    const dados = await resp.json();
    if (!resp.ok) return;

    document.getElementById('cNome').value = dados.NOME || '';
    document.getElementById('cEmail').value = dados.EMAIL || '';
    document.getElementById('cTelefone').value = dados.TELEFONE ? formatarTelefone(dados.TELEFONE) : '';
    document.getElementById('cWhatsapp').value = dados.WHATSAPP ? formatarTelefone(dados.WHATSAPP) : '';
  } catch (e) {
    console.error('Erro ao carregar dados da conta', e);
  }
}

aplicarMascaraTelefone(document.getElementById('cTelefone'));
aplicarMascaraTelefone(document.getElementById('cWhatsapp'));

const formMinhaConta = document.getElementById('formMinhaConta');
if (formMinhaConta) {
  formMinhaConta.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('contaAlert');
    alertBox.innerHTML = '';

    const payload = {
      nome: document.getElementById('cNome').value,
      email: document.getElementById('cEmail').value,
      telefone: document.getElementById('cTelefone').value,
      whatsapp: document.getElementById('cWhatsapp').value,
      senha_atual: document.getElementById('cSenhaAtual').value,
      senha_nova: document.getElementById('cSenhaNova').value
    };

    try {
      const resp = await fetch('/api/minha-conta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();

      if (!resp.ok) {
        alertBox.innerHTML = `<div class="alert alert-erro">${data.erro || 'Não foi possível salvar as alterações. Confira os dados e tente novamente.'}</div>`;
        return;
      }

      alertBox.innerHTML = `<div class="alert alert-sucesso">${data.mensagem}</div>`;
      Toast.sucesso(data.mensagem);
      document.getElementById('cSenhaAtual').value = '';
      document.getElementById('cSenhaNova').value = '';

      if (window.SESSAO) window.SESSAO.nome = payload.nome;
      const nomeSidebar = document.querySelector('.sidebar .user-box .nome');
      if (nomeSidebar) nomeSidebar.innerText = payload.nome;
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-erro">Não conseguimos falar com o servidor. Verifique sua internet e tente novamente.</div>`;
    }
  });
}

carregarMinhaConta();
