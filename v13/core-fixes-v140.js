(function(){
'use strict';
const VERSION='1.4.0';
const FED_SLOTS={
  'Inglaterra':[1,2,3,4], 'Itália':[5,6,7,8], 'Espanha':[9,10,11,12], 'Brasil':[13,14,15,16],
  'Europa A':[17,18,19,20], 'México':[21,22], 'CONCACAF':[23,24], 'CONMEBOL A':[25,26,27],
  'CONMEBOL B':[28,29], 'Ásia':[30,31], 'África':[32,33], 'Arábia':[34]
};
const CHANCE_RANDOM_KEYS=['a2','b1'];
const path=(location.pathname||'').toLowerCase();
function readJSON(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch(e){return fallback}}
function profile(){try{return window.CopaProfiles?CopaProfiles.active()||'default':'default'}catch(e){return 'default'}}
function sourceSlotOf(t){const n=Number(t&&t.sourceSlot);if(n>=1&&n<=36)return n;const id=Number(t&&t.id);return id>=1&&id<=36?id:0}
function fedOf(t){try{return teamFederation(t)}catch(e){return String((t&&(t.fed||t.slot))||'').trim()}}
function completed(arr){return Array.isArray(arr)&&arr.length>0&&arr.every(m=>Number.isInteger(m.hg)&&Number.isInteger(m.ag)&&m.hg!==m.ag)}
function winners(arr){return arr.map(m=>m.hg>m.ag?m.home:m.away)}
function match(home,away){return {home,away,hg:null,ag:null}}
function uniqueIds(ids){return [...new Set(ids.map(String))]}

/* =========================
   MATA-MATA CORRIGIDO
   ========================= */
function buildRound16FromLeagueAndPlayoffs(){
  if(!state.knockout||!completed(state.knockout.playoffs))throw new Error('Finalize os 8 jogos dos Playoffs sem empates.');
  const table=standings();
  if(table.length!==36)throw new Error('A classificação da fase de liga está incompleta.');
  const top8=table.slice(0,8).map(x=>x.id);
  const pw=winners(state.knockout.playoffs);
  const ids=uniqueIds([...top8,...pw]);
  if(ids.length!==16)throw new Error('Não foi possível formar 16 times únicos nas oitavas.');
  // Chaveamento por posição: 1º enfrenta vencedor de 16º x 17º; 2º enfrenta vencedor de 15º x 18º; etc.
  state.knockout.round16=top8.map((seed,i)=>match(seed,pw[7-i]));
}
function advanceStage140(from,to){
  if(!state.knockout||!Array.isArray(state.knockout[from]))return alert('Esta fase ainda não foi criada.');
  if(!completed(state.knockout[from]))return alert('Preencha todos os placares. No mata-mata não pode terminar empatado.');
  try{
    if(from==='playoffs'&&to==='round16'){
      buildRound16FromLeagueAndPlayoffs();
    }else{
      const ws=winners(state.knockout[from]);
      const expected={round16:8,quarters:4,semis:2}[from];
      if(expected&&ws.length!==expected)throw new Error('Quantidade inesperada de vencedores em '+from+'.');
      const next=[];for(let i=0;i<ws.length;i+=2){if(ws[i+1]==null)throw new Error('Chave incompleta.');next.push(match(ws[i],ws[i+1]));}
      state.knockout[to]=next;
    }
    persist();
  }catch(e){console.error(e);alert('Não foi possível avançar a fase: '+e.message)}
}
function stageAction(stage,next,label){
  const arr=state.knockout&&state.knockout[stage];
  if(!Array.isArray(arr)||state.knockout[next])return '';
  const ok=completed(arr);
  return `<div class="actions" style="margin:10px 0 18px"><button ${ok?'':'disabled'} onclick="advanceStage('${stage}','${next}')">${label}</button>${!ok?'<span class="muted small">Finalize todos os confrontos desta fase para continuar.</span>':''}</div>`;
}
function renderKnockout140(){
  const el=document.getElementById('knockout');const sum=document.getElementById('knockoutSummary');if(!el)return;
  const played=(state.matches||[]).filter(m=>Number.isInteger(m.hg)&&Number.isInteger(m.ag)).length;
  if(sum){
    const champ=(typeof currentChampion==='function')?currentChampion():null;
    const phase=!state.knockout?'Aguardando Playoffs':state.knockout.final?'Final':state.knockout.semis?'Semifinais':state.knockout.quarters?'Quartas':state.knockout.round16?'Oitavas':'Playoffs';
    sum.innerHTML=`<span class="pill pot">Liga ${played}/144</span><span class="pill yellow">${phase}</span>${champ?'<span class="pill green">🏆 '+esc(champ.name)+'</span>':''}`;
  }
  if(!state.knockout){
    const ready=state.teams.length===36&&played===144&&standings().every(x=>x.j===8);
    el.innerHTML=`<div class="card"><h3>🏆 Iniciar Playoffs</h3><p class="muted">Os 8 primeiros vão direto às oitavas. Do 9º ao 24º disputam 8 Playoffs; os vencedores completam as oitavas.</p><div class="actions"><button ${ready?'':'disabled'} onclick="generatePlayoffs()">⚔️ Gerar 8 Playoffs</button></div>${ready?'':'<div class="notice">Finalize as 144 partidas da primeira fase antes de gerar os Playoffs.</div>'}</div>`;
    return;
  }
  let html='<div class="notice ok"><b>✅ Chaveamento corrigido:</b> Oitavas = Top 8 da liga + 8 vencedores dos Playoffs. Quartas, semifinais e final avançam sempre com os vencedores da fase anterior.</div>';
  html+=koBlock('Playoffs • 9º ao 24º',state.knockout.playoffs,'playoffs');
  html+=stageAction('playoffs','round16','➡️ Montar Oitavas de Final');
  if(state.knockout.round16){html+=koBlock('Oitavas de Final',state.knockout.round16,'round16');html+=stageAction('round16','quarters','➡️ Montar Quartas de Final');}
  if(state.knockout.quarters){html+=koBlock('Quartas de Final',state.knockout.quarters,'quarters');html+=stageAction('quarters','semis','➡️ Montar Semifinais');}
  if(state.knockout.semis){html+=koBlock('Semifinais',state.knockout.semis,'semis');html+=stageAction('semis','final','➡️ Montar Final');}
  if(state.knockout.final){
    html+=koBlock('Final',state.knockout.final,'final');
    const champ=(typeof currentChampion==='function')?currentChampion():null;
    html+=champ?`<div class="card" style="text-align:center;border:1px solid #d4af37"><div style="font-size:42px">🏆</div><h2 style="margin:5px 0">CAMPEÃO DA COPA OURO</h2><div style="font-size:22px;font-weight:900">${teamWithFed(champ)}</div><p class="muted">A Copa está pronta para ser finalizada e preparar automaticamente as próximas Eliminatórias.</p></div>`:'<div class="notice">Defina o resultado da Final. No mata-mata não pode haver empate.</div>';
  }
  el.innerHTML=html;
}
window.advanceStage=advanceStage140;
window.renderKnockout=renderKnockout140;

/* =========================
   CONTINUIDADE CORRIGIDA
   ========================= */
function playoffWinners140(cup){
  const arr=cup&&cup.knockout&&cup.knockout.playoffs;if(!completed(arr)||arr.length!==8)return [];
  return winners(arr);
}
function championId140(cup){
  const f=cup&&cup.knockout&&cup.knockout.final&&cup.knockout.final[0];
  if(!f||!Number.isInteger(f.hg)||!Number.isInteger(f.ag)||f.hg===f.ag)return null;
  return f.hg>f.ag?f.home:f.away;
}
function cupTable(cup){
  const rows=(cup.teams||[]).map(t=>({id:t.id,name:t.name,fed:fedOf(t),j:0,v:0,e:0,d:0,gp:0,gc:0,sg:0,pts:0}));const map=Object.fromEntries(rows.map(x=>[String(x.id),x]));
  (cup.matches||[]).forEach(m=>{if(!Number.isInteger(m.hg)||!Number.isInteger(m.ag))return;const a=map[String(m.home)],b=map[String(m.away)];if(!a||!b)return;a.j++;b.j++;a.gp+=m.hg;a.gc+=m.ag;b.gp+=m.ag;b.gc+=m.hg;if(m.hg>m.ag){a.v++;a.pts+=3;b.d++}else if(m.hg<m.ag){b.v++;b.pts+=3;a.d++}else{a.e++;b.e++;a.pts++;b.pts++}});
  rows.forEach(x=>x.sg=x.gp-x.gc);rows.sort((a,b)=>b.pts-a.pts||b.sg-a.sg||b.gp-a.gp||b.v-a.v||String(a.name).localeCompare(String(b.name),'pt-BR'));return rows;
}
function round16Ids(cup){
  const r=cup&&cup.knockout&&cup.knockout.round16;
  if(Array.isArray(r)&&r.length===8){const ids=uniqueIds(r.flatMap(m=>[m.home,m.away]));if(ids.length===16)return ids;}
  const top8=cupTable(cup).slice(0,8).map(x=>x.id),pw=playoffWinners140(cup);return uniqueIds([...top8,...pw]);
}
function oldElimName(old,ref){
  if(ref==null)return '';if(typeof ref==='string'&&ref.startsWith('co:'))return String(old?.chance?.registration?.[ref.slice(3)]||'');return String((old.teams||[]).find(t=>String(t.id)===String(ref))?.name||'');
}
function archiveOldElim(old){
  const history=Array.isArray(old&&old.history)?[...old.history]:[];
  if(!old||old.editionFinished||(!(old.teams||[]).length&&!Object.keys(old.slots||{}).length&&!Object.keys(old?.chance?.registration||{}).length))return history;
  const attempted=[];(old.teams||[]).forEach(t=>{if(t&&t.name&&t.status!=='direct')attempted.push({name:String(t.name).trim(),fed:t.fed||'Sem federação'})});
  const reg=old?.chance?.registration||{},regFed=old?.chance?.registrationFed||{};Object.keys(reg).forEach(k=>{const name=String(reg[k]||'').trim();if(name)attempted.push({name,fed:regFed[k]||'Chance de Ouro'})});
  const qualifiedNames=[...new Set(Object.values(old.slots||{}).map(ref=>oldElimName(old,ref)).filter(Boolean))];
  history.push({endedAt:new Date().toISOString(),slots:{...(old.slots||{})},teams:(old.teams||[]).map(t=>({name:t.name,fed:t.fed,status:t.status,eliminated:!!t.eliminated})),attemptedTeams:attempted,qualifiedNames,chanceRegistration:{...reg},chanceRegistrationFed:{...regFed},champion35:old?.slots?.[35]||null,champion35Name:old?.slots?.[35]?oldElimName(old,old.slots[35]):'',finalized:true,autoFinalizedByCup:true});
  return history;
}
function backupElim(old){try{localStorage.setItem('copaElimPreRenewBackupV140:'+profile(),JSON.stringify({savedAt:new Date().toISOString(),profile:profile(),data:old}))}catch(e){console.warn(e)}}
function firstOpenSlot(next,t){
  const fed=fedOf(t),allowed=FED_SLOTS[fed]||[];if(!allowed.length)return null;
  const src=sourceSlotOf(t);if(allowed.includes(src)&&!next.slots[src])return src;
  return allowed.find(n=>!next.slots[n])||null;
}
function addTeam(next,t,status,source){
  const id=next._now+(++next._seq);next.teams.push({id,name:t.name,fed:fedOf(t),status,eliminated:false,source,sourceCupSlot:sourceSlotOf(t)});return id;
}
function placeChanceCarry(next,t){
  const key=CHANCE_RANDOM_KEYS.find(k=>!next.chance.registration[k]);
  if(!key){next.chance.autoWaitlist=next.chance.autoWaitlist||[];next.chance.autoWaitlist.push({name:t.name,fed:fedOf(t),sourceCupSlot:sourceSlotOf(t)});return false;}
  next.chance.registration[key]=t.name;next.chance.registrationFed[key]=fedOf(t);next.chance.autoCarry=next.chance.autoCarry||[];next.chance.autoCarry.push({key,name:t.name,fed:fedOf(t),sourceCupSlot:sourceSlotOf(t)});return true;
}
function buildNextElimination140(cup,r16,champId){
  const old=readJSON('elimCopaOuro',{});backupElim(old);const history=archiveOldElim(old),rset=new Set(r16.map(String));const champ=(cup.teams||[]).find(t=>String(t.id)===String(champId));if(!champ)throw new Error('Campeão não encontrado.');
  const now=Date.now();const next={teams:[],fedMatches:{},chance:{games:{},repescagem:null,registration:{},registrationFed:{},autoCarry:[],autoWaitlist:[]},slots:{},history,editionFinished:false,editionId:'auto-copa-'+now,autoFromCup:{createdAt:new Date().toISOString(),source:'Copa Ouro',version:140,championId:champId,directCount:0,disputeCount:0,chanceCarryCount:0}};next._now=now;next._seq=0;
  // Campeão atual SEMPRE tem prioridade absoluta na Vaga 36.
  const champNew=addTeam(next,champ,'direct','campeao-edicao-anterior');next.slots[36]=champNew;
  const qualified=(cup.teams||[]).filter(t=>rset.has(String(t.id))&&String(t.id)!==String(champId));
  const regular=qualified.filter(t=>{const s=sourceSlotOf(t);return s>=1&&s<=34});
  const special=qualified.filter(t=>{const s=sourceSlotOf(t);return s===35||s===36});
  const unknown=qualified.filter(t=>!regular.includes(t)&&!special.includes(t));
  const overflow=[];
  // Vagas 1–34 têm prioridade para quem veio delas (direto ou vencedor de eliminatória).
  [...regular,...unknown].forEach(t=>{const slot=firstOpenSlot(next,t);if(slot){const id=addTeam(next,t,'direct','oitavas-prioridade-federativa');next.slots[slot]=id}else overflow.push(t)});
  // Times que vieram das vagas especiais 35/36 só usam vaga federativa se ainda houver sobra.
  special.forEach(t=>{const slot=firstOpenSlot(next,t);if(slot){const id=addTeam(next,t,'direct','oitavas-vaga-especial-com-sobra');next.slots[slot]=id}else overflow.push(t)});
  // Sem vaga federativa: entram automaticamente nos dois espaços "Time aleatório" da Chance de Ouro.
  overflow.forEach(t=>placeChanceCarry(next,t));
  // Quem não chegou às oitavas volta para disputa na própria federação.
  (cup.teams||[]).filter(t=>!rset.has(String(t.id))).forEach(t=>addTeam(next,t,'dispute','eliminado-edicao-anterior'));
  delete next._now;delete next._seq;
  next.autoFromCup.directCount=Object.keys(next.slots).length;
  next.autoFromCup.disputeCount=next.teams.filter(t=>t.status==='dispute').length;
  next.autoFromCup.chanceCarryCount=(next.chance.autoCarry||[]).length;
  next.autoFromCup.waitlistCount=(next.chance.autoWaitlist||[]).length;
  return next;
}
function syncQualified140(next){
  const byId=id=>(next.teams||[]).find(t=>String(t.id)===String(id));const teams=[];
  for(let n=1;n<=36;n++){const ref=next.slots[n];if(!ref)continue;const t=byId(ref);if(!t)continue;let slot='';if(n===36)slot='Campeão';else slot=Object.entries(FED_SLOTS).find(([,a])=>a.includes(n))?.[0]||t.fed;teams.push({name:t.name,fed:t.fed||slot,slot,sourceSlot:n});}
  localStorage.setItem('copaOuroQualified',JSON.stringify({updatedAt:new Date().toISOString(),complete:teams.length===36,teams}));
}
function finishCup140(){
  const cup=readJSON('copaOuroV3',null);if(!cup||!Array.isArray(cup.teams)||cup.teams.length!==36)return alert('A Copa atual ainda não possui os 36 times.');
  const champId=championId140(cup);if(champId==null)return alert('Finalize a Final e defina o campeão antes de encerrar a Copa.');
  const r16=round16Ids(cup);if(r16.length!==16)return alert('Não foi possível identificar exatamente os 16 participantes das oitavas. Revise Playoffs e Oitavas.');
  let next;try{next=buildNextElimination140(cup,r16,champId)}catch(e){return alert('Não foi possível preparar as próximas Eliminatórias: '+e.message)}
  const champ=cup.teams.find(t=>String(t.id)===String(champId));const carry=(next.chance.autoCarry||[]).map(x=>x.name);
  const msg=`Finalizar a Copa de ${champ.name} e preparar a próxima Eliminatória?\n\n• Campeão: Vaga 36\n• Vagas 1–34: prioridade para classificados de origem federativa\n• Excedentes das vagas especiais: Chance de Ouro${carry.length?' ('+carry.join(', ')+')':''}`;
  if(!confirm(msg))return;
  const history=readJSON('copaOuroHistory',[]);history.push({endedAt:new Date().toISOString(),champion:champ.name,championFederation:fedOf(champ),championSourceSlot:sourceSlotOf(champ),teams:cup.teams.map(t=>({name:t.name,slot:t.slot,fed:fedOf(t),pot:t.pot||null,sourceSlot:sourceSlotOf(t)})),standings:cupTable(cup).map((x,i)=>({pos:i+1,name:x.name,fed:x.fed,pts:x.pts,sg:x.sg,gp:x.gp})),round16:r16.map(id=>cup.teams.find(t=>String(t.id)===String(id))?.name).filter(Boolean),knockout:cup.knockout,nextEliminatoriaPrepared:true,chanceCarry:carry});localStorage.setItem('copaOuroHistory',JSON.stringify(history));
  localStorage.setItem('elimCopaOuro',JSON.stringify(next));syncQualified140(next);localStorage.setItem('copaSequenceV140',JSON.stringify({createdAt:new Date().toISOString(),champion:champ.name,championSlot:36,directNames:next.teams.filter(t=>t.status==='direct').map(t=>t.name),disputeNames:next.teams.filter(t=>t.status==='dispute').map(t=>t.name),chanceCarry:carry,applied:true}));
  state={teams:[],matches:[],knockout:null};try{teamDraft=[];correctionMode=false}catch(e){}localStorage.removeItem('copaOuroTeamDraft');localStorage.setItem('copaOuroV3',JSON.stringify(state));localStorage.setItem('copaOuroGameRouletteV135',JSON.stringify({remaining:Array.from({length:18},(_,i)=>i+1),drawn:[]}));
  try{flashSaved('Nova Copa preparada');renderAll();showTab('times')}catch(e){console.warn(e)}
  alert(`Copa finalizada!\nCampeão ${champ.name}: Vaga 36.\n${next.autoFromCup.directCount} vagas diretas já preenchidas.\n${next.autoFromCup.disputeCount} times aguardam disputa.\n${carry.length} time(s) foi(ram) para a Chance de Ouro.`);
}
window.finishAndStartNewCup=finishCup140;

function enhanceElimination(){
  const cadastro=document.getElementById('cadastro');const cur=readJSON('elimCopaOuro',{});if(!cadastro||!cur.autoFromCup||document.getElementById('sequenceV140'))return;
  const c=(cur.chance&&cur.chance.autoCarry)||[];const box=document.createElement('div');box.id='sequenceV140';box.className='notice ok';box.style.marginBottom='12px';
  box.innerHTML='<b>🔁 Continuidade v1.4.0:</b> campeão anterior está na <b>Vaga 36</b>. As vagas 1–34 priorizam os classificados de origem federativa.'+(c.length?' <b>'+c.map(x=>esc(x.name)).join(', ')+'</b> '+(c.length===1?'foi enviado':'foram enviados')+' automaticamente para os espaços aleatórios da Chance de Ouro.':'');cadastro.insertBefore(box,cadastro.firstChild);
}

/* Clareza: senha da nuvem é separada da senha dos perfis. */
function clarifyCloudPassword(){
  if(!window.AndroidBridge)return;
  window.CopaCloudManualConnect=function(){const p=prompt('Senha do SERVIDOR da nuvem Copa Ouro.\n\nEsta senha é separada das senhas dos perfis Pedro/Maju.');if(p)AndroidBridge.cloudLogin(p)};
}
function install(){
  clarifyCloudPassword();
  if(path.includes('/copa/')){window.advanceStage=advanceStage140;window.renderKnockout=renderKnockout140;window.finishAndStartNewCup=finishCup140;try{renderAll()}catch(e){console.error('Render v1.4.0',e)}}
  if(path.includes('/eliminatorias/'))enhanceElimination();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
