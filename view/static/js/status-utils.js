// ============================================
// UTILITÁRIOS DE DATA/STATUS (compartilhado)
// Usado por: Página Inicial, Relatórios e Treinamentos.
//
// Por que isso existe:
// As datas vêm do backend como texto "AAAA-MM-DD". Comparar isso
// direto com `new Date("AAAA-MM-DD") vs new Date()` tem um bug sutil:
// "AAAA-MM-DD" é interpretado como meia-noite em UTC, enquanto
// `new Date()` (o "hoje") é meia-noite/hora atual no fuso do
// navegador. No Brasil (UTC-3) isso pode fazer um treinamento
// aparecer "Vencido" ou "Vencendo" horas antes/depois da hora certa,
// dependendo do horário em que a página é aberta.
// Aqui comparamos apenas o texto "AAAA-MM-DD" (comparação de string
// funciona porque o formato ISO é ordenável), evitando o problema.
// ============================================

// Extrai só a parte "AAAA-MM-DD" de uma data vinda do backend
// (que pode vir como "AAAA-MM-DD" ou "AAAA-MM-DDTHH:MM:SS").
function apenasData(dataStr) {
  if (!dataStr) return '';
  return String(dataStr).slice(0, 10);
}

// Data de hoje no fuso do navegador, como "AAAA-MM-DD".
function hojeISO() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Soma (ou subtrai, se negativo) dias a uma data "AAAA-MM-DD", devolvendo outra "AAAA-MM-DD".
function somarDiasISO(dataISO, dias) {
  const [ano, mes, dia] = apenasData(dataISO).split('-').map(Number);
  const d = new Date(ano, (mes - 1), dia);
  d.setDate(d.getDate() + dias);
  const anoF = d.getFullYear();
  const mesF = String(d.getMonth() + 1).padStart(2, '0');
  const diaF = String(d.getDate()).padStart(2, '0');
  return `${anoF}-${mesF}-${diaF}`;
}

// Status (Válido / Vencendo em 30 dias / Vencido) a partir da data de vencimento.
function statusPorVencimento(dataVencimento) {
  const venc = apenasData(dataVencimento);
  if (!venc) return { chave: '', texto: '-', classe: '' };

  const hoje = hojeISO();
  const limite30 = somarDiasISO(hoje, 30);

  if (venc < hoje) return { chave: 'vencido', texto: 'Vencido', classe: 'badge-vermelho' };
  if (venc <= limite30) return { chave: 'vencendo', texto: 'Vencendo', classe: 'badge-amarelo' };
  return { chave: 'valido', texto: 'Válido', classe: 'badge-verde' };
}

// Converte "AAAA-MM-DD" (ou "AAAA-MM-DDTHH:MM:SS") para "DD/MM/AAAA".
function formatarData(dataStr) {
  if (!dataStr) return '-';
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataStr);
  if (isoMatch) {
    const [, ano, mes, dia] = isoMatch;
    return `${dia}/${mes}/${ano}`;
  }
  const d = new Date(dataStr);
  if (isNaN(d.getTime())) return dataStr;
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
