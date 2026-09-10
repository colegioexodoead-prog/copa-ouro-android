(function(){
'use strict';
const FED_SLOTS={
  'Inglaterra':[1,2,3,4],
  'Itália':[5,6,7,8],
  'Espanha':[9,10,11,12],
  'Brasil':[13,14,15,16],
  'Europa A':[17,18,19,20],
  'México':[21,22],
  'CONCACAF':[23,24],
  'CONMEBOL A':[25,26,27],
  'CONMEBOL B':[28,29],
  'Ásia':[30,31],
  'África':[32,33],
  'Arábia':[34]
};
const path=(location.pathname||'').toLowerCase();
function readJSON(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch(e){return fallback}}
function uniqByName(items){const seen=new Set();return items.filter(x=>{const k=String(x&&x.name||'').trim().toLocaleLowerCase('pt-BR');if(!k||seen.has(k))return false;seen.add(k);return true})}
function cupTeamFed(t){return String((t&&(t.fed||t.slot))||'').trim()}
function cupStandings(st){
  const rows=(st.teams||[]).map(t=>({id:t.id,name:t.name,fed:cupTeamFed(t),j:0,v:0,e:0,d:0,gp:0,gc:0,sg:0,pts:0}));
  const map=Object.fromEntries(rows.map(x=>[String(x.id),x]));
  (st.matches||[]).forEach(m=>{
    if(!Number.isInteger(m.hg)||!Number.isInteger(m.ag))return;
    const a=map[String(m.home)],b=map[String(m.away)];if(!a||!b)return;
    a.j++;b.j++;a.gp+=m.hg;a.gc+=m.ag;b.gp+=m.ag;b.gc+=m.hg;
    if(m.hg>m.ag){a.v++;a.pts+=3;b.d++}else if(m.hg<m.ag){b.v++;b.pts+=3;a.d++}else{a.e++;b.e++;a.pts++;b.pts++}
  });
  rows.forEach(x=>x.sg=x.gp-x.gc);
  rows.sort((a,b)=>b.pts-a.pts||b.sg-a.sg||b.gp-a.gp||b.v-a.v||String(a.name).localeCompare(String(b.name),'pt-BR'));
  return rows.map((x,i)=>({...x,pos:i+1}));
}
function playoffWinners(st){
  const p=st&&st.knockout&&Array.isArray(st.knockout.playoffs)?st.knockout.playoffs:[];
  if(p.length!==8)return [];
  const winners=[];
  for(const m of p){
    if(!Number.isInteger(m.hg)||!Number.isInteger(m.ag)||m.hg===m.ag)return [];
    winners.push(m.hg>m.ag?m.home:m.away);
  }
  return winners;
}
function championId(st){
  const f=st&&st.knockout&&Array.isArray(st.knockout.final)?st.knockout.final[0]:null;
  if(!f||!Number.isInteger(f.hg)||!Number.isInteger(f.ag)||f.hg===f.ag)return null;
  return f.hg>f.ag?f.home:f.away;
}
function oldElimName(old,ref){
  if(ref==null)return '';
  if(typeof ref==='string'&&ref.startsWith('co:'))return String(old?.chance?.registration?.[ref.slice(3)]||'');
  return String((old.teams||[]).find(t=>String(t.id)===String(ref))?.name||'');
}
function archiveOldElimIfNeeded(old){
  const history=Array.isArray(old&&old.history)?[...old.history]:[];
  if(!old||old.editionFinished||(!(old.teams||[]).length&&!Object.keys(old.slots||{}).length))return history;
  const attempted=[];
  (old.teams||[]).forEach(t=>{if(t&&t.name&&t.status!=='direct')attempted.push({name:String(t.name).trim(),fed:t.fed||'Sem federação'})});
  const reg=old?.chance?.registration||{},regFed=old?.chance?.registrationFed||{};
  Object.keys(reg).forEach(k=>{const name=String(reg[k]||'').trim();if(name)attempted.push({name,fed:regFed[k]||'Chance de Ouro'})});
  const qualifiedNames=uniqByName(Object.values(old.slots||{}).map(ref=>({name:oldElimName(old,ref)}))).map(x=>x.name);
  history.push({
    endedAt:new Date().toISOString(),slots:{...(old.slots||{})},
    teams:(old.teams||[]).map(t=>({name:t.name,fed:t.fed,status:t.status,eliminated:!!t.eliminated})),
    attemptedTeams:uniqByName(attempted),qualifiedNames,
    chanceRegistration:{...reg},chanceRegistrationFed:{...regFed},
    champion35:old?.slots?.[35]||null,champion35Name:old?.slots?.[35]?oldElimName(old,old.slots[35]):'',
    finalized:true,autoFinalizedByCup:true
  });
  return history;
}
function buildNextElimination(oldCup,r16Ids,champId){
  const oldElim=readJSON('elimCopaOuro',{});
  const history=archiveOldElimIfNeeded(oldElim);
  const r16Set=new Set(r16Ids.map(String));
  const direct=(oldCup.teams||[]).filter(t=>r16Set.has(String(t.id)));
  const disputes=(oldCup.teams||[]).filter(t=>!r16Set.has(String(t.id)));
  const unsupported=direct.filter(t=>String(t.id)!==String(champId)&&!FED_SLOTS[cupTeamFed(t)]);
  if(unsupported.length)throw new Error('Federação sem vagas configuradas: '+unsupported.map(t=>t.name+' ('+cupTeamFed(t)+')').join(', '));
  const now=Date.now();let seq=0;
  const next={
    teams:[],fedMatches:{},chance:{games:{},repescagem:null,registration:{},registrationFed:{}},slots:{},history,editionFinished:false,
    editionId:'auto-copa-'+now,
    autoFromCup:{createdAt:new Date().toISOString(),directCount:direct.length,disputeCount:disputes.length,championId:champId,source:'Copa Ouro',version:136}
  };
  const idMap=new Map();
  direct.forEach(t=>{
    const id=now+(++seq);idMap.set(String(t.id),id);
    next.teams.push({id,name:t.name,fed:cupTeamFed(t),status:'direct',eliminated:false,source:'oitavas-edicao-anterior'});
  });
  disputes.forEach(t=>{
    const id=now+(++seq);idMap.set(String(t.id),id);
    next.teams.push({id,name:t.name,fed:cupTeamFed(t),status:'dispute',eliminated:false,source:'eliminado-edicao-anterior'});
  });
  const champNew=idMap.get(String(champId));
  if(!champNew)throw new Error('Campeão não encontrado entre os classificados às oitavas.');
  next.slots[36]=champNew;
  const directWithoutChampion=direct.filter(t=>String(t.id)!==String(champId));
  for(const t of directWithoutChampion){
    const fed=cupTeamFed(t),open=FED_SLOTS[fed].find(n=>!next.slots[n]);
    if(!open)throw new Error('Não há vaga direta livre suficiente em '+fed+' para '+t.name+'.');
    next.slots[open]=idMap.get(String(t.id));
  }
  return next;
}
function syncPartialQualified(next){
  const slotFed=n=>Object.entries(FED_SLOTS).find(([,arr])=>arr.includes(Number(n)))?.[0]||(Number(n)===36?'Campeão anterior':'');
  const byId=id=>(next.teams||[]).find(t=>String(t.id)===String(id));
  const teams=[];
  for(let n=1;n<=36;n++){
    const ref=next.slots[n];if(!ref)continue;const t=byId(ref);if(!t)continue;
    const slotName=n===36?'Campeão':slotFed(n);
    teams.push({name:t.name,fed:t.fed||slotName,slot:slotName,sourceSlot:n});
  }
  localStorage.setItem('copaOuroQualified',JSON.stringify({updatedAt:new Date().toISOString(),complete:teams.length===36,teams}));
}
function installCupAutomation(){
  const original=window.finishAndStartNewCup;
  if(typeof original!=='function'||original.__v136)return;
  const wrapped=function(){
    const oldCup=readJSON('copaOuroV3',null);
    if(!oldCup||!Array.isArray(oldCup.teams)||oldCup.teams.length!==36)return original.apply(this,arguments);
    const champ=championId(oldCup);
    if(champ==null){alert('Defina o campeão da Copa antes de finalizar. Assim as próximas Eliminatórias serão preparadas corretamente.');return;}
    const table=cupStandings(oldCup),top8=table.slice(0,8).map(x=>x.id),pw=playoffWinners(oldCup);
    if(pw.length!==8){alert('Finalize os 8 jogos dos Playoffs antes de encerrar a Copa. Precisamos deles para identificar os 16 times das oitavas.');return;}
    const r16=[...new Set([...top8,...pw].map(String))];
    if(r16.length!==16){alert('Não foi possível identificar exatamente os 16 classificados às oitavas. Revise os Playoffs antes de finalizar.');return;}
    let next;
    try{next=buildNextElimination(oldCup,r16,champ)}catch(e){alert('Não foi possível preparar a próxima Eliminatória: '+e.message);return;}
    let thrown=null;
    try{original.apply(this,arguments)}catch(e){thrown=e;console.warn(e)}
    const after=readJSON('copaOuroV3',{});
    if(Array.isArray(after.teams)&&after.teams.length===0){
      localStorage.setItem('elimCopaOuro',JSON.stringify(next));
      syncPartialQualified(next);
      const directNames=next.teams.filter(t=>t.status==='direct').map(t=>t.name);
      const disputeNames=next.teams.filter(t=>t.status==='dispute').map(t=>t.name);
      localStorage.setItem('copaSequenceV136',JSON.stringify({createdAt:new Date().toISOString(),directNames,disputeNames,champion:next.teams.find(t=>String(t.id)===String(next.slots[36]))?.name||'',applied:true}));
      const hist=readJSON('copaOuroHistory',[]);
      if(hist.length){hist[hist.length-1].round16=directNames;hist[hist.length-1].nextEliminatoriaPrepared=true;localStorage.setItem('copaOuroHistory',JSON.stringify(hist));}
      try{if(typeof window.importQualifiedTeams==='function')window.importQualifiedTeams(false)}catch(e){console.warn(e)}
      alert('Próximas Eliminatórias preparadas automaticamente! '+directNames.length+' times das oitavas ficaram diretos e '+disputeNames.length+' times ficaram aguardando disputa por federação. O campeão anterior ficou na Vaga 36.');
    }
    if(thrown)console.warn('Finalização concluiu os dados, mas houve erro apenas na atualização visual.',thrown);
  };
  wrapped.__v136=true;window.finishAndStartNewCup=wrapped;
  const btn=[...document.querySelectorAll('button')].find(b=>String(b.getAttribute('onclick')||'').includes('finishAndStartNewCup'));
  if(btn)btn.innerHTML='🏁 Finalizar Copa + Preparar Próximas Eliminatórias';
}
function installElimAutomation(){
  const directSlot=document.getElementById('directSlot');
  if(directSlot){directSlot.readOnly=true;directSlot.placeholder='Automática pela federação';}
  const original=window.addTeam;
  if(typeof original==='function'&&!original.__v136){
    const wrapped=async function(){
      const fed=document.getElementById('teamFed')?.value||'';
      const st=document.getElementById('teamStatus')?.value||'normal';
      const slotInput=document.getElementById('directSlot');
      if(st==='direct'){
        const cur=readJSON('elimCopaOuro',{slots:{}}),allowed=FED_SLOTS[fed]||[];
        const open=allowed.find(n=>!(cur.slots||{})[n]);
        if(!open){alert('Não há vaga direta aberta na federação '+fed+'.');return;}
        if(slotInput)slotInput.value=String(open);
      }else if(slotInput)slotInput.value='';
      return original.apply(this,arguments);
    };
    wrapped.__v136=true;window.addTeam=wrapped;
  }
  const cadastro=document.getElementById('cadastro');
  if(cadastro&&!document.getElementById('autoDirectV136')){
    const note=document.createElement('div');note.id='autoDirectV136';note.className='notice';note.style.marginBottom='12px';
    note.innerHTML='<b>⚙️ Vagas diretas automáticas:</b> ao cadastrar um time como <b>Classificado direto</b>, o sistema coloca o clube na primeira vaga livre da própria federação. Você não precisa digitar o número da vaga.';
    cadastro.insertBefore(note,cadastro.firstChild);
  }
  const current=readJSON('elimCopaOuro',{});
  if(current.autoFromCup&&cadastro&&!document.getElementById('sequenceSummaryV136')){
    const direct=(current.teams||[]).filter(t=>t.status==='direct').length;
    const dispute=(current.teams||[]).filter(t=>t.status!=='direct').length;
    const champ=(current.teams||[]).find(t=>String(t.id)===String(current.slots?.[36]));
    const card=document.createElement('div');card.id='sequenceSummaryV136';card.className='card';card.style.border='1px solid rgba(211,165,45,.55)';
    card.innerHTML='<h2>🔁 Sequência automática da Copa anterior</h2><p><b>'+direct+' classificados diretos</b> já foram distribuídos nas vagas corretas e <b>'+dispute+' times</b> estão aguardando disputa por federação.</p><p class="muted">Campeão anterior: <b>'+(champ?String(champ.name):'—')+'</b> • Vaga 36. Agora basta cadastrar as novas equipes e montar os confrontos das federações.</p>';
    cadastro.insertBefore(card,cadastro.children[1]||null);
  }
}
function install(){if(path.includes('/copa/'))installCupAutomation();if(path.includes('/eliminatorias/'))installElimAutomation();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
