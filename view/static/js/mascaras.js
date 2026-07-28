// ============================================
// MÁSCARAS: CPF e Telefone/WhatsApp
// Usado em todas as páginas (carregado no base.html)
// ============================================

function apenasDigitos(valor) {
  return (valor || '').toString().replace(/\D/g, '');
}

// Formata para 000.000.000-00
function formatarCPF(valor) {
  const d = apenasDigitos(valor).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Formata para (00) 00000-0000 (celular) ou (00) 0000-0000 (fixo)
function formatarTelefone(valor) {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

// Aplica uma máscara em tempo real a um <input>, preservando a posição do cursor
function aplicarMascaraEmTempoReal(input, formatador) {
  if (!input) return;
  input.addEventListener('input', () => {
    const tamanhoAntes = input.value.length;
    const posicaoAntes = input.selectionStart || tamanhoAntes;
    input.value = formatador(input.value);
    const diferenca = input.value.length - tamanhoAntes;
    const novaPosicao = Math.max(0, posicaoAntes + diferenca);
    input.setSelectionRange(novaPosicao, novaPosicao);
  });
}

function aplicarMascaraCPF(input) {
  aplicarMascaraEmTempoReal(input, formatarCPF);
}

function aplicarMascaraTelefone(input) {
  aplicarMascaraEmTempoReal(input, formatarTelefone);
}
