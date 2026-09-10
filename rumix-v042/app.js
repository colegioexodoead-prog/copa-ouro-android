(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const COLORS=['red','blue','orange','black'];
let state=null, selected=new Set(), playKind='solo', mode='classic', sortMode='value';
let timerHandle=null, secondsLeft=0;

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function deep(v){return JSON.parse(JSON.stringify(v));}
function note(msg,type=''){const el=$('#gameNotice');el.textContent=msg;el.className='notice'+(type?' '+type:'');el.classList.remove('hide');}
function clearNote(){const el=$('#gameNotice');if(el)el.classList.add('hide');}
function log(msg){if(!state)return;state.log.unshift(msg);state.log=state.log.slice(0,30);}
function tilePoints(t){return t.kind==='num'?t.value:0;}
function makeDeck(){let id=1,out=[];for(let copy=0;copy<2;copy++)for(const color of COLORS)for(let value=1;value<=13;value++)out.push({id:'t'+(id++),kind:'num',value,color});out.push({id:'t'+(id++),kind:'joker',value:0,color:'joker'});out.push({id:'t'+(id++),kind:'joker',value:0,color:'joker'});return shuffle(out);}
function drawOne(p){if(!state.deck.length)return null;const t=state.deck.pop();p.hand.push(t);return t;}
function drawMany(p,n){for(let i=0;i<n;i++)if(!drawOne(p))break;}
function playerName(){return ($('#name').value.trim()||'Jogador').slice(0,18);}

function validateGroup(tiles){
  if(tiles.length<3)return false;
  const jokers=tiles.filter(t=>t.kind==='joker');
  const nums=tiles.filter(t=>t.kind==='num');
  if(!nums.length)return tiles.length>=3;
  const sameValue=nums.every(t=>t.value===nums[0].value) && new Set(nums.map(t=>t.color)).size===nums.length && nums.length+jokers.length<=4;
  if(sameValue)return true;
  if(!nums.every(t=>t.color===nums[0].color))return false;
  const vals=nums.map(t=>t.value).sort((a,b)=>a-b);
  if(new Set(vals).size!==vals.length)return false;
  let missing=0;for(let i=1;i<vals.length;i++)missing+=Math.max(0,vals[i]-vals[i-1]-1);
  if(missing>jokers.length)return false;
  const extra=jokers.length-missing;
  const roomBefore=vals[0]-1, roomAfter=13-vals[vals.length-1];
  return extra<=roomBefore+roomAfter;
}
function groupScore(tiles){return tiles.reduce((s,t)=>s+tilePoints(t),0);}
function allTableValid(){return state.table.every(validateGroup);}

function candidateCombos(hand){
  const out=[];
  for(let v=1;v<=13;v++){
    const same=hand.filter(t=>t.kind==='num'&&t.value===v);
    const unique=[];for(const c of COLORS){const t=same.find(x=>x.color===c);if(t)unique.push(t);}
    if(unique.length>=3){out.push(unique.slice(0,3));if(unique.length===4)out.push(unique.slice(0,4));}
  }
  for(const c of COLORS){
    const by=new Map();hand.filter(t=>t.kind==='num'&&t.color===c).forEach(t=>{if(!by.has(t.value))by.set(t.value,t);});
    const vals=[...by.keys()].sort((a,b)=>a-b);let run=[];
    for(const v of vals){if(!run.length||v===run[run.length-1]+1)run.push(v);else{pushRuns(run,by,out);run=[v];}}pushRuns(run,by,out);
  }
  const jokers=hand.filter(t=>t.kind==='joker');
  if(jokers.length){
    for(const c of COLORS){
      const nums=hand.filter(t=>t.kind==='num'&&t.color===c);
      for(const a of nums)for(const b of nums){if(a.id===b.id)continue;const pair=[a,b,...jokers.slice(0,1)];if(validateGroup(pair))out.push(pair);}
    }
  }
  const seen=new Set();return out.filter(g=>{const k=g.map(t=>t.id).sort().join(',');if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>groupScore(b)-groupScore(a)||b.length-a.length);
}
function pushRuns(vals,by,out){if(vals.length<3)return;for(let start=0;start<vals.length-2;start++)for(let end=start+2;end<vals.length;end++)out.push(vals.slice(start,end+1).map(v=>by.get(v)));}

function startGame(){
  playKind=$('#trainingKind').classList.contains('active')?'training':'solo';
  mode=$$('.mode-card').find(b=>b.classList.contains('active'))?.dataset.mode||'classic';
  const deck=makeDeck();const players=[{name:playerName(),cpu:false,hand:[],opened:false,combos:0,rewards:0}];
  if(playKind==='solo'){const n=Number($('#cpuCount').value)||2;for(let i=1;i<=n;i++)players.push({name:'CPU '+i,cpu:true,hand:[],opened:false,combos:0,rewards:0});}
  for(let r=0;r<14;r++)for(const p of players){const t=deck.pop();if(t)p.hand.push(t);}
  state={players,deck,table:[],turn:0,direction:1,log:[],editPool:[],currentHasPlayed:false,currentDrew:false,extraTurn:false,turnStart:null,winner:null};
  selected.clear();$('#home').classList.add('hide');$('#game').classList.remove('hide');
  $('#megaPanel').classList.toggle('hide',mode!=='mega');$('#newTrainingBtn').classList.toggle('hide',playKind!=='training');
  log('Partida iniciada. Cada jogador recebeu 14 peças.');
  beginTurn();render();
}
function beginTurn(){
  stopTimer();selected.clear();state.editPool=[];state.currentHasPlayed=false;state.currentDrew=false;state.extraTurn=false;state.turnStart=deep({players:state.players,deck:state.deck,table:state.table,turn:state.turn,direction:state.direction,log:state.log});
  const p=state.players[state.turn];log('Vez de '+p.name+'.');render();
  if(p.cpu)setTimeout(cpuAct,650);else startTimer();
}
function nextIndex(){const n=state.players.length;return (state.turn+state.direction+n)%n;}
function advanceTurn(){if(state.winner)return;if(state.extraTurn){log(state.players[state.turn].name+' ganhou uma jogada extra.');beginTurn();return;}state.turn=nextIndex();beginTurn();}
function winIfNeeded(p){if(p.hand.length===0&&state.editPool.length===0){state.winner=p.name;stopTimer();note('🏆 '+p.name+' venceu a partida!','success');log(p.name+' venceu!');render();return true;}return false;}

function userPlay(){
  if(!state||state.winner)return;const p=state.players[state.turn];if(p.cpu){note('Aguarde a jogada da CPU.');return;}
  const pool=[...p.hand,...state.editPool];const tiles=pool.filter(t=>selected.has(t.id));if(!tiles.length){note('Selecione pelo menos 3 peças.');return;}if(!validateGroup(tiles)){note('Essa seleção ainda não forma um grupo ou sequência válida.','error');return;}
  if(!p.opened&&playKind!=='training'&&groupScore(tiles)<30){note('A abertura precisa somar pelo menos 30 pontos.','error');return;}
  const ids=new Set(tiles.map(t=>t.id));p.hand=p.hand.filter(t=>!ids.has(t.id));state.editPool=state.editPool.filter(t=>!ids.has(t.id));state.table.push(tiles);p.opened=true;p.combos++;state.currentHasPlayed=true;selected.clear();
  if(mode==='mega'&&p.combos%3===0){p.rewards++;log(p.name+' desbloqueou uma recompensa MegaRumiX.');}
  log(p.name+' baixou '+tiles.length+' peças.');clearNote();render();winIfNeeded(p);
}
function userDraw(){
  if(!state||state.winner)return;const p=state.players[state.turn];if(p.cpu)return;if(state.currentHasPlayed||state.editPool.length){note('Restaure o início do turno antes de comprar, ou finalize a jogada.','error');return;}const t=drawOne(p);if(!t){note('O monte acabou.');return;}state.currentDrew=true;log(p.name+' comprou uma peça.');render();advanceTurn();
}
function userEnd(){
  if(!state||state.winner)return;const p=state.players[state.turn];if(p.cpu)return;if(state.editPool.length){note('Ainda existem peças retiradas da mesa. Recombine todas antes de finalizar.','error');return;}if(!allTableValid()){note('Existe combinação inválida na mesa.','error');return;}if(!state.currentHasPlayed){note('Baixe uma combinação ou compre uma peça.');return;}advanceTurn();
}
function editGroup(i){
  const p=state.players[state.turn];if(p.cpu||state.winner)return;if(!p.opened&&playKind!=='training'){note('Você só pode reorganizar a mesa depois de fazer sua abertura.');return;}const g=state.table[i];if(!g)return;state.table.splice(i,1);state.editPool.push(...g);state.currentHasPlayed=true;selected.clear();log(p.name+' retirou um grupo da mesa para reorganizar.');render();
}
function resetTurn(){
  if(!state||!state.turnStart||state.players[state.turn].cpu)return;const s=deep(state.turnStart);state.players=s.players;state.deck=s.deck;state.table=s.table;state.turn=s.turn;state.direction=s.direction;state.log=s.log;state.editPool=[];state.currentHasPlayed=false;state.currentDrew=false;selected.clear();log('Turno restaurado ao estado inicial.');clearNote();render();startTimer();
}

function cpuAct(){
  if(!state||state.winner)return;const p=state.players[state.turn];if(!p.cpu)return;const combos=candidateCombos(p.hand);let chosen=null;if(!p.opened)chosen=combos.find(g=>groupScore(g)>=30)||null;else chosen=combos[0]||null;
  if(chosen){const ids=new Set(chosen.map(t=>t.id));p.hand=p.hand.filter(t=>!ids.has(t.id));state.table.push(chosen);p.opened=true;p.combos++;if(mode==='mega'&&p.combos%3===0)p.rewards++;log(p.name+' baixou '+chosen.length+' peças.');if(winIfNeeded(p))return;}else{drawOne(p);log(p.name+' comprou uma peça.');}
  if(mode==='mega'&&p.rewards>0)cpuReward(p);render();setTimeout(advanceTurn,650);
}
function cpuReward(p){p.rewards--;const r=Math.floor(Math.random()*3);if(r===0){drawMany(state.players[0],2);log(p.name+' ativou MegaRumiX: você comprou 2 peças.');}else if(r===1){state.direction*=-1;log(p.name+' ativou MegaRumiX: sentido invertido.');}else{drawMany(p,1);log(p.name+' recebeu uma peça extra.');}}
function useReward(){
  const p=state.players[0];if(mode!=='mega'||!p.rewards||state.turn!==0)return;p.rewards--;const r=Math.floor(Math.random()*4);if(r===0){p.hand.push({id:'bonus'+Date.now(),kind:'joker',value:0,color:'joker'});note('⚡ MegaRumiX: você ganhou um Coringa!','success');log('MegaRumiX: Coringa bônus.');}else if(r===1){state.extraTurn=true;note('⚡ MegaRumiX: jogada extra!','success');log('MegaRumiX: jogada extra.');}else if(r===2&&state.players.length>1){const target=state.players.find(x=>x.cpu);drawMany(target,2);note('⚡ MegaRumiX: uma CPU comprou 2 peças!','success');log('MegaRumiX: adversário +2.');}else{state.direction*=-1;note('⚡ MegaRumiX: sentido da rodada invertido!','success');log('MegaRumiX: sentido invertido.');}render();}

function showHint(){const p=state.players[0];const c=candidateCombos(p.hand)[0];if(!c){note('💡 Nenhuma combinação simples disponível agora.');return;}note('💡 Tente: '+c.map(tileText).join(' · '),'success');}
function toggleHints(){const on=$('#hintBtn').classList.contains('hide');$('#hintBtn').classList.toggle('hide',!on);$('#toggleHintsBtn').textContent=on?'Ocultar dicas':'Mostrar dicas';localStorage.setItem('rumixOfflineHints',on?'on':'off');}
function newTrainingHand(){if(playKind!=='training')return;state.deck=makeDeck();state.players[0].hand=[];drawMany(state.players[0],14);state.players[0].opened=true;state.table=[];state.editPool=[];selected.clear();log('Nova mão de treino criada.');beginTurn();}

function sortHand(){const h=state.players[0].hand;const ci=c=>COLORS.indexOf(c);h.sort((a,b)=>{if(a.kind==='joker')return 1;if(b.kind==='joker')return -1;return sortMode==='color'?(ci(a.color)-ci(b.color)||a.value-b.value):(a.value-b.value||ci(a.color)-ci(b.color));});render();}
function toggleSelect(id){if(state.winner||state.players[state.turn].cpu)return;if(selected.has(id))selected.delete(id);else selected.add(id);render();}
function tileText(t){return t.kind==='joker'?'★':String(t.value);}
function tileHTML(t,clickable=true){return `<button class="tile ${t.color}${selected.has(t.id)?' selected':''}" ${clickable?`data-tile="${esc(t.id)}"`:''}>${tileText(t)}</button>`;}
function render(){
  if(!state)return;const cur=state.players[state.turn];$('#turnText').textContent=state.winner?'Partida encerrada':'Vez de '+cur.name;$('#gameMeta').textContent=(mode==='mega'?'MegaRumiX':'Clássico')+' · '+(playKind==='training'?'Treino':'Single Player')+' · abertura 30 pontos';$('#deckCount').textContent=state.deck.length;$('#directionTag').textContent=state.direction===1?'↻ Horário':'↺ Anti-horário';
  $('#gamePlayers').innerHTML=state.players.map((p,i)=>`<div class="player-card ${i===state.turn?'active':''}"><b>${esc(p.name)}</b><small>${p.hand.length} peças ${p.opened?'· abriu':'· não abriu'}</small></div>`).join('');
  $('#table').innerHTML=state.table.length?state.table.map((g,i)=>`<div class="table-group">${g.map(t=>tileHTML(t,false)).join('')}${!cur.cpu&&(cur.opened||playKind==='training')?`<button class="btn mini edit-group-btn" data-edit="${i}">Editar</button>`:''}</div>`).join(''):'<div class="minor-text">A mesa ainda está vazia.</div>';
  $('#rack').innerHTML=state.players[0].hand.map(t=>tileHTML(t,true)).join('');
  $('#editPoolWrap').classList.toggle('hide',!state.editPool.length);$('#editPoolTag').classList.toggle('hide',!state.editPool.length);$('#editPoolCount').textContent=state.editPool.length;$('#editPool').innerHTML=state.editPool.map(t=>tileHTML(t,true)).join('');$('#selectedCount').textContent=selected.size;
  $('#log').innerHTML=state.log.map(x=>`<div>${esc(x)}</div>`).join('');
  $$('#rack [data-tile],#editPool [data-tile]').forEach(b=>b.onclick=()=>toggleSelect(b.dataset.tile));$$('[data-edit]').forEach(b=>b.onclick=()=>editGroup(Number(b.dataset.edit)));
  const userTurn=state.turn===0&&!state.winner;$('#playBtn').disabled=!userTurn;$('#drawBtn').disabled=!userTurn;$('#endBtn').disabled=!userTurn;$('#resetTurnBtn').disabled=!userTurn;
  if(mode==='mega'){const p=state.players[0];$('#megaStatus').textContent=`Combinações: ${p.combos} · recompensas: ${p.rewards}`;$('#megaCardBtn').disabled=!(userTurn&&p.rewards>0);}
}
function startTimer(){stopTimer();if(!state||state.players[state.turn].cpu)return;const limit=Number($('#turnTime').value)||0;if(!limit){$('#timerText').textContent='--';return;}secondsLeft=limit;$('#timerText').textContent=secondsLeft+'s';timerHandle=setInterval(()=>{secondsLeft--;$('#timerText').textContent=Math.max(0,secondsLeft)+'s';if(secondsLeft<=0){stopTimer();note('Tempo encerrado. Uma peça foi comprada automaticamente.');if(!state.currentHasPlayed&&!state.editPool.length)userDraw();else resetTurn();}},1000);}
function stopTimer(){if(timerHandle){clearInterval(timerHandle);timerHandle=null;}}

function init(){
  $('#soloKind').onclick=()=>{playKind='solo';$('#soloKind').classList.add('active');$('#trainingKind').classList.remove('active');$('#cpuBox').classList.remove('hide');};
  $('#trainingKind').onclick=()=>{playKind='training';$('#trainingKind').classList.add('active');$('#soloKind').classList.remove('active');$('#cpuBox').classList.add('hide');};
  $$('.mode-card').forEach(b=>b.onclick=()=>{$$('.mode-card').forEach(x=>x.classList.remove('active'));b.classList.add('active');});
  $('#startBtn').onclick=startGame;$('#playBtn').onclick=userPlay;$('#drawBtn').onclick=userDraw;$('#endBtn').onclick=userEnd;$('#resetTurnBtn').onclick=resetTurn;$('#sortValueBtn').onclick=()=>{sortMode='value';sortHand();};$('#sortColorBtn').onclick=()=>{sortMode='color';sortHand();};$('#hintBtn').onclick=showHint;$('#toggleHintsBtn').onclick=toggleHints;$('#newTrainingBtn').onclick=newTrainingHand;$('#megaCardBtn').onclick=useReward;$('#homeBtn').onclick=()=>location.reload();
  const hints=localStorage.getItem('rumixOfflineHints')||'on';$('#hintsSetting').value=hints;$('#hintsSetting').onchange=e=>{localStorage.setItem('rumixOfflineHints',e.target.value);$('#hintBtn').classList.toggle('hide',e.target.value==='off');$('#toggleHintsBtn').textContent=e.target.value==='off'?'Mostrar dicas':'Ocultar dicas';};$('#hintBtn').classList.toggle('hide',hints==='off');$('#toggleHintsBtn').textContent=hints==='off'?'Mostrar dicas':'Ocultar dicas';
}
document.addEventListener('DOMContentLoaded',init);
})();
