(function(){
'use strict';
const VERSION='1.4.1';
const path=(location.pathname||'').toLowerCase();
function readJSON(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch(e){return fallback}}
function writeJSON(key,v){localStorage.setItem(key,JSON.stringify(v))}
function sourceSlotOf(t){const n=Number(t&&t.sourceSlot);if(n>=1&&n<=36)return n;const m=Number(t&&t.sourceCupSlot);if(m>=1&&m<=36)return m;const id=Number(t&&t.id);return id>=1&&id<=36?id:0}
function fedOf(t){return String((t&&(t.fed||t.slot))||'').trim()}
function championId(cup){
 const f=cup&&cup.knockout&&cup.knockout.final&&cup.knockout.final[0];
 if(!f||!Number.isInteger(f.hg)||!Number.isInteger(f.ag)||f.hg===f.ag)return null;
 return f.hg>f.ag?f.home:f.away;
}
function round16Set(cup){
 const r=cup&&cup.knockout&&cup.knockout.round16;
 if(!Array.isArray(r)||r.length!==8)return new Set();
 return new Set(r.flatMap(m=>[m.home,m.away]).map(String));
}
function normalized(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function sameName(a,b){return normalized(a)===normalized(b)}
function protectedCandidate(cup){
 const champ=championId(cup),r16=round16Set(cup);if(champ==null||r16.size!==16)return null;
 return (cup.teams||[]).find(t=>sourceSlotOf(t)===35&&r16.has(String(t.id))&&String(t.id)!==String(champ))||null;
}
function installCupProtection(){
 const base=window.finishAndStartNewCup;if(typeof base!=='function'||base.__v141)return;
 function finish141(){
   const cup=readJSON('copaOuroV3',null);const candidate=cup?protectedCandidate(cup):null;
   const before=readJSON('copaSequenceV140',null)?.createdAt||'';
   base();
   if(!candidate)return;
   const marker=readJSON('copaSequenceV140',null);const next=readJSON('elimCopaOuro',null);
   if(!marker||marker.createdAt===before||!next||!next.autoFromCup)return;
   next.chance=next.chance||{};next.chance.games=next.chance.games||{};
   next.chance.registration=next.chance.registration||{};next.chance.registrationFed=next.chance.registrationFed||{};
   let protectedId=null;
   for(const k of Object.keys(next.slots||{})){
     const ref=next.slots[k];const t=(next.teams||[]).find(x=>String(x.id)===String(ref));
     if(t&&sameName(t.name,candidate.name)&&Number(k)!==36){protectedId=t.id;delete next.slots[k];t.status='protected35';t.source='oitavas-vaga35-final-direta';t.eliminated=false;}
   }
   for(const key of Object.keys(next.chance.registration)){
     if(sameName(next.chance.registration[key],candidate.name)){delete next.chance.registration[key];delete next.chance.registrationFed[key];}
   }
   next.chance.autoCarry=(next.chance.autoCarry||[]).filter(x=>!sameName(x&&x.name,candidate.name));
   next.chance.autoWaitlist=(next.chance.autoWaitlist||[]).filter(x=>!sameName(x&&x.name,candidate.name));
   let team=(next.teams||[]).find(t=>sameName(t.name,candidate.name));
   if(!team){
     protectedId=Date.now()+735;team={id:protectedId,name:candidate.name,fed:fedOf(candidate),status:'protected35',eliminated:false,source:'oitavas-vaga35-final-direta',sourceCupSlot:35};next.teams.push(team);
   }else{protectedId=team.id;team.status='protected35';team.eliminated=false;team.sourceCupSlot=35;team.source='oitavas-vaga35-final-direta';}
   next.chance.protected35={teamId:protectedId,name:candidate.name,fed:fedOf(candidate),sourceCupSlot:35,earnedAt:new Date().toISOString(),reason:'Chegou às oitavas vindo da Vaga 35',active:true};
   delete next.chance.games.P;
   next.autoFromCup.version=141;next.autoFromCup.protected35Count=1;next.autoFromCup.directCount=Object.keys(next.slots||{}).length;next.autoFromCup.chanceCarryCount=(next.chance.autoCarry||[]).length;
   writeJSON('elimCopaOuro',next);
   const q=readJSON('copaOuroQualified',{});if(Array.isArray(q.teams)){q.teams=q.teams.filter(t=>!sameName(t&&t.name,candidate.name));q.complete=false;writeJSON('copaOuroQualified',q)}
   const hist=readJSON('copaOuroHistory',[]);if(hist.length){hist[hist.length-1].protectedChance35={name:candidate.name,fed:fedOf(candidate),rule:'final-direta-vaga-35'};writeJSON('copaOuroHistory',hist)}
   writeJSON('copaSequenceV141',{createdAt:new Date().toISOString(),championSlot:36,protected35:candidate.name,rule:'Vencedor Finalíssima x protegido da antiga Vaga 35',applied:true});
   alert(candidate.name+' veio da Vaga 35, chegou às oitavas e não foi campeão.\n\nEle foi reservado para a FINAL DIRETA — VAGA 35 da próxima Eliminatória.');
 }
 finish141.__v141=true;window.finishAndStartNewCup=finish141;
}
function installElimProtection(){
 if(typeof window.classifyChanceWinner!=='function'||typeof window.renderChance!=='function')return;
 const baseClassify=window.classifyChanceWinner;
 const baseRender=window.renderChance;
 const baseRefazer=window.refazerChanceResult;
 function prot(){return state&&state.chance&&state.chance.protected35}
 function validWinner(m){return m&&Number.isInteger(m.hg)&&Number.isInteger(m.ag)&&m.hg!==m.ag}
 function winRef(m){return m.hg>m.ag?m.home:m.away}
 function classify141(key){
   const p=prot();
   if(key==='Z'&&p&&p.active){
     const z=state.chance.games&&state.chance.games.Z;if(!validWinner(z))return alert('Informe o placar da Finalíssima sem empate.');
     state.chance.games.P={home:winRef(z),away:p.teamId,hg:null,ag:null};
     if(state.slots&&state.slots[35])delete state.slots[35];
     save();return;
   }
   if(key==='P'){
     const m=state.chance.games&&state.chance.games.P;if(!validWinner(m))return alert('Informe o placar da Final Direta sem empate.');
     state.slots[35]=winRef(m);if(p){p.active=false;p.completedAt=new Date().toISOString();p.winner=state.slots[35];}
     save();return;
   }
   return baseClassify(key);
 }
 function protectedCard(){
   const p=prot();if(!p)return '';
   const m=state.chance.games&&state.chance.games.P;const qualified=state.slots&&state.slots[35];
   const protectedName=typeof teamWithFedRef==='function'?teamWithFedRef(p.teamId,false):(p.name||'Time protegido');
   if(!m){
     return `<div class="chance-block" id="finalDireta35"><div class="chance-block-head gold"><h3>🛡️ FINAL DIRETA — VAGA 35</h3><span class="muted small">Regra de continuidade</span></div><div class="chance-game-card"><div class="notice ok"><b>${protectedName}</b> veio da Vaga 35, chegou às oitavas da Copa anterior e não foi campeão.</div><div class="chance-note">Ele não ocupa vaga federativa e não disputa o mini-torneio. Aguarda o vencedor da Finalíssima normal para decidir diretamente a Vaga 35.</div><div class="muted" style="margin-top:9px">Aguardando o vencedor da Finalíssima.</div></div></div>`;
   }
   const has=Number.isInteger(m.hg)&&Number.isInteger(m.ag);const ready=validWinner(m);
   return `<div class="chance-block" id="finalDireta35"><div class="chance-block-head gold"><h3>🛡️ FINAL DIRETA — VAGA 35</h3><span class="muted small">Vencedor da Finalíssima × protegido da Vaga 35</span></div><div class="chance-game-card"><div class="chance-game-top"><span class="chance-stage-tag">FINAL DIRETA 35</span><span class="chance-next-tag">${qualified?'Vaga 35 confirmada':ready?'Pronto para classificar':'Aguardando placar'}</span></div><div class="match"><div class="home">${teamWithFedRef(m.home,false)}</div><input type="number" min="0" value="${m.hg??''}" onchange="chanceScore('P','hg',this.value)"><b>x</b><input type="number" min="0" value="${m.ag??''}" onchange="chanceScore('P','ag',this.value)"><div class="away">${teamWithFedRef(m.away,false)}</div></div><div class="chance-actions"><button onclick="classifyChanceWinner('P')">Classificar para Vaga 35</button>${has?`<button class="secondary" onclick="refazerChanceResult('P')">↶ Refazer resultado</button>`:''}</div>${qualified?`<div class="notice ok" style="margin-top:8px">🟢 ${teamWithFedRef(qualified,false)} classificado para a Vaga 35</div>`:'<div class="chance-note">Somente o vencedor desta Final Direta ocupa a Vaga 35.</div>'}</div></div>`;
 }
 function render141(){
   baseRender();const p=prot();if(!p)return;
   const bracket=document.getElementById('chanceBracket');if(!bracket)return;
   const old=document.getElementById('finalDireta35');if(old)old.remove();
   bracket.insertAdjacentHTML('beforeend',protectedCard());
   const blocks=[...bracket.querySelectorAll('.chance-block')];
   for(const b of blocks){if(b.id==='finalDireta35')continue;const h=b.querySelector('h3');if(h&&/Finalíssima/i.test(h.textContent||'')){const note=b.querySelector('.chance-note');if(note)note.innerHTML='<b>Vencedor avança para a FINAL DIRETA — VAGA 35.</b>';}}
 }
 function refazer141(key){
   if(key==='P'){
     const m=state.chance.games&&state.chance.games.P;if(!m)return;
     if(!confirm('Refazer a Final Direta da Vaga 35? O placar e a classificação da Vaga 35 serão apagados.'))return;
     m.hg=null;m.ag=null;if(state.slots&&state.slots[35])delete state.slots[35];const p=prot();if(p){p.active=true;delete p.completedAt;delete p.winner;}save();return;
   }
   const before=state.chance&&state.chance.games&&state.chance.games[key]?JSON.stringify(state.chance.games[key]):'';
   const out=baseRefazer(key);
   const after=state.chance&&state.chance.games&&state.chance.games[key]?JSON.stringify(state.chance.games[key]):'';
   if(before!==after&&['A','B','C','D','E','F','S','Z'].includes(key)&&state.chance.games&&state.chance.games.P){
     delete state.chance.games.P;if(state.slots&&state.slots[35])delete state.slots[35];const p=prot();if(p){p.active=true;delete p.completedAt;delete p.winner;}save();
   }
   return out;
 }
 classify141.__v141=true;render141.__v141=true;
 window.classifyChanceWinner=classify141;window.renderChance=render141;window.refazerChanceResult=refazer141;
 try{renderAll()}catch(e){console.warn('Chance 35 v1.4.1',e)}
}
function install(){if(path.includes('/copa/'))installCupProtection();if(path.includes('/eliminatorias/'))installElimProtection();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();