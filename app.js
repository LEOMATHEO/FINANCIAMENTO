// Core financeiro — simplificado, baseado nos seus documentos (SAC, TR, taxa 9,3764% a.a.)
// Taxa & indexadores podem ser alterados na UI.
const state = {
  sistema: 'SAC',
  taxaAnual: 9.3764, // % a.a. (nominal)  【Documento Descritivo】
  trMensal: 0.0,     // exemplo: 0.03  -> 3% a.m. (campo aceita decimal)
  metaMeses: 50,
  saldoAtual: 251346.73, // R$ em 10/09/2025  【Documento Descritivo】
  dataSaldo: '2025-09-10',
  historico: window.__HISTORICO__ || [],
  eventos: [] // pagamentos e extras inseridos pelo usuário
};

function pm(a){ return (a/12/100); } // taxa mensal aproximada a partir nominal anual
function money(v){ return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

// Estima meses para quitar dado saldo e extra mensal
function estimarMesesQuitacao(saldo, taxaMensal, tr, extraMensal, sistema='SAC'){
  // Simulação iterativa até 600 meses para segurança
  let meses = 0;
  let s = saldo;
  const max = 600;
  while(s>1 && meses<max){
    meses++;
    // juros do mês
    const j = s * taxaMensal;
    // amortização base (SAC): constante aproximada com base no prazo meta, aqui usamos heurística:
    const amortBase = Math.max(0, s / clamp( (120), 12, 600)); // heurística neutra (10 anos) só para estimativa rápida
    // parcela teórica
    const parcela = (sistema==='SAC') ? (j + amortBase) : ( (s*taxaMensal) / (1 - Math.pow(1+taxaMensal,-120)) );
    // atualização por TR (se usar TR>0, aumenta saldo)
    const correcao = s * (tr/100.0);
    // pagamento efetivo: parcela + extra mensal
    const pago = parcela + (extraMensal||0);
    // novo saldo
    s = s + correcao + j - (pago - j); // subtrai amortização efetiva (pago - juros)
    if (s>1e12) break; // segurança
  }
  return meses>=max ? max : meses;
}

// Busca binária: extra mensal necessário p/ meta
function extraMensalParaMeta(saldo, taxaMensal, tr, meta, sistema='SAC'){
  let lo=0, hi=saldo; // máximo teórico: pagar tudo num mês
  for(let k=0;k<32;k++){
    const mid=(lo+hi)/2;
    const m=estimarMesesQuitacao(saldo,taxaMensal,tr,mid,sistema);
    if(m>meta) lo=mid; else hi=mid;
  }
  return hi;
}

// Recalcular KPIs
function recalc(){
  const txAnual = parseFloat(document.getElementById('txAnual').value)||state.taxaAnual;
  const trMensal = parseFloat(document.getElementById('trMensal').value)||0;
  const sistema = document.getElementById('sistema').value;
  const meta = parseInt(document.getElementById('metaMeses').value)||state.metaMeses;

  const i = pm(txAnual);
  const mEst = estimarMesesQuitacao(state.saldoAtual, i, trMensal, 0, sistema);
  const extra = mEst>meta ? extraMensalParaMeta(state.saldoAtual, i, trMensal, meta, sistema) : 0;

  document.getElementById('kpiSaldo').textContent = money(state.saldoAtual);
  document.getElementById('kpiPrazo').textContent = mEst.toString();
  document.getElementById('kpiExtra').textContent = extra>0 ? money(extra) : '—';
  document.getElementById('lblDataSaldo').textContent = `Base: ${state.dataSaldo}`;
  document.getElementById('lblExtra').textContent = extra>0 ? 'Valor adicional sugerido por mês para atingir 50 meses.' : 'Meta já atendida sem extra mensal.';
}

// Render tabela
function renderTabela(){
  const tbody=document.getElementById('tbody');
  tbody.innerHTML='';
  const rows=[...state.historico, ...state.eventos];
  rows.sort((a,b)=> (a.data>b.data?1:-1));

  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    const tr=document.createElement('tr');
    const cols=[
      i+1,
      r.data || '',
      r.tipo || '',
      r.amortizacao!=null? money(r.amortizacao):'',
      r.juros!=null? money(r.juros):'',
      r.parcela!=null? money(r.parcela):'',
      r.saldo!=null? money(r.saldo):'',
      (r.deltaMeses!=null? r.deltaMeses : ''),
      (r.valorParcelaAmortizada!=null? money(r.valorParcelaAmortizada) : '')
    ];
    cols.forEach((c,idx)=>{
      const td=document.createElement('td');
      td.textContent=c;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
}

// Modal registrar
let deferredPrompt;
const dlg=document.getElementById('dlg');
document.getElementById('btnRegistrar').onclick=()=>{
  const today=(new Date()).toISOString().slice(0,10);
  document.getElementById('inpData').value=today;
  document.getElementById('inpTipo').value='PAGAMENTO';
  document.getElementById('inpValor').value='';
  document.getElementById('inpObs').value='';
  dlg.showModal();
};
document.getElementById('btnCancelar').onclick=()=> dlg.close();
document.getElementById('btnConfirmar').onclick=()=>{
  const data=document.getElementById('inpData').value;
  const tipo=document.getElementById('inpTipo').value;
  const valor=parseFloat(document.getElementById('inpValor').value||'0');
  if(!data || !valor || valor<=0){ alert('Preencha a data e o valor.'); return; }

  const txAnual = parseFloat(document.getElementById('txAnual').value)||state.taxaAnual;
  const trMensal = parseFloat(document.getElementById('trMensal').value)||0;
  const sistema = document.getElementById('sistema').value;
  const i = pm(txAnual);

  // Prazo antes
  const prazoAntes = estimarMesesQuitacao(state.saldoAtual, i, trMensal, 0, sistema);

  // Se amortização extra, reduz saldo direto
  let amort=0, juros= state.saldoAtual * i, parcela=0;
  if(tipo==='EXTRA'){
    amort = valor;
    state.saldoAtual = Math.max(0, state.saldoAtual - amort);
    parcela = valor;
  }else{
    // Pagamento normal: supõe parcela ≈ juros + amortização base (heurística rápida)
    const amortBase = Math.max(0, state.saldoAtual / clamp(prazoAntes,12,600));
    parcela = juros + amortBase;
    amort = Math.min(valor - juros, amortBase);
    if (amort>0) state.saldoAtual = Math.max(0, state.saldoAtual - amort);
  }

  // Prazo depois
  const prazoDepois = estimarMesesQuitacao(state.saldoAtual, i, trMensal, 0, sistema);
  const delta = Math.max(0, prazoAntes - prazoDepois);

  // Valor da parcela amortizada (só faz sentido para amortização extra relevante)
  let parcelaAmortizada = null;
  if(tipo==='EXTRA' && delta>0){
    parcelaAmortizada = amort / delta;
  }

  const row = {
    data, tipo, amortizacao: Math.max(0,amort), juros: Math.max(0,juros),
    parcela: Math.max(0,parcela), saldo: state.saldoAtual, deltaMeses: delta||null,
    valorParcelaAmortizada: parcelaAmortizada
  };
  state.eventos.push(row);
  localStorage.setItem('fin_eventos', JSON.stringify(state.eventos));

  dlg.close();
  recalc();
  renderTabela();
};

// Install prompt
let installEvent=null;
window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); installEvent=e; });
document.getElementById('btnInstall').onclick=async()=>{
  if(installEvent){ installEvent.prompt(); }
  else alert('Se o navegador suportar, use "Adicionar à tela inicial".');
};

// Init
function init(){
  // carregar eventos salvos
  try{
    const saved=JSON.parse(localStorage.getItem('fin_eventos')||'[]');
    if(Array.isArray(saved)) state.eventos=saved;
  }catch{}
  // inputs
  document.getElementById('txAnual').value = state.taxaAnual;
  document.getElementById('trMensal').value = state.trMensal;
  document.getElementById('sistema').value = state.sistema;
  document.getElementById('metaMeses').value = state.metaMeses;
  document.getElementById('btnRecalcular').onclick=()=>{ recalc(); renderTabela(); };

  recalc();
  renderTabela();
}
init();
